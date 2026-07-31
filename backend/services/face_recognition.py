import io
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger("docmind.face_recognition")

_app = None
_DIMENSION = 512


def _get_app():
    global _app
    if _app is None:
        logger.info("Initializing InsightFace FaceAnalysis (buffalo_l)...")
        from insightface.app import FaceAnalysis
        _app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )
        _app.prepare(ctx_id=0, det_size=(640, 640))
        logger.info("FaceAnalysis ready")
    return _app


def detect_faces(image_data: bytes, min_confidence: float = 0.5) -> list[dict]:
    """Detect faces in an image and return metadata + embeddings.

    Returns list of dicts:
      {
        "face_id": int,
        "bbox": [x1, y1, x2, y2],
        "confidence": float,
        "embedding": list[float] (512-dim),
        "age": int,
        "gender": str,
      }
    """
    import cv2

    app = _get_app()
    nparr = np.frombuffer(image_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        logger.warning("Failed to decode image for face detection")
        return []

    faces = app.get(img)
    results = []
    for i, face in enumerate(faces):
        if face.det_score < min_confidence:
            continue
        bbox = face.bbox.astype(int).tolist()
        gender_str = "M" if face.gender == 1 else "F"
        results.append({
            "face_id": i,
            "bbox": bbox,
            "confidence": round(float(face.det_score), 4),
            "embedding": face.embedding.tolist(),
            "age": int(face.age),
            "gender": gender_str,
        })

    logger.info(f"Detected {len(results)} face(s) (min_conf={min_confidence})")
    return results


def get_face_embedding(image_data: bytes, face_index: int = 0) -> Optional[list[float]]:
    """Get a single face embedding by index."""
    faces = detect_faces(image_data)
    if face_index < len(faces):
        return faces[face_index]["embedding"]
    return None


def compare_faces(emb_a: list[float], emb_b: list[float]) -> float:
    """Compute cosine similarity between two face embeddings."""
    a = np.array(emb_a, dtype=np.float32)
    b = np.array(emb_b, dtype=np.float32)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def face_dimension() -> int:
    return _DIMENSION
