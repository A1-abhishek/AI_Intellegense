import os
import time
import logging
import httpx
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from openai import OpenAI

load_dotenv()

logger = logging.getLogger("docmind.config")
llm_logger = logging.getLogger("docmind.llm")
es_logger = logging.getLogger("docmind.es")

ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
ELASTICSEARCH_API_KEY = os.getenv("ELASTICSEARCH_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
INDEX_NAME = "documents"

es_logger.info(f"Connecting to Elasticsearch at {ELASTICSEARCH_URL}")
es = Elasticsearch(
    ELASTICSEARCH_URL,
    api_key=ELASTICSEARCH_API_KEY if ELASTICSEARCH_API_KEY else None,
)

if GROQ_API_KEY:
    llm_logger.info(f"Groq client configured with model: {GROQ_MODEL}")
    llm_client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
        timeout=httpx.Timeout(60.0, connect=10.0),
        max_retries=0,
    )
else:
    llm_logger.warning("GROQ_API_KEY not set — AI features disabled")
    llm_client = None


def llm_chat(messages, model=None, max_tokens=2048, temperature=0.7, max_retries=3):
    """Production-safe LLM call with retry, backoff, SSL recovery."""
    if not llm_client:
        raise RuntimeError("LLM client not configured")
    model = model or GROQ_MODEL
    last_error = None
    input_chars = sum(len(m.get("content", "") or "") for m in messages)

    llm_logger.info(
        f"LLM request: model={model} messages={len(messages)} "
        f"input_chars={input_chars} max_tokens={max_tokens} temperature={temperature}"
    )
    start = time.perf_counter()

    for attempt in range(max_retries):
        try:
            response = llm_client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            content = response.choices[0].message.content
            elapsed_ms = (time.perf_counter() - start) * 1000
            llm_logger.info(
                f"LLM response: model={model} output_chars={len(content)} "
                f"duration_ms={elapsed_ms:.0f} attempts={attempt + 1}"
            )
            return content
        except httpx.ReadError as e:
            last_error = e
            wait = (2 ** attempt) + 1
            llm_logger.warning(f"SSL/Network error (attempt {attempt+1}/{max_retries}): {e}. Retrying in {wait}s...")
            time.sleep(wait)
            _refresh_llm_client()
        except Exception as e:
            status = getattr(e, "status_code", None)
            if status == 429:
                last_error = e
                retry_after = getattr(e, "response", None)
                wait = 10
                if retry_after is not None:
                    hdr = retry_after.headers.get("retry-after") if hasattr(retry_after, "headers") else None
                    if hdr:
                        try:
                            wait = int(float(hdr)) + 1
                        except (ValueError, TypeError):
                            wait = 10
                llm_logger.warning(f"Rate limited (attempt {attempt+1}/{max_retries}). Waiting {wait}s...")
                time.sleep(wait)
            else:
                last_error = e
                wait = (2 ** attempt) + 1
                llm_logger.warning(f"LLM error {status}: {e} (attempt {attempt+1}/{max_retries}). Retrying in {wait}s...")
                time.sleep(wait)
                _refresh_llm_client()

    elapsed_ms = (time.perf_counter() - start) * 1000
    llm_logger.error(f"LLM call failed after {max_retries} attempts ({elapsed_ms:.0f}ms): {last_error}")
    raise last_error


def _refresh_llm_client():
    """Create a fresh HTTP client to recover from SSL/connection errors."""
    global llm_client
    if not GROQ_API_KEY:
        return
    try:
        llm_client = OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
            timeout=httpx.Timeout(60.0, connect=10.0),
            max_retries=0,
        )
        llm_logger.info("Refreshed LLM client")
    except Exception as e:
        llm_logger.error(f"Failed to refresh LLM client: {e}")


MAPPINGS = {
    "mappings": {
        "properties": {
            "title": {"type": "text"},
            "content": {"type": "text"},
            "tags": {"type": "keyword"},
            "language": {"type": "keyword"},
            "created_at": {"type": "date"},
            "updated_at": {"type": "date"},
            "file_type": {"type": "keyword"},
            "content_type": {"type": "keyword"},
            "size": {"type": "long"},
            "ocr_text": {"type": "text"},
            "image_description": {"type": "text"},
            "image_width": {"type": "integer"},
            "image_height": {"type": "integer"},
            "image_format": {"type": "keyword"},
            "chunk_count": {"type": "integer"},
            "has_embeddings": {"type": "boolean"},
            "entities": {
                "type": "object",
                "properties": {
                    "persons": {"type": "keyword"},
                    "organizations": {"type": "keyword"},
                    "locations": {"type": "keyword"},
                    "phone_numbers": {"type": "keyword"},
                    "emails": {"type": "keyword"},
                    "dates": {"type": "keyword"},
                    "monetary_values": {"type": "keyword"},
                    "id_numbers": {"type": "keyword"},
                    "job_titles": {"type": "keyword"},
                    "websites": {"type": "keyword"},
                    "key_facts": {"type": "text"},
                    "summary": {"type": "text"},
                    "document_type": {"type": "keyword"},
                    "risk_flags": {"type": "text"},
                    "sentiment": {"type": "keyword"},
                    "urgency": {"type": "keyword"},
                },
            },
            "extracted_images": {
                "type": "nested",
                "properties": {
                    "filename": {"type": "keyword"},
                    "path": {"type": "keyword"},
                    "page": {"type": "integer"},
                    "width": {"type": "integer"},
                    "height": {"type": "integer"},
                    "size_bytes": {"type": "long"},
                    "format": {"type": "keyword"},
                },
            },
            "has_entities": {"type": "boolean"},
            "has_extracted_images": {"type": "boolean"},
        }
    }
}


def ensure_index():
    try:
        if es.indices.exists(index=INDEX_NAME):
            mapping = es.indices.get_mapping(index=INDEX_NAME)
            props = list(mapping.get(INDEX_NAME, {}).get("mappings", {}).get("properties", {}).keys())
            required = set(MAPPINGS["mappings"]["properties"].keys())
            if not required.issubset(set(props)):
                es_logger.warning(f"Index '{INDEX_NAME}' missing fields {required - set(props)}, recreating...")
                es.indices.delete(index=INDEX_NAME)
                es.indices.create(index=INDEX_NAME, body=MAPPINGS)
                es_logger.info(f"Index '{INDEX_NAME}' recreated with full mappings")
            else:
                es_logger.info(f"Index '{INDEX_NAME}' mappings OK")
        else:
            es.indices.create(index=INDEX_NAME, body=MAPPINGS)
            es_logger.info(f"Index '{INDEX_NAME}' created")
    except Exception as e:
        es_logger.error(f"ensure_index failed: {e}", exc_info=True)
