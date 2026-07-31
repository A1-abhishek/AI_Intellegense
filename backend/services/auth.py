import os
import jwt
import logging
import bcrypt
from datetime import datetime, timedelta, timezone
from elasticsearch import NotFoundError

logger = logging.getLogger("docmind.auth")

SECRET_KEY = os.getenv("JWT_SECRET", "docmind-secret-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
USERS_INDEX = "docmind_users"


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception as e:
        logger.debug(f"Token decode failed: {e}")
        return None


def ensure_users_index(es_client):
    if not es_client.indices.exists(index=USERS_INDEX):
        es_client.indices.create(
            index=USERS_INDEX,
            body={
                "mappings": {
                    "properties": {
                        "username": {"type": "keyword"},
                        "email": {"type": "keyword"},
                        "full_name": {"type": "text"},
                        "password_hash": {"type": "keyword"},
                        "role": {"type": "keyword"},
                        "avatar_color": {"type": "keyword"},
                        "is_active": {"type": "boolean"},
                        "created_at": {"type": "date"},
                        "updated_at": {"type": "date"},
                    }
                }
            },
        )
        logger.info("Users index created")


def seed_admin(es_client):
    result = es_client.search(
        index=USERS_INDEX,
        body={"query": {"term": {"role": "admin"}}},
        size=1,
    )
    if result["hits"]["total"]["value"] == 0:
        admin = {
            "username": "admin",
            "email": "admin@docmind.ai",
            "full_name": "Administrator",
            "password_hash": get_password_hash("admin123"),
            "role": "admin",
            "avatar_color": "#6366f1",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        es_client.index(index=USERS_INDEX, body=admin)
        logger.info("Default admin user created (admin / admin123)")


def create_user(es_client, username: str, email: str, full_name: str,
                password: str, role: str = "viewer") -> dict:
    body = {
        "username": username,
        "email": email,
        "full_name": full_name,
        "password_hash": get_password_hash(password),
        "role": role,
        "avatar_color": _random_color(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = es_client.index(index=USERS_INDEX, body=body)
    return {"id": result["_id"], **{k: v for k, v in body.items() if k != "password_hash"}}


def authenticate_user(es_client, username: str, password: str) -> dict | None:
    result = es_client.search(
        index=USERS_INDEX,
        body={"query": {"term": {"username": username}}},
        size=1,
    )
    hits = result["hits"]["hits"]
    if not hits:
        return None

    hit = hits[0]
    user = hit["_source"]

    if not user.get("is_active"):
        return None

    if not verify_password(password, user["password_hash"]):
        return None

    return {"id": hit["_id"], **{k: v for k, v in user.items() if k != "password_hash"}}


def get_user(es_client, user_id: str) -> dict | None:
    try:
        result = es_client.get(index=USERS_INDEX, id=user_id)
        src = result["_source"]
        return {"id": result["_id"], **{k: v for k, v in src.items() if k != "password_hash"}}
    except NotFoundError:
        return None


def list_users(es_client) -> list[dict]:
    result = es_client.search(
        index=USERS_INDEX,
        body={"query": {"match_all": {}}, "sort": [{"created_at": {"order": "desc"}}]},
        size=100,
    )
    users = []
    for h in result["hits"]["hits"]:
        src = h["_source"]
        users.append({"id": h["_id"], **{k: v for k, v in src.items() if k != "password_hash"}})
    return users


def update_user(es_client, user_id: str, data: dict) -> dict | None:
    try:
        existing = es_client.get(index=USERS_INDEX, id=user_id)
    except NotFoundError:
        return None

    update_fields = {}
    for k, v in data.items():
        if v is not None and k != "password_hash":
            update_fields[k] = v

    if data.get("password"):
        update_fields["password_hash"] = get_password_hash(data["password"])

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    es_client.update(index=USERS_INDEX, id=user_id, body={"doc": update_fields})

    return get_user(es_client, user_id)


def delete_user(es_client, user_id: str) -> bool:
    try:
        es_client.delete(index=USERS_INDEX, id=user_id)
        return True
    except NotFoundError:
        return False


COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
          "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6"]


def _random_color():
    import random
    return random.choice(COLORS)
