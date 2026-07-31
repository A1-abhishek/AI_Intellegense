import logging
import chromadb
from chromadb.config import Settings

logger = logging.getLogger("docmind.vector_store")

_client = None
COLLECTION_DOCS = "doc_chunks"
COLLECTION_IMAGES = "image_embeddings"
COLLECTION_FACES = "face_embeddings"


def _get_client():
    global _client
    if _client is None:
        logger.info("Initializing ChromaDB client...")
        _client = chromadb.PersistentClient(
            path="./chroma_data",
            settings=Settings(anonymized_telemetry=False),
        )
        logger.info("ChromaDB client ready")
    return _client


def _get_collection(name: str):
    client = _get_client()
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )


def ensure_image_collection_dimension(expected_dim: int = 512):
    """Recreate image_embeddings collection if dimension mismatch (e.g. 384→512 for CLIP)."""
    client = _get_client()
    try:
        col = client.get_collection(COLLECTION_IMAGES)
        count = col.count()
        if count == 0:
            return
        sample = col.get(limit=1, include=["embeddings"])
        embs = sample.get("embeddings", [])
        if hasattr(embs, '__len__') and len(embs) > 0 and len(embs[0]) != expected_dim:
            logger.warning(
                f"Image collection dim mismatch: has {len(embs[0])}, "
                f"expected {expected_dim}. Recreating..."
            )
            client.delete_collection(COLLECTION_IMAGES)
            _get_collection(COLLECTION_IMAGES)
            logger.info(f"Recreated {COLLECTION_IMAGES} with {expected_dim}-dim embeddings")
    except Exception as e:
        logger.debug(f"ensure_image_collection_dimension: {e}")


def ensure_face_collection_dimension(expected_dim: int = 512):
    """Recreate face_embeddings collection if dimension mismatch."""
    client = _get_client()
    try:
        col = client.get_collection(COLLECTION_FACES)
        count = col.count()
        if count == 0:
            return
        sample = col.get(limit=1, include=["embeddings"])
        embs = sample.get("embeddings", [])
        if hasattr(embs, '__len__') and len(embs) > 0 and len(embs[0]) != expected_dim:
            logger.warning(
                f"Face collection dim mismatch: has {len(sample['embeddings'][0])}, "
                f"expected {expected_dim}. Recreating..."
            )
            client.delete_collection(COLLECTION_FACES)
            _get_collection(COLLECTION_FACES)
            logger.info(f"Recreated {COLLECTION_FACES} with {expected_dim}-dim embeddings")
    except Exception as e:
        logger.debug(f"ensure_face_collection_dimension: {e}")


def add_face_embeddings(doc_id: str, faces: list[dict]):
    """Store face embeddings for an image document.

    Each face entry: {face_id, bbox, confidence, embedding, age, gender}
    """
    col = _get_collection(COLLECTION_FACES)
    ids = [f"face_{doc_id}_{f['face_id']}" for f in faces]
    embeddings = [f["embedding"] for f in faces]
    metadatas = [
        {
            "doc_id": doc_id,
            "face_id": f["face_id"],
            "bbox_x1": f["bbox"][0],
            "bbox_y1": f["bbox"][1],
            "bbox_x2": f["bbox"][2],
            "bbox_y2": f["bbox"][3],
            "confidence": f["confidence"],
            "age": f.get("age", 0),
            "gender": f.get("gender", "unknown"),
        }
        for f in faces
    ]
    documents = [f"Face {f['face_id']} from {doc_id} (age {f.get('age', '?')}, {f.get('gender', '?')})" for f in faces]
    col.upsert(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents)
    logger.info(f"Stored {len(faces)} face embeddings for doc {doc_id}")


def search_faces(query_embedding: list[float], n_results: int = 10, threshold: float = 0.6):
    """Search for similar faces using cosine distance.

    Returns list of matches with similarity score (1 - distance).
    """
    col = _get_collection(COLLECTION_FACES)
    count = col.count()
    if count == 0:
        return []

    results = col.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, count),
        include=["documents", "metadatas", "distances"],
    )

    hits = []
    if results["ids"] and results["ids"][0]:
        for i in range(len(results["ids"][0])):
            distance = results["distances"][0][i]
            similarity = 1.0 - distance
            if similarity >= threshold:
                hits.append({
                    "id": results["ids"][0][i],
                    "document": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": distance,
                    "similarity": round(similarity, 4),
                })
    hits.sort(key=lambda x: x["similarity"], reverse=True)
    logger.debug(f"Face search: {len(hits)} matches above threshold {threshold}")
    return hits


