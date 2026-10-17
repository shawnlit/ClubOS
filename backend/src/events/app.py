import json
import logging
import os
import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

COLLEGE_ID = os.environ["COLLEGE_ID"]
EVENTS_TABLE = os.environ["EVENTS_TABLE"]
REGISTRATIONS_TABLE = os.environ["REGISTRATIONS_TABLE"]
CLUBS_TABLE = os.environ["CLUBS_TABLE"]
MEMBERSHIPS_TABLE = os.environ["MEMBERSHIPS_TABLE"]

dynamodb = boto3.resource("dynamodb")
events_table = dynamodb.Table(EVENTS_TABLE)
registrations_table = dynamodb.Table(REGISTRATIONS_TABLE)
clubs_table = dynamodb.Table(CLUBS_TABLE)
memberships_table = dynamodb.Table(MEMBERSHIPS_TABLE)
ddb_client = dynamodb.meta.client  # accepts plain Python values in transactions


# ---------- helpers ----------

def _json_default(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    raise TypeError(f"Not serializable: {type(value)}")


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=_json_default),
    }


def _claims(event):
    return event["requestContext"]["authorizer"]["jwt"]["claims"]


def _groups(event):
    raw = _claims(event).get("cognito:groups", "")
    if isinstance(raw, list):
        return raw
    return str(raw).strip("[]").replace(",", " ").split()


def _parse_body(event):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return None
    return body if isinstance(body, dict) else None


def _parse_datetime(value):
    if not isinstance(value, str):
        raise ValueError("must be an ISO 8601 string")
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        raise ValueError("must include a timezone, e.g. 2026-12-01T10:00:00Z")
    return parsed.astimezone(timezone.utc)


def _present(item):
    item = dict(item)
    if "capacity" in item and "registeredCount" in item:
        item["spotsLeft"] = int(item["capacity"]) - int(item["registeredCount"])
    return item


def _get_club(club_id):
    item = clubs_table.get_item(Key={"collegeId": COLLEGE_ID, "clubId": club_id}).get("Item")
    return item if item and item.get("status") == "active" else None


def _get_membership(club_id, user_id):
    return memberships_table.get_item(
        Key={"clubId": club_id, "userId": user_id}
    ).get("Item")


def _get_event(club_id, event_id):
    return events_table.get_item(
        Key={"clubId": club_id, "eventId": event_id}
    ).get("Item")


def _cancellation_codes(error):
    return [r.get("Code") for r in error.response.get("CancellationReasons", [])]


# ---------- handlers ----------

