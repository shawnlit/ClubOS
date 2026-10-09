import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

TABLE = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
COLLEGE_ID = os.environ["COLLEGE_ID"]


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _groups(claims):
    raw = claims.get("cognito:groups")
    if not raw:
        return []
    if isinstance(raw, list):
        return raw
    return [g for g in str(raw).strip("[]").replace(",", " ").split() if g]


def _clean(club):
    return {
        "clubId": club["clubId"],
        "name": club["name"],
        "description": club.get("description", ""),
        "category": club.get("category", ""),
        "status": club["status"],
        "createdAt": club["createdAt"],
    }


def create_club(event, claims):
    if "college_admin" not in _groups(claims):
        return _response(403, {"error": "Only college admins can create clubs"})

    try:
        data = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "Body must be valid JSON"})
    if not isinstance(data, dict):
        return _response(400, {"error": "Body must be a JSON object"})

    name = str(data.get("name", "")).strip()
    description = str(data.get("description", "")).strip()
    category = str(data.get("category", "")).strip()

    if not 1 <= len(name) <= 100:
        return _response(400, {"error": "name is required (max 100 chars)"})
    if len(description) > 500:
        return _response(400, {"error": "description max 500 chars"})
    if len(category) > 50:
        return _response(400, {"error": "category max 50 chars"})

    club = {
        "collegeId": COLLEGE_ID,
        "clubId": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "category": category,
        "status": "active",
        "createdBy": claims["sub"],
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    try:
        TABLE.put_item(
            Item=club,
            ConditionExpression="attribute_not_exists(clubId)",
        )
    except ClientError:
        return _response(500, {"error": "Could not create club"})
    return _response(201, _clean(club))


def list_clubs():
    items = []
    kwargs = {"KeyConditionExpression": Key("collegeId").eq(COLLEGE_ID)}
    while True:
        result = TABLE.query(**kwargs)
        items.extend(result["Items"])
        last_key = result.get("LastEvaluatedKey")
        if not last_key:
            break
        kwargs["ExclusiveStartKey"] = last_key
    clubs = [_clean(c) for c in items if c.get("status") == "active"]
    clubs.sort(key=lambda c: c["name"].lower())
    return _response(200, {"clubs": clubs})


def get_club(club_id):
    result = TABLE.get_item(Key={"collegeId": COLLEGE_ID, "clubId": club_id})
    club = result.get("Item")
    if not club or club.get("status") != "active":
        return _response(404, {"error": "Club not found"})
    return _response(200, _clean(club))


def handler(event, context):
    claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
    route = event["routeKey"]

    if route == "POST /clubs":
        return create_club(event, claims)
    if route == "GET /clubs":
        return list_clubs()
    if route == "GET /clubs/{clubId}":
        return get_club(event["pathParameters"]["clubId"])
    return _response(404, {"error": "Not found"})
