import json
import os
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
MEMBERS = dynamodb.Table(os.environ["MEMBERSHIPS_TABLE"])
CLUBS = dynamodb.Table(os.environ["CLUBS_TABLE"])
COLLEGE_ID = os.environ["COLLEGE_ID"]

STATUSES = {"pending", "approved", "rejected"}
ROLES = {"member", "executive"}


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _now():
    return datetime.now(timezone.utc).isoformat()


def _groups(claims):
    raw = claims.get("cognito:groups")
    if not raw:
        return []
    if isinstance(raw, list):
        return raw
    return [g for g in str(raw).strip("[]").replace(",", " ").split() if g]


def _is_admin(claims):
    return "college_admin" in _groups(claims)


def _club_exists(club_id):
    item = CLUBS.get_item(Key={"collegeId": COLLEGE_ID, "clubId": club_id}).get("Item")
    return bool(item and item.get("status") == "active")


def _is_executive(club_id, user_id):
    item = MEMBERS.get_item(Key={"clubId": club_id, "userId": user_id}).get("Item")
    return bool(item and item.get("role") == "executive" and item.get("status") == "approved")


def _can_manage(claims, club_id):
    return _is_admin(claims) or _is_executive(club_id, claims["sub"])


def _clean(item):
    return {
        "clubId": item["clubId"],
        "userId": item["userId"],
        "email": item.get("email", ""),
        "role": item["role"],
        "status": item["status"],
        "requestedAt": item["requestedAt"],
        "updatedAt": item["updatedAt"],
    }


def _query_all(**kwargs):
    items = []
    while True:
        result = MEMBERS.query(**kwargs)
        items.extend(result["Items"])
        last_key = result.get("LastEvaluatedKey")
        if not last_key:
            return items
        kwargs["ExclusiveStartKey"] = last_key


def join_club(club_id, claims):
    if not _club_exists(club_id):
        return _response(404, {"error": "Club not found"})

    now = _now()
    item = {
        "clubId": club_id,
        "userId": claims["sub"],
        "collegeId": COLLEGE_ID,
        "email": claims.get("email", ""),
        "role": "member",
        "status": "pending",
        "requestedAt": now,
        "updatedAt": now,
    }
    try:
        MEMBERS.put_item(Item=item, ConditionExpression="attribute_not_exists(userId)")
    except ClientError as err:
        if err.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return _response(409, {"error": "You already have a membership or request for this club"})
        return _response(500, {"error": "Could not create request"})
    return _response(201, _clean(item))


def list_members(club_id, claims, params):
    if not _club_exists(club_id):
        return _response(404, {"error": "Club not found"})
    if not _can_manage(claims, club_id):
        return _response(403, {"error": "Only club executives or college admins can view members"})

    kwargs = {"KeyConditionExpression": Key("clubId").eq(club_id)}
    status = params.get("status")
    if status:
        if status not in STATUSES:
            return _response(400, {"error": "status must be pending, approved or rejected"})
        kwargs["FilterExpression"] = Attr("status").eq(status)

    members = [_clean(i) for i in _query_all(**kwargs)]
    members.sort(key=lambda m: m["requestedAt"])
    return _response(200, {"members": members})


def update_member(event, club_id, target_id, claims):
    if not _club_exists(club_id):
        return _response(404, {"error": "Club not found"})
    if not _can_manage(claims, club_id):
        return _response(403, {"error": "Only club executives or college admins can update members"})

    try:
        data = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "Body must be valid JSON"})
    if not isinstance(data, dict):
        return _response(400, {"error": "Body must be a JSON object"})

    status = data.get("status")
    role = data.get("role")
    if status is None and role is None:
        return _response(400, {"error": "Provide status and/or role"})
    if status is not None and status not in {"approved", "rejected"}:
        return _response(400, {"error": "status must be approved or rejected"})
    if role is not None:
        if role not in ROLES:
            return _response(400, {"error": "role must be member or executive"})
        if not _is_admin(claims):
            return _response(403, {"error": "Only college admins can change roles"})

    sets = ["#u = :u"]
    names = {"#u": "updatedAt"}
    values = {":u": _now()}
    if status is not None:
        sets.append("#s = :s")
        names["#s"] = "status"
        values[":s"] = status
    if role is not None:
        sets.append("#r = :r")
        names["#r"] = "role"
        values[":r"] = role

    try:
        result = MEMBERS.update_item(
            Key={"clubId": club_id, "userId": target_id},
            UpdateExpression="SET " + ", ".join(sets),
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
            ConditionExpression="attribute_exists(userId)",
            ReturnValues="ALL_NEW",
        )
    except ClientError as err:
        if err.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return _response(404, {"error": "Membership not found"})
        return _response(500, {"error": "Could not update membership"})
    return _response(200, _clean(result["Attributes"]))


def my_memberships(claims):
    items = _query_all(
        IndexName="UserClubsIndex",
        KeyConditionExpression=Key("userId").eq(claims["sub"]),
    )
    memberships = [_clean(i) for i in items]
    memberships.sort(key=lambda m: m["requestedAt"])
    return _response(200, {"memberships": memberships})


def handler(event, context):
    claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
    route = event["routeKey"]
    path = event.get("pathParameters") or {}
    params = event.get("queryStringParameters") or {}

    if route == "POST /clubs/{clubId}/join":
        return join_club(path["clubId"], claims)
    if route == "GET /clubs/{clubId}/members":
        return list_members(path["clubId"], claims, params)
    if route == "PATCH /clubs/{clubId}/members/{userId}":
        return update_member(event, path["clubId"], path["userId"], claims)
    if route == "GET /me/memberships":
        return my_memberships(claims)
    return _response(404, {"error": "Not found"})
