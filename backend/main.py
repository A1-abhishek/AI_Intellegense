import logging
import time
import traceback
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Request, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from elasticsearch import NotFoundError

from logging_config import logger
from config import es, llm_client, ensure_index, INDEX_NAME, GROQ_MODEL, llm_chat
from models import (
    DocumentCreate, DocumentUpdate, SearchQuery, VectorSearchRequest,
    SummarizeRequest, QuestionRequest, TranslateRequest,
    ChatRequest, ChatMessage, EmbedRequest, BatchEmbedRequest,
    LoginRequest, UserCreateRequest, UserUpdateRequest,
    FaceSearchRequest,
)
from services.document_processor import extract_text_from_bytes, chunk_text
from services.image_processor import (
    detect_file_type, get_image_metadata, ocr_image,
)
from services.entity_extractor import extract_entities_with_llm, extract_entities_regex
from services.doc_image_extractor import (
    extract_images_from_doc, get_extracted_images, delete_extracted_images, IMAGES_DIR,
)
from services.embeddings import (
    embed_text, embed_texts,
    embed_image_bytes, embed_text_clip, embed_text_clip_single,
)
from services.vector_store import (
    add_chunks, add_image_embedding, search_chunks, search_images,
    delete_doc_chunks, get_collection_stats, ensure_image_collection_dimension,
    add_face_embeddings, search_faces, delete_face_embeddings,
    ensure_face_collection_dimension, get_face_collection_stats,
)
from services.auth import (
    ensure_users_table, seed_admin, create_token, decode_token,
    authenticate_user, create_user, get_user, list_users, update_user, delete_user,
    username_exists,
)
from services.face_recognition import detect_faces, get_face_embedding

app = FastAPI(title="DocMind API", version="2.0.0")

http_logger = logging.getLogger("docmind.http")
frontend_logger = logging.getLogger("docmind.frontend")
es_logger = logging.getLogger("docmind.es")


def _es_log(action: str, detail: str = "", **extra):
    extra_str = " " + " ".join(f"{k}={v}" for k, v in extra.items()) if extra else ""
    es_logger.info(f"{action} {detail}{extra_str}")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    client_ip = request.client.host if request.client else "?"
    try:
        response = await call_next(request)
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000
        http_logger.error(
            f"{request.method} {request.url.path} -> 500 ({elapsed_ms:.0f}ms) [{client_ip}] : {e}"
        )
        raise
    elapsed_ms = (time.perf_counter() - start) * 1000
    http_logger.info(
        f"{request.method} {request.url.path} -> {response.status_code} ({elapsed_ms:.0f}ms) [{client_ip}]"
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/logs")
async def ingest_frontend_log(payload: dict = Body(...)):
    """Receive log lines from the browser and persist them to logs/frontend.log."""
    level = (payload.get("level") or "info").lower()
    message = str(payload.get("message") or "")[:2000]
    category = str(payload.get("category") or "app")[:100]
    url = str(payload.get("url") or "")[:500]
    ts = str(payload.get("ts") or datetime.now(timezone.utc).isoformat())

    log_method = {
        "debug": frontend_logger.debug,
        "info": frontend_logger.info,
        "warn": frontend_logger.warning,
        "warning": frontend_logger.warning,
        "error": frontend_logger.error,
        "critical": frontend_logger.critical,
    }.get(level, frontend_logger.info)

    log_method(f"[{category}] {message} (url={url}, client_ts={ts})")
    return {"ok": True}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, detail=str(exc))


@app.on_event("startup")
def startup():
    logger.info("Starting DocMind API...")
    ensure_index()
    ensure_users_table()
    seed_admin()
    try:
        ensure_image_collection_dimension(512)
    except Exception as e:
        logger.warning(f"Image collection dimension check failed: {e}")
    try:
        ensure_face_collection_dimension(512)
    except Exception as e:
        logger.warning(f"Face collection dimension check failed: {e}")
    logger.info("DocMind API ready")


def get_current_user(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(auth[7:])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user(payload.get("user_id", ""))
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@app.get("/api/health")
def health():
    return {"status": "ok", "elasticsearch": es.ping(), "llm": llm_client is not None}


@app.get("/api/stats")
def stats():
    try:
        es_count = es.count(index=INDEX_NAME)["count"]
    except Exception as e:
        logger.error(f"ES count failed: {e}")
        es_count = 0
    vector_stats = get_collection_stats()
    return {"elasticsearch_docs": es_count, "vector_store": vector_stats}


# ── Auth & Users ─────────────────────────────────────────────────


@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = authenticate_user(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"user_id": user["id"], "role": user["role"]})
    logger.info(f"Login: {user['username']} ({user['role']})")
    return {"token": token, "user": user}


@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}


@app.get("/api/users")
def get_users(user: dict = Depends(require_admin)):
    return {"users": list_users()}


