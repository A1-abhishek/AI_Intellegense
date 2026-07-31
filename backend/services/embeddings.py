import logging
import os
import sys
import io
import numpy as np

logger = logging.getLogger("docmind.embeddings")

os.environ.setdefault("TQDM_DISABLE", "1")

if sys.stderr is None or not hasattr(sys.stderr, "flush"):
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

_model = None
_model_name = "all-MiniLM-L6-v2"

_clip_model = None
_clip_preprocess = None
_clip_tokenizer = None


def _get_model():
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {_model_name}...")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(_model_name)
        logger.info(f"Embedding model loaded (dim={_model.get_sentence_embedding_dimension()})")
    return _model


def _get_clip():
    global _clip_model, _clip_preprocess, _clip_tokenizer
    if _clip_model is None:
        logger.info("Loading CLIP model (ViT-B-32)...")
        import open_clip
        _clip_model, _, _clip_preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained="openai"
        )
        _clip_tokenizer = open_clip.get_tokenizer("ViT-B-32")
        _clip_model.eval()
        logger.info("CLIP model loaded (dim=512)")
    return _clip_model, _clip_preprocess, _clip_tokenizer


def embed_text(text: str) -> list[float]:
    logger.debug(f"Embedding text ({len(text)} chars)")
    model = _get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    logger.debug(f"Embedding generated: dim={len(embedding)}")
    return embedding.tolist()


def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    logger.info(f"Embedding {len(texts)} texts (batch_size={batch_size})")
    model = _get_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    logger.info(f"Generated {len(embeddings)} embeddings")
    return embeddings.tolist()


def embed_image_bytes(image_data: bytes) -> list[float]:
    """Embed an image using CLIP (512-dim normalized vector)."""
    import torch
    from PIL import Image

    model, preprocess, _ = _get_clip()
    img = Image.open(io.BytesIO(image_data)).convert("RGB")
    img_tensor = preprocess(img).unsqueeze(0)

    with torch.no_grad():
        emb = model.encode_image(img_tensor)
        emb = emb / emb.norm(dim=-1, keepdim=True)

    result = emb.squeeze(0).cpu().numpy().tolist()
    logger.debug(f"CLIP image embedding: dim={len(result)}")
    return result


def embed_text_clip(texts: list[str]) -> list[list[float]]:
    """Embed text using CLIP tokenizer (for image cross-modal search, 512-dim)."""
    import torch

    model, _, tokenizer = _get_clip()
    tokens = tokenizer(texts)

    with torch.no_grad():
        embs = model.encode_text(tokens)
        embs = embs / embs.norm(dim=-1, keepdim=True)

    result = embs.cpu().numpy().tolist()
    logger.debug(f"CLIP text embeddings: {len(result)} x dim={len(result[0])}")
    return result


def embed_text_clip_single(text: str) -> list[float]:
    """Embed a single text string using CLIP (512-dim)."""
    return embed_text_clip([text])[0]


def get_clip_dimension() -> int:
    return 512


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr = np.array(a)
    b_arr = np.array(b)
    return float(np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr)))


def get_embedding_dimension() -> int:
    model = _get_model()
    return model.get_sentence_embedding_dimension()