def delete_face_embeddings(doc_id: str):
    """Delete all face embeddings for a document."""
    try:
        col = _get_collection(COLLECTION_FACES)
        results = col.get(where={"doc_id": doc_id})
        if results["ids"]:
            col.delete(ids=results["ids"])
            logger.debug(f"Deleted {len(results['ids'])} face embeddings for {doc_id}")
    except Exception as e:
        logger.warning(f"Delete face embeddings failed: {e}")


def get_face_collection_stats() -> int:
    """Get count of stored face embeddings."""
    try:
        col = _get_collection(COLLECTION_FACES)
        return col.count()
    except Exception:
        return 0


def add_chunks(doc_id: str, chunks: list[dict], embeddings: list[list[float]]):
    logger.info(f"Adding {len(chunks)} chunks for doc {doc_id}")
    col = _get_collection(COLLECTION_DOCS)
    ids = [f"{doc_id}_chunk_{c['chunk_id']}" for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "doc_id": doc_id,
            "chunk_id": c["chunk_id"],
            "start_char": c["start_char"],
            "end_char": c["end_char"],
        }
        for c in chunks
    ]
    col.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
    logger.info(f"Chunks stored in ChromaDB for {doc_id}")


def add_image_embedding(doc_id: str, filename: str, embedding: list[float],
                        description: str = "", ocr_text: str = "", metadata: dict = None):
    logger.info(f"Adding image embedding for {doc_id} ({filename})")
    col = _get_collection(COLLECTION_IMAGES)
    meta = {
        "doc_id": doc_id,
        "filename": filename,
        "description": description[:500],
        "ocr_text": ocr_text[:500],
    }
    if metadata:
        for k, v in metadata.items():
            if isinstance(v, (str, int, float, bool)):
                meta[k] = v
    col.upsert(
        ids=[f"img_{doc_id}"],
        embeddings=[embedding],
        metadatas=[meta],
        documents=[description or ocr_text or filename],
    )
    logger.info(f"Image embedding stored for {doc_id}")


def search_chunks(query_embedding: list[float], n_results: int = 10, doc_ids: list[str] = None):
    logger.debug(f"Searching chunks (n={n_results}, doc_ids={doc_ids})")
    col = _get_collection(COLLECTION_DOCS)
    where = None
    if doc_ids:
        if len(doc_ids) == 1:
            where = {"doc_id": doc_ids[0]}
        else:
            where = {"doc_id": {"$in": doc_ids}}

    results = col.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where=where,
        include=["documents", "metadatas", "distances"],
    )
    hits = []
    if results["ids"] and results["ids"][0]:
        for i in range(len(results["ids"][0])):
            hits.append({
                "id": results["ids"][0][i],
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i],
            })
    logger.debug(f"Found {len(hits)} chunk results")
    return hits


def search_images(query_embedding: list[float], n_results: int = 10):
    logger.debug(f"Searching images (n={n_results})")
    col = _get_collection(COLLECTION_IMAGES)
    results = col.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )
    hits = []
    if results["ids"] and results["ids"][0]:
        for i in range(len(results["ids"][0])):
            hits.append({
                "id": results["ids"][0][i],
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i],
            })
    logger.debug(f"Found {len(hits)} image results")
    return hits


def delete_doc_chunks(doc_id: str):
    logger.debug(f"Deleting chunks for {doc_id}")
    try:
        col_docs = _get_collection(COLLECTION_DOCS)
        results = col_docs.get(where={"doc_id": doc_id})
        if results["ids"]:
            col_docs.delete(ids=results["ids"])
            logger.debug(f"Deleted {len(results['ids'])} chunks for {doc_id}")
    except Exception as e:
        logger.warning(f"Delete doc chunks failed: {e}")

    try:
        col_imgs = _get_collection(COLLECTION_IMAGES)
        col_imgs.delete(ids=[f"img_{doc_id}"])
    except Exception as e:
        logger.warning(f"Delete image embedding failed: {e}")

    try:
        delete_face_embeddings(doc_id)
    except Exception as e:
        logger.warning(f"Delete face embeddings failed: {e}")


def get_collection_stats() -> dict:
    stats = {}
    try:
        col = _get_collection(COLLECTION_DOCS)
        stats["document_chunks"] = col.count()
    except Exception:
        stats["document_chunks"] = 0
    try:
        col = _get_collection(COLLECTION_IMAGES)
        stats["image_embeddings"] = col.count()
    except Exception:
        stats["image_embeddings"] = 0
    try:
        col = _get_collection(COLLECTION_FACES)
        stats["face_embeddings"] = col.count()
    except Exception:
        stats["face_embeddings"] = 0
    return stats