@app.post("/api/users")
def create_new_user(req: UserCreateRequest, user: dict = Depends(require_admin)):
    if username_exists(req.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    new_user = create_user(req.username, req.email, req.full_name, req.password, req.role)
    logger.info(f"User created: {req.username} ({req.role}) by {user['username']}")
    return {"user": new_user}


@app.put("/api/users/{user_id}")
def update_existing_user(user_id: str, req: UserUpdateRequest, current: dict = Depends(require_admin)):
    updated = update_user(user_id, req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    logger.info(f"User updated: {user_id} by {current['username']}")
    return {"user": updated}


@app.delete("/api/users/{user_id}")
def delete_existing_user(user_id: str, current: dict = Depends(require_admin)):
    target = get_user(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["role"] == "admin":
        admin_count = sum(1 for u in list_users() if u["role"] == "admin")
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin")
    delete_user(user_id)
    logger.info(f"User deleted: {user_id} by {current['username']}")
    return {"deleted": True}


# ── Document CRUD ────────────────────────────────────────────────


@app.post("/api/documents")
def create_document(doc: DocumentCreate):
    logger.info(f"Creating document: {doc.title}")
    body = {
        "title": doc.title,
        "content": doc.content,
        "tags": doc.tags,
        "language": doc.language,
        "file_type": doc.file_type,
        "content_type": doc.content_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "size": len(doc.content),
        "chunk_count": 0,
        "has_embeddings": False,
    }
    result = es.index(index=INDEX_NAME, body=body)
    _es_log("index", f"document '{doc.title}'", doc_id=result["_id"], content_type=doc.content_type)
    logger.info(f"Document created: {result['_id']}")
    return {"id": result["_id"], **body}


@app.get("/api/documents")
def list_documents(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    tag: str = Query(None),
    content_type: str = Query(None),
):
    start = (page - 1) * size
    must = []
    if tag:
        must.append({"term": {"tags": tag}})
    if content_type:
        must.append({"term": {"content_type": content_type}})

    query = {"bool": {"must": must}} if must else {"match_all": {}}

    result = es.search(
        index=INDEX_NAME,
        body={"query": query, "sort": [{"created_at": {"order": "desc"}}]},
        from_=start,
        size=size,
    )
    _es_log("search", "list documents", total=result["hits"]["total"]["value"], page=page, size=size)
    hits = [{"id": h["_id"], **h["_source"]} for h in result["hits"]["hits"]]
    return {
        "documents": hits,
        "total": result["hits"]["total"]["value"],
        "page": page,
        "size": size,
    }


@app.get("/api/documents/{doc_id}")
def get_document(doc_id: str):
    try:
        result = es.get(index=INDEX_NAME, id=doc_id)
        _es_log("get", "document", doc_id=doc_id)
        return {"id": result["_id"], **result["_source"]}
    except NotFoundError:
        _es_log("get", "document NOT FOUND", doc_id=doc_id)
        raise HTTPException(status_code=404, detail="Document not found")


@app.put("/api/documents/{doc_id}")
def update_document(doc_id: str, doc: DocumentUpdate):
    try:
        es.get(index=INDEX_NAME, id=doc_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")

    update_fields = {k: v for k, v in doc.model_dump().items() if v is not None}
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    es.update(index=INDEX_NAME, id=doc_id, body={"doc": update_fields})
    return {"id": doc_id, **update_fields}


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    try:
        es.delete(index=INDEX_NAME, id=doc_id)
        delete_doc_chunks(doc_id)
        _es_log("delete", "document", doc_id=doc_id)
        logger.info(f"Document deleted: {doc_id}")
        return {"deleted": True}
    except NotFoundError:
        _es_log("delete", "document NOT FOUND", doc_id=doc_id)
        raise HTTPException(status_code=404, detail="Document not found")


@app.post("/api/documents/upload")
async def upload_file(file: UploadFile = File(...), embed: bool = Query(True)):
    filename = file.filename or "untitled"
    logger.info(f"Upload: {filename} (embed={embed})")

    try:
        content_bytes = await file.read()
        logger.info(f"Read {len(content_bytes)} bytes from {filename}")
    except Exception as e:
        logger.error(f"Failed to read file: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    file_type = detect_file_type(content_bytes, filename)
    logger.info(f"Detected file type: {file_type} for {filename}")

    if file_type == "image":
        return await _handle_image_upload(content_bytes, filename, embed)
    else:
        return await _handle_doc_upload(content_bytes, filename, file.content_type or "text/plain", embed)


async def _handle_image_upload(data: bytes, filename: str, do_embed: bool):
    logger.info(f"Processing image: {filename}")
    ocr_text = ""
    description = ""
    img_meta = {}

    try:
        img_meta = get_image_metadata(data, filename)
        logger.info(f"Image metadata: {img_meta}")
    except Exception as e:
        logger.warning(f"Image metadata failed: {e}")

    try:
        ocr_text = ocr_image(data)
        logger.info(f"OCR text length: {len(ocr_text)}")
    except Exception as e:
        logger.warning(f"OCR failed: {e}")

    from services.image_processor import _build_heuristic_description
    description = _build_heuristic_description(data, filename, img_meta, ocr_text)
    logger.info(f"Image description: {len(description)} chars")

    combined_text = f"{filename}\n{description}\n{ocr_text}".strip()
    if not combined_text:
        combined_text = f"[Image: {filename}]"

    body = {
        "title": filename,
        "content": combined_text,
        "tags": [],
        "language": "en",
        "file_type": filename.rsplit(".", 1)[-1] if "." in filename else "image",
        "content_type": "image",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "size": len(data),
        "ocr_text": ocr_text,
        "image_description": description,
        "image_width": img_meta.get("width"),
        "image_height": img_meta.get("height"),
        "image_format": img_meta.get("format"),
        "chunk_count": 0,
        "has_embeddings": False,
    }
    result = es.index(index=INDEX_NAME, body=body)
    doc_id = result["_id"]
    logger.info(f"Image document indexed: {doc_id}")

    try:
        save_dir = IMAGES_DIR / doc_id
        save_dir.mkdir(parents=True, exist_ok=True)
        save_path = save_dir / filename
        save_path.write_bytes(data)
        logger.info(f"Image saved to disk: {save_path}")
    except Exception as e:
        logger.warning(f"Failed to save image to disk: {e}")

    if do_embed:
        try:
            embedding = embed_image_bytes(data)
            add_image_embedding(
                doc_id=doc_id, filename=filename, embedding=embedding,
                description=description, ocr_text=ocr_text, metadata=img_meta,
            )
            es.update(index=INDEX_NAME, id=doc_id, body={"doc": {"has_embeddings": True}})
            body["has_embeddings"] = True
            logger.info(f"CLIP image embeddings stored: {doc_id}")
        except Exception as e:
            logger.error(f"Image embedding failed: {e}", exc_info=True)

    try:
        faces = detect_faces(data)
        if faces:
            add_face_embeddings(doc_id, faces)
            face_info = [{"face_id": f["face_id"], "bbox": f["bbox"],
                          "confidence": f["confidence"], "age": f["age"],
                          "gender": f["gender"]} for f in faces]
            es.update(index=INDEX_NAME, id=doc_id, body={"doc": {
                "has_faces": True, "face_count": len(faces),
                "face_details": face_info,
            }})
            body["has_faces"] = True
            body["face_count"] = len(faces)
            body["face_details"] = face_info
            logger.info(f"FRS: {len(faces)} face(s) detected and stored for {doc_id}")
    except Exception as e:
        logger.error(f"Face detection failed (non-fatal): {e}", exc_info=True)

    return {"id": doc_id, **body}


async def _handle_doc_upload(data: bytes, filename: str, content_type: str, do_embed: bool):
    logger.info(f"Processing document: {filename}")

    try:
        text = extract_text_from_bytes(data, filename)
        logger.info(f"Extracted {len(text)} chars from {filename}")
    except Exception as e:
        logger.error(f"Text extraction failed for {filename}: {e}", exc_info=True)
        text = f"[Could not extract text: {e}]"

    body = {
        "title": filename,
        "content": text,
        "tags": [],
        "language": "en",
        "file_type": filename.rsplit(".", 1)[-1] if "." in filename else "text",
        "content_type": "document",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "size": len(text),
        "chunk_count": 0,
        "has_embeddings": False,
    }
    result = es.index(index=INDEX_NAME, body=body)
    doc_id = result["_id"]
    logger.info(f"Document indexed: {doc_id}")

    if do_embed and text.strip() and not text.startswith("[Could not"):
        try:
            logger.info(f"Chunking document {doc_id}...")
            chunks = chunk_text(text)
            logger.info(f"Created {len(chunks)} chunks for {doc_id}")

            if chunks:
                chunk_texts = [c["text"] for c in chunks]
                logger.info(f"Embedding {len(chunk_texts)} chunks...")
                embeddings = embed_texts(chunk_texts)
                logger.info(f"Generated {len(embeddings)} embeddings")

                add_chunks(doc_id, chunks, embeddings)
                logger.info(f"Chunks stored in ChromaDB for {doc_id}")

                es.update(
                    index=INDEX_NAME, id=doc_id,
                    body={"doc": {"chunk_count": len(chunks), "has_embeddings": True}},
                )
                body["chunk_count"] = len(chunks)
                body["has_embeddings"] = True
        except Exception as e:
            logger.error(f"Embedding failed for {doc_id}: {e}", exc_info=True)

    return {"id": doc_id, **body}


# ── Search ───────────────────────────────────────────────────────


@app.post("/api/search")
def search_documents(sq: SearchQuery):
    logger.info(f"Text search: '{sq.query}'")
    query = {
        "bool": {
            "must": [
                {"multi_match": {"query": sq.query, "fields": ["title^3", "content", "tags^2", "ocr_text", "image_description"]}}
            ]
        }
    }
    if sq.tags:
        query["bool"]["filter"] = [{"terms": {"tags": sq.tags}}]

    result = es.search(index=INDEX_NAME, body={"query": query}, size=sq.size)
    _es_log("search", "text search", query=sq.query[:80], total=result["hits"]["total"]["value"], size=sq.size)
    return {
        "results": [{"id": h["_id"], **h["_source"]} for h in result["hits"]["hits"]],
        "total": result["hits"]["total"]["value"],
    }


@app.post("/api/search/vector")
def vector_search(req: VectorSearchRequest):
    logger.info(f"Vector search: '{req.query}' type={req.search_type}")

    results = []

    if req.search_type in ("all", "chunks"):
        try:
            query_emb = embed_text(req.query)
            chunk_hits = search_chunks(query_emb, n_results=req.n_results, doc_ids=req.doc_ids or None)
            for h in chunk_hits:
                results.append({**h, "result_type": "chunk"})
        except Exception as e:
            logger.error(f"Chunk search failed: {e}", exc_info=True)

    if req.search_type in ("all", "images"):
        try:
            clip_query_emb = embed_text_clip_single(req.query)
            img_hits = search_images(clip_query_emb, n_results=req.n_results)
            for h in img_hits:
                results.append({**h, "result_type": "image"})
        except Exception as e:
            logger.error(f"Image search failed: {e}", exc_info=True)

    results.sort(key=lambda x: x.get("distance", 999))
    return {"results": results[:req.n_results], "total": len(results)}


@app.get("/api/tags")
def list_tags():
    try:
        result = es.search(
            index=INDEX_NAME,
            body={"aggs": {"tags_agg": {"terms": {"field": "tags", "size": 100}}}},
            size=0,
        )
        return [b["key"] for b in result["aggregations"]["tags_agg"]["buckets"]]
    except Exception as e:
        logger.error(f"list_tags failed: {e}")
        return []


# ── Embedding ────────────────────────────────────────────────────


@app.post("/api/embed/{doc_id}")
def embed_document(doc_id: str):
    logger.info(f"Embedding document: {doc_id}")
    try:
        doc = es.get(index=INDEX_NAME, id=doc_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")

    src = doc["_source"]
    delete_doc_chunks(doc_id)

    if src.get("content_type") == "image":
        text = src.get("content", src.get("title", ""))
        try:
            embedding = embed_text_clip_single(text)
            add_image_embedding(
                doc_id=doc_id, filename=src["title"], embedding=embedding,
                description=src.get("image_description", ""),
                ocr_text=src.get("ocr_text", ""),
            )
            es.update(index=INDEX_NAME, id=doc_id, body={"doc": {"has_embeddings": True}})
            logger.info(f"Image embedded with CLIP: {doc_id}")
            return {"doc_id": doc_id, "type": "image", "embedded": True}
        except Exception as e:
            logger.error(f"Image embedding failed: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

    content = src.get("content", "")
    if not content.strip():
        return {"doc_id": doc_id, "type": "document", "embedded": False, "reason": "empty content"}

    try:
        chunks = chunk_text(content)
        logger.info(f"Created {len(chunks)} chunks for {doc_id}")
        if not chunks:
            return {"doc_id": doc_id, "type": "document", "embedded": False, "reason": "no chunks"}

        embeddings = embed_texts([c["text"] for c in chunks])
        add_chunks(doc_id, chunks, embeddings)
        es.update(
            index=INDEX_NAME, id=doc_id,
            body={"doc": {"chunk_count": len(chunks), "has_embeddings": True}},
        )
        logger.info(f"Document embedded: {doc_id} ({len(chunks)} chunks)")
        return {"doc_id": doc_id, "type": "document", "chunks": len(chunks), "embedded": True}
    except Exception as e:
        logger.error(f"Document embedding failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")


@app.post("/api/embed/batch")
def batch_embed(req: BatchEmbedRequest):
    logger.info(f"Batch embed: {len(req.doc_ids)} docs, reembed={req.reembed}")
    if req.doc_ids:
        ids = req.doc_ids
    else:
        result = es.search(index=INDEX_NAME, body={"query": {"match_all": {}}}, size=500)
        ids = [h["_id"] for h in result["hits"]["hits"]]

    embedded = 0
    skipped = 0
    errors = 0
    for did in ids:
        try:
            doc = es.get(index=INDEX_NAME, id=did)
            src = doc["_source"]
            if not req.reembed and src.get("has_embeddings"):
                skipped += 1
                continue
            if src.get("content_type") == "image":
                text = src.get("content", src.get("title", ""))
                emb = embed_text_clip_single(text)
                add_image_embedding(did, src["title"], emb,
                                    src.get("image_description", ""),
                                    src.get("ocr_text", ""))
                es.update(index=INDEX_NAME, id=did, body={"doc": {"has_embeddings": True}})
            else:
                content = src.get("content", "")
                if not content.strip():
                    skipped += 1
                    continue
                chunks = chunk_text(content)
                if chunks:
                    embs = embed_texts([c["text"] for c in chunks])
                    add_chunks(did, chunks, embs)
                    es.update(index=INDEX_NAME, id=did,
                              body={"doc": {"chunk_count": len(chunks), "has_embeddings": True}})
            embedded += 1
            logger.info(f"Embedded: {did}")
        except Exception as e:
            errors += 1
            logger.error(f"Batch embed failed for {did}: {e}")

    return {"embedded": embedded, "skipped": skipped, "errors": errors, "total": len(ids)}


# ── LLM Helpers ──────────────────────────────────────────────────


def _get_llm():
    if not llm_client:
            raise HTTPException(status_code=500, detail="Groq API key not configured. Set GROQ_API_KEY in .env")
    return llm_client


def _fetch_doc_content(doc_id: str) -> str:
    try:
        result = es.get(index=INDEX_NAME, id=doc_id)
        return result["_source"]["content"]
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")


def _fetch_multiple_docs(doc_ids: list[str]) -> str:
    if not doc_ids:
        return ""
    docs = []
    for did in doc_ids:
        try:
            result = es.get(index=INDEX_NAME, id=did)
            src = result["_source"]
            docs.append(f"--- Document: {src['title']} ---\n{src['content']}")
        except NotFoundError:
            continue
    return "\n\n".join(docs)


def _fetch_all_docs_content(max_docs: int = 50) -> str:
    result = es.search(index=INDEX_NAME, body={"query": {"match_all": {}}}, size=max_docs)
    docs = []
    for h in result["hits"]["hits"]:
        src = h["_source"]
        content = src.get("content", "")
        if src.get("content_type") == "image":
            desc = src.get("image_description", "")
            ocr = src.get("ocr_text", "")
            content = f"[Image: {src['title']}]\nDescription: {desc}\nOCR Text: {ocr}"
        docs.append(f"--- Document: {src['title']} ---\n{content[:3000]}")
    return "\n\n".join(docs)


def _vector_context(question: str, doc_ids: list[str] = None, max_chunks: int = 8) -> str:
    try:
        q_emb = embed_text(question)
        hits = search_chunks(q_emb, n_results=max_chunks, doc_ids=doc_ids or None)
        if not hits:
            return ""
        return "\n\n---\n\n".join([h["text"] for h in hits])
    except Exception as e:
        logger.error(f"Vector context failed: {e}")
        return ""


# ── AI Features ──────────────────────────────────────────────────


@app.post("/api/ai/summarize")
def summarize_document(req: SummarizeRequest):
    logger.info(f"Summarize: doc_id={req.doc_id}, style={req.style}")
    client = _get_llm()

    if req.content:
        text = req.content
    elif req.doc_id:
        text = _fetch_doc_content(req.doc_id)
    else:
        raise HTTPException(status_code=400, detail="Provide doc_id or content")

    style_map = {
        "concise": "Provide a concise 2-3 sentence summary.",
        "detailed": "Provide a detailed paragraph summary covering all key points.",
        "bullets": "Provide a summary as 5-7 bullet points.",
    }
    style_instruction = style_map.get(req.style, style_map["concise"])

    try:
        result = llm_chat([
            {"role": "system", "content": f"You are a document summarizer. {style_instruction} Return ONLY the summary, no preamble."},
            {"role": "user", "content": text[:12000]},
        ])
        return {"summary": result}
    except Exception as e:
        logger.error(f"Summarize LLM call failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")


@app.post("/api/ai/ask")
def ask_question(req: QuestionRequest):
    logger.info(f"Ask: '{req.question}' use_vector={req.use_vector}")
    client = _get_llm()

    context = ""
    if req.use_vector and req.question:
        context = _vector_context(req.question, req.doc_ids or None)

    if not context:
        if req.use_all_docs:
            context = _fetch_all_docs_content()
        elif req.doc_ids:
            context = _fetch_multiple_docs(req.doc_ids)

    system_prompt = (
        "You are a helpful assistant that answers questions based on the provided documents. "
        "Use the document context to answer. If the answer cannot be found, say so.\n\n"
        f"Document Context:\n{context[:12000]}"
        if context
        else "You are a helpful assistant. Answer to the best of your ability."
    )

    try:
        result = llm_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": req.question},
        ])
        return {"answer": result, "context_used": bool(context)}
    except Exception as e:
        logger.error(f"Ask LLM call failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")


@app.post("/api/ai/translate")
def translate_document(req: TranslateRequest):
    logger.info(f"Translate: doc_id={req.doc_id}, target={req.target_language}")
    client = _get_llm()

    if req.content:
        text = req.content
    elif req.doc_id:
        text = _fetch_doc_content(req.doc_id)
    else:
        raise HTTPException(status_code=400, detail="Provide doc_id or content")

    lang_names = {
        "en": "English", "es": "Spanish", "fr": "French", "de": "German",
        "it": "Italian", "pt": "Portuguese", "zh": "Chinese", "ja": "Japanese",
        "ko": "Korean", "ar": "Arabic", "hi": "Hindi", "ru": "Russian",
        "nl": "Dutch", "sv": "Swedish", "pl": "Polish", "tr": "Turkish",
    }
    target = lang_names.get(req.target_language, req.target_language)

    try:
        result = llm_chat([
            {"role": "system", "content": f"You are a professional translator. Translate to {target}. Preserve formatting. Return ONLY the translation."},
            {"role": "user", "content": text[:12000]},
        ])
        return {"translated_text": result, "target_language": req.target_language}
    except Exception as e:
        logger.error(f"Translate LLM call failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")


@app.post("/api/ai/chat")
def knowledge_base_chat(req: ChatRequest):
    logger.info(f"Chat: {len(req.messages)} messages, use_vector={req.use_vector}")
    client = _get_llm()

    context = ""
    if req.use_vector and req.messages:
        last_user = next((m.content for m in reversed(req.messages) if m.role == "user"), "")
        if last_user:
            context = _vector_context(last_user, req.doc_ids or None)

    if not context:
        if req.use_all_docs:
            context = _fetch_all_docs_content()
        elif req.doc_ids:
            context = _fetch_multiple_docs(req.doc_ids)

    system_msg = (
        "You are an intelligent knowledge base assistant with access to these documents:\n\n"
        f"{context[:12000]}\n\n"
        "Answer based on these documents. Be helpful, accurate, and conversational."
        if context
        else "You are a helpful AI assistant. Answer to the best of your ability."
    )

    messages = [{"role": "system", "content": system_msg}]
    for m in req.messages:
        messages.append({"role": m.role, "content": m.content})

    try:
        result = llm_chat(messages)
        return {"reply": result, "context_used": bool(context)}
    except Exception as e:
        logger.error(f"Chat LLM call failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")


# ── Intelligent Features ──────────────────────────────────────────


@app.post("/api/ai/auto-tags")
def auto_generate_tags(req: SummarizeRequest):
    logger.info(f"Auto-tags: doc_id={req.doc_id}")
    client = _get_llm()

    if req.content:
        text = req.content
    elif req.doc_id:
        text = _fetch_doc_content(req.doc_id)
    else:
        raise HTTPException(status_code=400, detail="Provide doc_id or content")

    try:
        result = llm_chat([
            {"role": "system", "content": "Analyze the document and suggest 3-8 relevant tags. Return ONLY a comma-separated list of lowercase tags, no explanation. Tags should be specific and descriptive."},
            {"role": "user", "content": text[:8000]},
        ])
        tags_text = result.strip()
        tags = [t.strip().lower().replace(" ", "-") for t in tags_text.split(",") if t.strip()]
        return {"tags": tags[:8]}
    except Exception as e:
        logger.error(f"Auto-tags failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")


@app.post("/api/ai/insights")
def document_insights(req: SummarizeRequest):
    logger.info(f"Insights: doc_id={req.doc_id}")
    client = _get_llm()

    if req.content:
        text = req.content
    elif req.doc_id:
        text = _fetch_doc_content(req.doc_id)
    else:
        raise HTTPException(status_code=400, detail="Provide doc_id or content")

    try:
        result = llm_chat([
            {"role": "system", "content": (
                "Analyze this document and return a JSON object with these fields: "
                '{"title": "document title", "summary": "2-3 sentence summary", '
                '"key_topics": ["topic1", "topic2", "topic3"], '
                '"entities": ["person/org/place names found"], '
                '"sentiment": "positive|negative|neutral", '
                '"complexity": "simple|moderate|complex", '
                '"word_count": approximate_word_count, '
                '"reading_time_min": estimated_minutes, '
                '"key_quotes": ["important quote 1", "important quote 2"]}'
                " Return ONLY valid JSON, no markdown fences."
            )},
            {"role": "user", "content": text[:10000]},
        ])
        import json
        insights = json.loads(result)
        return insights
    except json.JSONDecodeError:
        return {"summary": result, "raw": True}
    except Exception as e:
        logger.error(f"Insights failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")


@app.post("/api/ai/suggest")
def search_suggestions(req: SearchQuery):
    logger.info(f"Suggest: '{req.query}'")
    client = _get_llm()

    if not client:
        return {"suggestions": []}

    try:
        result = llm_chat([
            {"role": "system", "content": "Generate 5 smart search query suggestions based on the user's partial query. These should be related queries someone might want to search for. Return ONLY a JSON array of strings, e.g. [\"query1\", \"query2\"]. No explanation."},
            {"role": "user", "content": f"User typed: {req.query}"},
        ], max_tokens=200)
        import json
        suggestions = json.loads(result)
        return {"suggestions": suggestions[:5]}
    except Exception:
        return {"suggestions": []}


@app.get("/api/doc-insights/{doc_id}")
def get_doc_insights(doc_id: str):
    logger.info(f"Quick insights for {doc_id}")
    try:
        doc = es.get(index=INDEX_NAME, id=doc_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")

    src = doc["_source"]
    content = src.get("content", "")
    words = len(content.split())
    sentences = len([s for s in content.replace(".", "\n").split("\n") if s.strip()])
    paragraphs = len([p for p in content.split("\n\n") if p.strip()])

    top_words = {}
    for word in content.lower().split():
        word = word.strip(".,;:!?\"'()[]{}")
        if len(word) > 4 and word not in {"this", "that", "with", "from", "have", "been", "were", "they", "their", "there", "which", "about", "would", "could", "should", "will", "into", "also", "more", "than", "some", "very", "just", "only", "other", "each", "when", "what", "your", "does", "like", "well", "back", "over", "such", "made", "after"}:
            top_words[word] = top_words.get(word, 0) + 1
    top_keywords = sorted(top_words.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "doc_id": doc_id,
        "title": src.get("title", ""),
        "word_count": words,
        "sentence_count": sentences,
        "paragraph_count": paragraphs,
        "reading_time_min": max(1, words // 200),
        "top_keywords": [{"word": w, "count": c} for w, c in top_keywords],
        "has_embeddings": src.get("has_embeddings", False),
        "chunk_count": src.get("chunk_count", 0),
        "content_type": src.get("content_type", "document"),
    }


# ── Intelligence Extraction ──────────────────────────────────────


@app.post("/api/ai/extract-entities")
def extract_doc_entities(req: SummarizeRequest):
    """Extract structured intelligence entities from a document using LLM."""
    logger.info(f"Entity extraction: doc_id={req.doc_id}")

    if req.content:
        text = req.content
    elif req.doc_id:
        text = _fetch_doc_content(req.doc_id)
    else:
        raise HTTPException(status_code=400, detail="Provide doc_id or content")

    if llm_client:
        entities = extract_entities_with_llm(text, llm_client, GROQ_MODEL)
    else:
        entities = extract_entities_regex(text)

    if req.doc_id:
        try:
            es.update(
                index=INDEX_NAME, id=req.doc_id,
                body={"doc": {"entities": entities, "has_entities": True}},
            )
            logger.info(f"Entities saved for doc {req.doc_id}")
        except Exception as e:
            logger.error(f"Failed to save entities: {e}")

    return {"entities": entities, "doc_id": req.doc_id}


@app.get("/api/documents/{doc_id}/entities")
def get_doc_entities(doc_id: str):
    """Get extracted entities for a document."""
    try:
        doc = es.get(index=INDEX_NAME, id=doc_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")

    entities = doc["_source"].get("entities", {})
    if not entities:
        entities = {
            "persons": [], "organizations": [], "locations": [],
            "phone_numbers": [], "emails": [], "dates": [],
            "monetary_values": [], "id_numbers": [], "job_titles": [],
            "websites": [], "key_facts": [], "summary": "",
            "document_type": "other", "risk_flags": [],
            "sentiment": "neutral", "urgency": "none",
        }
    return {"doc_id": doc_id, "entities": entities, "has_entities": doc["_source"].get("has_entities", False)}


@app.post("/api/documents/{doc_id}/extract-images")
def extract_doc_images(doc_id: str):
    """Extract embedded images from a document and save them."""
    logger.info(f"Image extraction: doc_id={doc_id}")
    try:
        doc = es.get(index=INDEX_NAME, id=doc_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")

    src = doc["_source"]
    filename = src.get("title", "unknown")
    content = src.get("content", "")

    doc_dir = IMAGES_DIR / doc_id
    doc_dir.mkdir(exist_ok=True)

    extracted = get_extracted_images(doc_id)
    if extracted:
        return {"doc_id": doc_id, "images": extracted, "count": len(extracted), "cached": True}

    images = []
    try:
        doc_body = es.get(index=INDEX_NAME, id=doc_id)
        content_type = doc_body["_source"].get("content_type", "document")
        file_type = doc_body["_source"].get("file_type", "")

        if content_type == "image":
            return {"doc_id": doc_id, "images": [], "count": 0, "note": "This is an image document, not a document with embedded images."}

        return {"doc_id": doc_id, "images": [], "count": 0, "note": "Image extraction requires the original file. Upload the file again with extraction enabled."}
    except Exception as e:
        logger.error(f"Image extraction failed: {e}", exc_info=True)
        return {"doc_id": doc_id, "images": [], "count": 0, "error": str(e)}


@app.get("/api/documents/{doc_id}/images")
def get_document_images(doc_id: str):
    """Get extracted images for a document."""
    try:
        es.get(index=INDEX_NAME, id=doc_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")

    images = get_extracted_images(doc_id)
    return {"doc_id": doc_id, "images": images, "count": len(images)}


@app.get("/api/extracted-images/{doc_id}/{filename}")
def serve_extracted_image(doc_id: str, filename: str):
    """Serve an extracted image file."""
    file_path = IMAGES_DIR / doc_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    media_types = {
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".gif": "image/gif", ".bmp": "image/bmp", ".webp": "image/webp",
        ".tiff": "image/tiff",
    }
    media_type = media_types.get(file_path.suffix.lower(), "application/octet-stream")
    return FileResponse(str(file_path), media_type=media_type)


@app.post("/api/ai/full-extract")
def full_intelligence_extract(req: SummarizeRequest):
    """Run full intelligence extraction: entities + auto-tags + insights on a document."""
    logger.info(f"Full extraction: doc_id={req.doc_id}")

    if req.doc_id:
        try:
            doc = es.get(index=INDEX_NAME, id=req.doc_id)
            text = doc["_source"]["content"]
        except NotFoundError:
            raise HTTPException(status_code=404, detail="Document not found")
    elif req.content:
        text = req.content
    else:
        raise HTTPException(status_code=400, detail="Provide doc_id or content")

    entities = {}
    tags = []
    summary = ""

    if llm_client:
        try:
            entities = extract_entities_with_llm(text, llm_client, GROQ_MODEL)
        except Exception as e:
            logger.error(f"Entity extraction failed: {e}")
            entities = extract_entities_regex(text)

        try:
            result = llm_chat([
                {"role": "system", "content": "Analyze the document and suggest 3-8 relevant tags. Return ONLY a comma-separated list of lowercase tags, no explanation."},
                {"role": "user", "content": text[:8000]},
            ])
            tags_text = result.strip()
            tags = [t.strip().lower().replace(" ", "-") for t in tags_text.split(",") if t.strip()][:8]
        except Exception as e:
            logger.error(f"Auto-tags failed: {e}")

        try:
            summary = llm_chat([
                {"role": "system", "content": "Provide a concise 2-3 sentence summary. Return ONLY the summary."},
                {"role": "user", "content": text[:12000]},
            ])
        except Exception as e:
            logger.error(f"Summary failed: {e}")
    else:
        entities = extract_entities_regex(text)

    if req.doc_id:
        update_fields = {"entities": entities, "has_entities": True}
        if tags:
            update_fields["tags"] = tags
        if summary:
            update_fields["ai_summary"] = summary
        try:
            es.update(index=INDEX_NAME, id=req.doc_id, body={"doc": update_fields})
        except Exception as e:
            logger.error(f"Failed to update doc: {e}")

    return {
        "doc_id": req.doc_id,
        "entities": entities,
        "tags": tags,
        "summary": summary,
    }


@app.post("/api/documents/{doc_id}/extract-from-upload")
async def extract_from_reupload(doc_id: str, file: UploadFile = File(...)):
    """Re-upload a file to extract embedded images from it."""
    logger.info(f"Re-upload for image extraction: doc_id={doc_id}, file={file.filename}")

    try:
        es.get(index=INDEX_NAME, id=doc_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")

    content_bytes = await file.read()
    images = extract_images_from_doc(content_bytes, file.filename or "unknown", doc_id)

    if images:
        try:
            es.update(
                index=INDEX_NAME, id=doc_id,
                body={"doc": {"extracted_images": images, "has_extracted_images": True}},
            )
        except Exception as e:
            logger.error(f"Failed to save image refs: {e}")

    return {"doc_id": doc_id, "images": images, "count": len(images)}


# ── Face Recognition System ─────────────────────────────────────


@app.post("/api/images/{doc_id}/detect-faces")
def detect_faces_in_image(doc_id: str):
    """Detect faces in an already-uploaded image document."""
    logger.info(f"FRS detect faces: doc_id={doc_id}")
    try:
        doc = es.get(index=INDEX_NAME, id=doc_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")

    src = doc["_source"]
    if src.get("content_type") != "image":
        raise HTTPException(status_code=400, detail="Document is not an image")

    existing_faces = src.get("face_details")
    if existing_faces:
        return {"doc_id": doc_id, "faces": existing_faces, "face_count": len(existing_faces), "cached": True}

    try:
        from services.doc_image_extractor import IMAGES_DIR
        img_path = IMAGES_DIR / doc_id
        image_bytes = None
        if img_path.exists():
            for ext in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"):
                candidates = list(img_path.glob(f"*{ext}"))
                if candidates:
                    image_bytes = candidates[0].read_bytes()
                    break
        if image_bytes is None:
            raise HTTPException(status_code=404, detail="Image file not found on disk")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read image: {e}")

    faces = detect_faces(image_bytes)
    face_info = [{"face_id": f["face_id"], "bbox": f["bbox"],
                  "confidence": f["confidence"], "age": f["age"],
                  "gender": f["gender"]} for f in faces]

    if faces:
        add_face_embeddings(doc_id, faces)
    es.update(index=INDEX_NAME, id=doc_id, body={"doc": {
        "has_faces": len(faces) > 0, "face_count": len(faces),
        "face_details": face_info,
    }})

    return {"doc_id": doc_id, "faces": face_info, "face_count": len(face_info)}


@app.post("/api/search/faces")
def face_search(req: FaceSearchRequest):
    """Search for similar faces across all images."""
    logger.info(f"FRS face search: image_id={req.image_id}, threshold={req.threshold}")

    if not req.image_id:
        raise HTTPException(status_code=400, detail="Provide image_id to search from")

    try:
        doc = es.get(index=INDEX_NAME, id=req.image_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Image document not found")

    face_details = doc["_source"].get("face_details", [])
    if not face_details:
        raise HTTPException(status_code=400, detail="No faces found in this image")

    face_idx = min(req.face_index, len(face_details) - 1)

    try:
        from services.doc_image_extractor import IMAGES_DIR
        img_path = IMAGES_DIR / req.image_id
        image_bytes = None
        if img_path.exists():
            for ext in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"):
                candidates = list(img_path.glob(f"*{ext}"))
                if candidates:
                    image_bytes = candidates[0].read_bytes()
                    break
        if image_bytes is None:
            raise HTTPException(status_code=404, detail="Image file not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read image: {e}")

    query_emb = get_face_embedding(image_bytes, face_idx)
    if query_emb is None:
        raise HTTPException(status_code=400, detail="Could not extract face embedding")

    matches = search_faces(query_emb, n_results=req.n_results, threshold=req.threshold)

    enriched = []
    for m in matches:
        m_doc_id = m["metadata"]["doc_id"]
        try:
            src = es.get(index=INDEX_NAME, id=m_doc_id)["_source"]
            m["filename"] = src.get("title", "unknown")
            m["image_url"] = f"/api/extracted-images/{m_doc_id}/{m['filename']}"
        except Exception:
            m["filename"] = "unknown"
        enriched.append(m)

    return {
        "query_image_id": req.image_id,
        "query_face_index": face_idx,
        "matches": enriched,
        "total": len(enriched),
    }


@app.get("/api/faces/gallery")
def face_gallery():
    """Get all images that have detected faces."""
    logger.info("FRS face gallery")
    result = es.search(
        index=INDEX_NAME,
        body={
            "query": {"term": {"has_faces": True}},
        },
        size=100,
    )

    images = []
    for h in result["hits"]["hits"]:
        src = h["_source"]
        images.append({
            "doc_id": h["_id"],
            "filename": src.get("title", ""),
            "face_count": src.get("face_count", 0),
            "faces": src.get("face_details", []),
        })

    return {"images": images, "total": len(images)}


@app.get("/api/faces/stats")
def face_stats():
    """Get face recognition statistics."""
    face_count = get_face_collection_stats()
    try:
        result = es.search(
            index=INDEX_NAME,
            body={"query": {"term": {"has_faces": True}}},
            size=0,
        )
        images_with_faces = result["hits"]["total"]["value"]
    except Exception:
        images_with_faces = 0

    return {
        "total_face_embeddings": face_count,
        "images_with_faces": images_with_faces,
    }


@app.on_event("shutdown")
def shutdown():
    logger.info("DocMind API shutting down")
