import json
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

EVENTS_TABLE = os.environ["EVENTS_TABLE"]
REGISTRATIONS_TABLE = os.environ["REGISTRATIONS_TABLE"]
MEMBERSHIPS_TABLE = os.environ["MEMBERSHIPS_TABLE"]

dynamodb = boto3.resource("dynamodb")
events_table = dynamodb.Table(EVENTS_TABLE)
registrations_table = dynamodb.Table(REGISTRATIONS_TABLE)
memberships_table = dynamodb.Table(MEMBERSHIPS_TABLE)


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


def _get_event(club_id, event_id):
    return events_table.get_item(
        Key={"clubId": club_id, "eventId": event_id}
    ).get("Item")


def _can_manage(event, club_id, user_id):
    if "college_admin" in _groups(event):
        return True
    membership = memberships_table.get_item(
        Key={"clubId": club_id, "userId": user_id}
    ).get("Item")
    return (
        bool(membership)
        and membership.get("status") == "approved"
        and membership.get("role") == "executive"
    )


# ---------- handlers ----------

def get_ticket(event):
    params = event["pathParameters"]
    club_id, event_id = params["clubId"], params["eventId"]
    user_id = _claims(event)["sub"]

    registration = registrations_table.get_item(
        Key={"eventId": event_id, "userId": user_id}
    ).get("Item")
    if not registration or registration.get("clubId") != club_id:
        return _response(404, {"message": "You are not registered for this event"})
    if not registration.get("ticketId"):
        return _response(404, {"message": "No ticket issued for this registration"})

    return _response(
        200,
        {
            "ticketId": registration["ticketId"],
            "eventId": event_id,
            "clubId": club_id,
            "status": registration.get("status"),
            "checkedInAt": registration.get("checkedInAt"),
        },
    )


def check_in(event):
    params = event["pathParameters"]
    club_id, event_id = params["clubId"], params["eventId"]
    user_id = _claims(event)["sub"]

    if not _get_event(club_id, event_id):
        return _response(404, {"message": "Event not found"})
    if not _can_manage(event, club_id, user_id):
        return _response(403, {"message": "Only club executives or college admins can check in"})

    body = _parse_body(event)
    if body is None:
        return _response(400, {"message": "Body must be a JSON object"})
    ticket_id = body.get("ticketId")
    if not isinstance(ticket_id, str) or not ticket_id.strip() or len(ticket_id) > 64:
        return _response(400, {"message": "ticketId is required"})

    result = registrations_table.query(
        IndexName="TicketIndex",
        KeyConditionExpression=Key("ticketId").eq(ticket_id.strip()),
        Limit=1,
    )
    items = result.get("Items", [])
    if not items or items[0].get("eventId") != event_id:
        return _response(404, {"message": "Ticket not found for this event"})
    registration = items[0]

    now = datetime.now(timezone.utc).isoformat()
    try:
        registrations_table.update_item(
            Key={"eventId": event_id, "userId": registration["userId"]},
            UpdateExpression="SET #s = :checked, checkedInAt = :now, checkedInBy = :by",
            ConditionExpression="#s = :registered",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":checked": "checked_in",
                ":registered": "registered",
                ":now": now,
                ":by": user_id,
            },
        )
    except ClientError as error:
        if error.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return _response(
                409,
                {"message": "Ticket already used", "checkedInAt": registration.get("checkedInAt")},
            )
        raise

    return _response(
        200,
        {
            "message": "Checked in",
            "userId": registration["userId"],
            "email": registration.get("email", ""),
            "checkedInAt": now,
        },
    )


def attendance(event):
    params = event["pathParameters"]
    club_id, event_id = params["clubId"], params["eventId"]
    user_id = _claims(event)["sub"]

    if not _get_event(club_id, event_id):
        return _response(404, {"message": "Event not found"})
    if not _can_manage(event, club_id, user_id):
        return _response(403, {"message": "Only club executives or college admins can view attendance"})

    result = registrations_table.query(KeyConditionExpression=Key("eventId").eq(event_id))
    items = sorted(result.get("Items", []), key=lambda r: r.get("registeredAt", ""))
    attendees = [
        {
            "userId": r["userId"],
            "email": r.get("email", ""),
            "status": r.get("status"),
            "registeredAt": r.get("registeredAt"),
            "checkedInAt": r.get("checkedInAt"),
        }
        for r in items
    ]
    checked_in = sum(1 for a in attendees if a["status"] == "checked_in")
    return _response(
        200,
        {
            "eventId": event_id,
            "total": len(attendees),
            "checkedIn": checked_in,
            "attendees": attendees,
        },
    )


ROUTES = {
    "GET /clubs/{clubId}/events/{eventId}/ticket": get_ticket,
    "POST /clubs/{clubId}/events/{eventId}/checkin": check_in,
    "GET /clubs/{clubId}/events/{eventId}/attendance": attendance,
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
