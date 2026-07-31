import os
import time
import jwt
import logging
import bcrypt
import mysql.connector
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("docmind.auth")
db_logger = logging.getLogger("docmind.db")

SECRET_KEY = os.getenv("JWT_SECRET", "docmind-secret-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "docmind")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "docmind123")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "docmind")

USERS_TABLE = "users"


def _connect():
    db_logger.info(
        f"Connecting to MySQL {MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE} as '{MYSQL_USER}'"
    )
    start = time.perf_counter()
    try:
        conn = mysql.connector.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        db_logger.info(f"MySQL connection established in {elapsed_ms:.0f}ms")
        return conn
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000
        db_logger.error(f"MySQL connection FAILED ({elapsed_ms:.0f}ms): {e}")
        raise


def _sanitize_sql(sql: str) -> str:
    """Replace multi-line SQL with a single-line compact form for logging."""
    return " ".join(sql.split())


def _run_query(conn, sql, params=None, dictionary=False, sensitive=True):
    """Execute a query with logging. `sensitive` hides parameter values."""
    cur = conn.cursor(dictionary=dictionary)
    display_params = "[REDACTED]" if sensitive else (params if params is not None else "none")
    db_logger.debug(f"SQL: {_sanitize_sql(sql)} | params={display_params}")
    start = time.perf_counter()
    try:
        cur.execute(sql, params)
        elapsed_ms = (time.perf_counter() - start) * 1000
        db_logger.debug(f"SQL OK in {elapsed_ms:.0f}ms | rows={cur.rowcount if cur.rowcount >= 0 else 'n/a'}")
        return cur
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000
        db_logger.error(f"SQL FAILED in {elapsed_ms:.0f}ms: {_sanitize_sql(sql)} | {e}")
        raise


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


def ensure_users_table():
    conn = _connect()
    try:
        _run_query(
            conn,
            f"""CREATE TABLE IF NOT EXISTS `{USERS_TABLE}` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255),
                full_name VARCHAR(255),
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'viewer',
                avatar_color VARCHAR(20),
                is_active TINYINT(1) DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_role (role),
                INDEX idx_username (username)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",
        )
        conn.commit()
        logger.info("Users table ensured")
    finally:
        conn.close()


def seed_admin():
    conn = _connect()
    try:
        count_cur = _run_query(
            conn,
            f"SELECT COUNT(*) FROM `{USERS_TABLE}` WHERE role = %s",
            ("admin",),
            sensitive=False,
        )
        if count_cur.fetchone()[0] == 0:
            _run_query(
                conn,
                f"""INSERT INTO `{USERS_TABLE}`
                    (username, email, full_name, password_hash, role, avatar_color, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (
                    "admin",
                    "admin@docmind.ai",
                    "Administrator",
                    get_password_hash("admin123"),
                    "admin",
                    "#6366f1",
                    1,
                ),
            )
            conn.commit()
            logger.info("Default admin user created (admin / admin123)")
    finally:
        conn.close()


def username_exists(username: str) -> bool:
    conn = _connect()
    try:
        cur = _run_query(
            conn,
            f"SELECT id FROM `{USERS_TABLE}` WHERE username = %s",
            (username,),
            sensitive=False,
        )
        return cur.fetchone() is not None
    finally:
        conn.close()


def create_user(username: str, email: str, full_name: str,
                password: str, role: str = "viewer") -> dict:
    if username_exists(username):
        raise ValueError("Username already exists")

    conn = _connect()
    try:
        cur = _run_query(
            conn,
            f"""INSERT INTO `{USERS_TABLE}`
                (username, email, full_name, password_hash, role, avatar_color, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                username,
                email,
                full_name,
                get_password_hash(password),
                role,
                _random_color(),
                1,
            ),
        )
        conn.commit()
        user_id = cur.lastrowid
        db_logger.info(f"User created: id={user_id} username={username} role={role}")
        return get_user(str(user_id))
    finally:
        conn.close()


def authenticate_user(username: str, password: str) -> dict | None:
    conn = _connect()
    try:
        cur = _run_query(
            conn,
            f"SELECT * FROM `{USERS_TABLE}` WHERE username = %s AND is_active = 1",
            (username,),
            dictionary=True,
            sensitive=False,
        )
        user = cur.fetchone()
        if not user:
            logger.warning(f"Login failed: unknown or inactive user '{username}'")
            return None
        if not verify_password(password, user["password_hash"]):
            logger.warning(f"Login failed: wrong password for '{username}'")
            return None
        logger.info(f"Login OK: user '{username}' (role={user['role']})")
        return _strip_secret(user)
    finally:
        conn.close()


def get_user(user_id: str) -> dict | None:
    conn = _connect()
    try:
        cur = _run_query(
            conn,
            f"SELECT * FROM `{USERS_TABLE}` WHERE id = %s",
            (int(user_id),),
            dictionary=True,
            sensitive=False,
        )
        user = cur.fetchone()
        if not user:
            return None
        return _strip_secret(user)
    except (ValueError, mysql.connector.Error):
        return None
    finally:
        conn.close()


def list_users() -> list[dict]:
    conn = _connect()
    try:
        cur = _run_query(
            conn,
            f"SELECT * FROM `{USERS_TABLE}` ORDER BY created_at DESC",
            dictionary=True,
            sensitive=False,
        )
        return [_strip_secret(u) for u in cur.fetchall()]
    finally:
        conn.close()


def update_user(user_id: str, data: dict) -> dict | None:
    if get_user(user_id) is None:
        return None

    fields = []
    values = []
    for k, v in data.items():
        if v is None or k == "password":
            continue
        if k == "id":
            continue
        fields.append(f"`{k}` = %s")
        values.append(v)

    if data.get("password"):
        fields.append("`password_hash` = %s")
        values.append(get_password_hash(data["password"]))

    if not fields:
        return get_user(user_id)

    fields.append("`updated_at` = CURRENT_TIMESTAMP")
    values.append(int(user_id))
    sql = f"UPDATE `{USERS_TABLE}` SET {', '.join(fields)} WHERE id = %s"

    conn = _connect()
    try:
        _run_query(conn, sql, tuple(values), sensitive=False)
        conn.commit()
        return get_user(user_id)
    finally:
        conn.close()


def delete_user(user_id: str) -> bool:
    conn = _connect()
    try:
        cur = _run_query(
            conn,
            f"DELETE FROM `{USERS_TABLE}` WHERE id = %s",
            (int(user_id),),
        )
        conn.commit()
        deleted = cur.rowcount > 0
        db_logger.info(f"User deleted: id={user_id} success={deleted}")
        return deleted
    except (ValueError, mysql.connector.Error):
        return False
    finally:
        conn.close()


COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
          "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6"]


def _random_color():
    import random
    return random.choice(COLORS)


def _strip_secret(user: dict) -> dict:
    clean = dict(user)
    clean.pop("password_hash", None)
    clean["id"] = str(clean["id"])
    clean["is_active"] = bool(clean["is_active"])
    if clean.get("created_at"):
        clean["created_at"] = clean["created_at"].isoformat(sep=" ")
    if clean.get("updated_at"):
        clean["updated_at"] = clean["updated_at"].isoformat(sep=" ")
    return clean
