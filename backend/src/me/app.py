import json


def _parse_groups(raw):
    if not raw:
        return []
    if isinstance(raw, list):
        return raw
    return [g for g in str(raw).strip("[]").replace(",", " ").split() if g]


def handler(event, context):
    claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
    body = {
        "userId": claims.get("sub"),
        "email": claims.get("email"),
        "groups": _parse_groups(claims.get("cognito:groups")),
    }
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