def create_event(event):
    club_id = event["pathParameters"]["clubId"]
    user_id = _claims(event)["sub"]

    if not _get_club(club_id):
        return _response(404, {"message": "Club not found"})

    membership = _get_membership(club_id, user_id)
    is_executive = (
        bool(membership)
        and membership.get("status") == "approved"
        and membership.get("role") == "executive"
    )
    if "college_admin" not in _groups(event) and not is_executive:
        return _response(
            403, {"message": "Only club executives or college admins can create events"}
        )

    body = _parse_body(event)
    if body is None:
        return _response(400, {"message": "Body must be a JSON object"})

    title = body.get("title")
    venue = body.get("venue")
    description = body.get("description", "")
    capacity = body.get("capacity")

    if not isinstance(title, str) or not title.strip() or len(title) > 100:
        return _response(400, {"message": "title is required (max 100 chars)"})
    if not isinstance(venue, str) or not venue.strip() or len(venue) > 200:
        return _response(400, {"message": "venue is required (max 200 chars)"})
    if not isinstance(description, str) or len(description) > 2000:
        return _response(400, {"message": "description must be a string (max 2000 chars)"})
    if isinstance(capacity, bool) or not isinstance(capacity, int) or not 1 <= capacity <= 10000:
        return _response(400, {"message": "capacity must be an integer between 1 and 10000"})

    try:
        starts_at = _parse_datetime(body.get("startsAt"))
        deadline = _parse_datetime(body.get("registrationDeadline"))
    except ValueError as exc:
        return _response(400, {"message": f"startsAt/registrationDeadline invalid: {exc}"})

    if deadline > starts_at:
        return _response(400, {"message": "registrationDeadline must not be after startsAt"})

    item = {
        "clubId": club_id,
        "eventId": str(uuid.uuid4()),
        "collegeId": COLLEGE_ID,
        "title": title.strip(),
        "description": description.strip(),
        "venue": venue.strip(),
        "startsAt": starts_at.isoformat(),
        "registrationDeadline": deadline.isoformat(),
        "capacity": capacity,
        "registeredCount": 0,
        "status": "published",
        "createdBy": user_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    events_table.put_item(Item=item, ConditionExpression="attribute_not_exists(eventId)")
    return _response(201, _present(item))


def list_events(event):
    club_id = event["pathParameters"]["clubId"]
    if not _get_club(club_id):
        return _response(404, {"message": "Club not found"})

    result = events_table.query(KeyConditionExpression=Key("clubId").eq(club_id))
    items = sorted(result.get("Items", []), key=lambda e: e["startsAt"])
    return _response(200, {"events": [_present(i) for i in items]})


def show_event(event):
    params = event["pathParameters"]
    item = _get_event(params["clubId"], params["eventId"])
    if not item:
        return _response(404, {"message": "Event not found"})
    return _response(200, _present(item))


def register(event):
    params = event["pathParameters"]
    club_id, event_id = params["clubId"], params["eventId"]
    claims = _claims(event)
    user_id = claims["sub"]

    ev = _get_event(club_id, event_id)
    if not ev:
        return _response(404, {"message": "Event not found"})

    membership = _get_membership(club_id, user_id)
    if not membership or membership.get("status") != "approved":
        return _response(403, {"message": "Approved club membership required"})

    if ev.get("status") != "published":
        return _response(409, {"message": "Event is not open for registration"})

    if datetime.now(timezone.utc) > datetime.fromisoformat(ev["registrationDeadline"]):
        return _response(409, {"message": "Registration deadline has passed"})

    registration = {
        "eventId": event_id,
        "userId": user_id,
        "clubId": club_id,
        "collegeId": COLLEGE_ID,
        "email": claims.get("email", ""),
        "status": "registered",
        "ticketId": secrets.token_urlsafe(18),
        "registeredAt": datetime.now(timezone.utc).isoformat(),
    }

    try:
        ddb_client.transact_write_items(
            TransactItems=[
                {
                    "Put": {
                        "TableName": REGISTRATIONS_TABLE,
                        "Item": registration,
                        "ConditionExpression": "attribute_not_exists(userId)",
                    }
                },
                {
                    "Update": {
                        "TableName": EVENTS_TABLE,
                        "Key": {"clubId": club_id, "eventId": event_id},
                        "UpdateExpression": "SET registeredCount = registeredCount + :one",
                        "ConditionExpression": "#s = :published AND registeredCount < #cap",
                        "ExpressionAttributeNames": {"#s": "status", "#cap": "capacity"},
                        "ExpressionAttributeValues": {":one": 1, ":published": "published"},
                    }
                },
            ]
        )
    except ClientError as error:
        if error.response["Error"]["Code"] != "TransactionCanceledException":
            raise
        codes = _cancellation_codes(error)
        if len(codes) > 0 and codes[0] == "ConditionalCheckFailed":
            return _response(409, {"message": "Already registered for this event"})
        if len(codes) > 1 and codes[1] == "ConditionalCheckFailed":
            return _response(409, {"message": "Event is full"})
        raise

    return _response(201, registration)


def cancel_registration(event):
    params = event["pathParameters"]
    club_id, event_id = params["clubId"], params["eventId"]
    user_id = _claims(event)["sub"]

    try:
        ddb_client.transact_write_items(
            TransactItems=[
                {
                    "Delete": {
                        "TableName": REGISTRATIONS_TABLE,
                        "Key": {"eventId": event_id, "userId": user_id},
                        "ConditionExpression": "attribute_exists(userId) AND #s = :registered",
                        "ExpressionAttributeNames": {"#s": "status"},
                        "ExpressionAttributeValues": {":registered": "registered"},
                    }
                },
                {
                    "Update": {
                        "TableName": EVENTS_TABLE,
                        "Key": {"clubId": club_id, "eventId": event_id},
                        "UpdateExpression": "SET registeredCount = registeredCount - :one",
                        "ConditionExpression": "registeredCount > :zero",
                        "ExpressionAttributeValues": {":one": 1, ":zero": 0},
                    }
                },
            ]
        )
    except ClientError as error:
        if error.response["Error"]["Code"] != "TransactionCanceledException":
            raise
        codes = _cancellation_codes(error)
        if len(codes) > 0 and codes[0] == "ConditionalCheckFailed":
            existing = registrations_table.get_item(
                Key={"eventId": event_id, "userId": user_id}
            ).get("Item")
            if existing and existing.get("status") == "checked_in":
                return _response(409, {"message": "Already checked in; cannot cancel"})
            return _response(404, {"message": "You are not registered for this event"})
        if len(codes) > 1 and codes[1] == "ConditionalCheckFailed":
            return _response(404, {"message": "Event not found"})
        raise

    return _response(200, {"message": "Registration cancelled"})


def my_registrations(event):
    user_id = _claims(event)["sub"]
    result = registrations_table.query(
        IndexName="UserRegistrationsIndex",
        KeyConditionExpression=Key("userId").eq(user_id),
    )
    return _response(200, {"registrations": result.get("Items", [])})


ROUTES = {
    "POST /clubs/{clubId}/events": create_event,
    "GET /clubs/{clubId}/events": list_events,
    "GET /clubs/{clubId}/events/{eventId}": show_event,
    "POST /clubs/{clubId}/events/{eventId}/register": register,
    "DELETE /clubs/{clubId}/events/{eventId}/register": cancel_registration,
    "GET /me/registrations": my_registrations,
}


def lambda_handler(event, context):
    handler = ROUTES.get(event["routeKey"])
    if handler is None:
        return _response(404, {"message": "Route not found"})
    try:
        return handler(event)
    except Exception:
        logger.exception("Unhandled error")
        return _response(500, {"message": "Internal server error"})
