import logging
import os
import sys
from logging.handlers import RotatingFileHandler

# ── Directory layout ────────────────────────────────────────────
# logs/
#   app.log            — combined log of every module (INFO+)
#   error.log          — every ERROR/CRITICAL/WARNING from all modules
#   http.log           — every incoming HTTP request (method, path, status, ms)
#   auth.log           — login, users, JWT
#   db.log             — MySQL connections + queries
#   es.log             — Elasticsearch operations
#   llm.log            — Groq LLM calls (model, input, output, duration)
#   documents.log      — document text extraction / chunking
#   images.log         — image processing + OCR
#   entities.log       — entity extraction (LLM + regex)
#   faces.log          — face recognition pipeline
#   embeddings.log     — embedding model loads + encodes
#   vector_store.log   — ChromaDB operations
#   frontend.log       — logs pushed from the browser
#   config.log         — startup / configuration

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
CONSOLE_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
FILE_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

MAX_BYTES = 5 * 1024 * 1024  # 5 MB per log file
BACKUP_COUNT = 3


def _file_handler(filename: str, level: int = logging.DEBUG) -> RotatingFileHandler:
    handler = RotatingFileHandler(
        os.path.join(LOG_DIR, filename),
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(FILE_FORMAT, datefmt=DATE_FORMAT))
    return handler


def _console_handler(level: int = logging.INFO) -> logging.StreamHandler:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(CONSOLE_FORMAT, datefmt=DATE_FORMAT))
    return handler


# ── Per-module log file mapping ─────────────────────────────────
MODULE_LOG_FILES = {
    "docmind": "app.log",
    "docmind.http": "http.log",
    "docmind.auth": "auth.log",
    "docmind.db": "db.log",
    "docmind.es": "es.log",
    "docmind.llm": "llm.log",
    "docmind.doc_processor": "documents.log",
    "docmind.image_processor": "images.log",
    "docmind.entity_extractor": "entities.log",
    "docmind.face_recognition": "faces.log",
    "docmind.embeddings": "embeddings.log",
    "docmind.vector_store": "vector_store.log",
    "docmind.frontend": "frontend.log",
    "docmind.config": "config.log",
}

# Quiet noisy third-party loggers
for _noisy in [
    "urllib3", "httpx", "httpcore", "chromadb", "sentence_transformers",
    "transformers", "openai", "httpcore.http11", "PIL", "matplotlib",
    "mysql.connector", "insightface", "onnxruntime",
]:
    logging.getLogger(_noisy).setLevel(logging.WARNING)

# Root "docmind" logger → combined app.log + console + error.log
_logger = logging.getLogger("docmind")
_logger.setLevel(logging.DEBUG)
_logger.addHandler(_file_handler("app.log", logging.INFO))
_logger.addHandler(_console_handler())
_logger.addHandler(_file_handler("error.log", logging.WARNING))

# Attach per-module file handlers to each module logger
for _mod_name, _filename in MODULE_LOG_FILES.items():
    if _mod_name in ("docmind",):
        continue
    _mod = logging.getLogger(_mod_name)
    _mod.setLevel(logging.DEBUG)
    _mod.handlers.clear()
    _mod.addHandler(_file_handler(_filename))
    _mod.propagate = True  # also flows to app.log / error.log via root


# Public logger used across the backend
logger = logging.getLogger("docmind")

__all__ = ["logger", "LOG_DIR", "MODULE_LOG_FILES"]
