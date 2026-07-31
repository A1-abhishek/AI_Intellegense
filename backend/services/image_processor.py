import io
import base64
import logging
from pathlib import Path

logger = logging.getLogger("docmind.image_processor")

IMAGE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".tif",
    ".webp", ".svg", ".ico", ".heic", ".heif",
}

DOCUMENT_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".pptx", ".xlsx", ".odt", ".rtf",
    ".epub", ".txt", ".md", ".csv", ".json", ".xml", ".html",
    ".htm", ".yaml", ".yml", ".log",
}


def is_image_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in IMAGE_EXTENSIONS


def is_document_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in DOCUMENT_EXTENSIONS


def detect_file_type(data: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    logger.debug(f"detect_file_type: {filename} ext={ext}")

    if ext in IMAGE_EXTENSIONS:
        logger.debug(f"  -> image (by extension)")
        return "image"
    if ext in DOCUMENT_EXTENSIONS:
        logger.debug(f"  -> document (by extension)")
        return "document"

    magic = data[:8]
    if magic[:8] == b"\x89PNG\r\n\x1a\n":
        return "image"
    if magic[:3] == b"\xff\xd8\xff":
        return "image"
    if magic[:4] == b"GIF8":
        return "image"
    if magic[:4] == b"RIFF" and magic[8:12] == b"WEBP":
        return "image"
    if magic[:5] == b"%PDF-":
        return "document"
    if magic[:4] == b"PK\x03\x04":
        return "document"
    if magic[:5] == b"<?xml" or magic[:5] == b"<html":
        return "document"

    logger.debug(f"  -> unknown, falling back to document")
    return "unknown"


def get_image_metadata(data: bytes, filename: str) -> dict:
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(data))
        w, h = img.size
        meta = {"width": w, "height": h, "format": img.format, "mode": img.mode}
        logger.debug(f"Image metadata for {filename}: {meta}")
        return meta
    except Exception as e:
        logger.warning(f"Failed to get image metadata: {e}")
        return {}


def ocr_image(data: bytes, lang: str = "eng") -> str:
    logger.debug(f"OCR: lang={lang}, data_size={len(data)}")

    try:
        from rapidocr_onnxruntime import RapidOCR
        import numpy as np
        from PIL import Image
        ocr_engine = RapidOCR()
        img = Image.open(io.BytesIO(data)).convert("RGB")
        img_array = np.array(img)
        result, _ = ocr_engine(img_array)
        if result:
            lines = [line[1] for line in result]
            text = "\n".join(lines)
            logger.info(f"RapidOCR result: {len(text)} chars")
            return text.strip()
    except ImportError:
        logger.warning("rapidocr-onnxruntime not installed, trying pytesseract")
    except Exception as e:
        logger.warning(f"rapidocr failed: {e}, trying pytesseract")

    try:
        import pytesseract
        from PIL import Image
        img = Image.open(io.BytesIO(data))
        text = pytesseract.image_to_string(img, lang=lang)
        logger.info(f"pytesseract result: {len(text)} chars")
        return text.strip()
    except ImportError:
        logger.warning("pytesseract not installed, trying easyocr")
    except Exception as e:
        logger.warning(f"pytesseract failed: {e}, trying easyocr")

    try:
        import easyocr
        reader = easyocr.Reader([lang[:2]], gpu=False)
        import numpy as np
        from PIL import Image
        img = Image.open(io.BytesIO(data)).convert("RGB")
        img_array = np.array(img)
        results = reader.readtext(img_array)
        lines = [r[1] for r in results]
        text = "\n".join(lines)
        logger.info(f"EasyOCR result: {len(text)} chars")
        return text
    except ImportError:
        logger.warning("easyocr not installed either")
    except Exception as e:
        logger.warning(f"easyocr failed: {e}")

    return ""


def image_to_base64(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")


def _build_heuristic_description(data: bytes, filename: str, metadata: dict, ocr_text: str) -> str:
    """Build an image description from available metadata + OCR (no LLM needed)."""
    parts = [f"Image: {filename}"]

    w = metadata.get("width", 0)
    h = metadata.get("height", 0)
    fmt = metadata.get("format", "unknown")
    if w and h:
        orientation = "landscape" if w > h else "portrait" if h > w else "square"
        parts.append(f"{w}x{h} {orientation} {fmt}")
    elif fmt:
        parts.append(f"Format: {fmt}")

    ext = Path(filename).suffix.lower()
    type_hints = {
        ".png": "PNG image, may contain graphics or screenshots",
        ".jpg": "JPEG photograph", ".jpeg": "JPEG photograph",
        ".gif": "GIF image, may be animated",
        ".bmp": "Bitmap image",
        ".webp": "WebP image",
        ".tiff": "TIFF image, often high-resolution",
        ".svg": "SVG vector graphic",
    }
    if ext in type_hints:
        parts.append(type_hints[ext])

    size_bytes = len(data)
    if size_bytes > 1_000_000:
        parts.append(f"High resolution ({size_bytes // 1024}KB)")
    elif size_bytes > 100_000:
        parts.append(f"Medium resolution ({size_bytes // 1024}KB)")

    if ocr_text:
        clean = " ".join(ocr_text.split()[:80])
        parts.append(f"Contains text: {clean}")

    return ". ".join(parts) + "."


def get_groq_vision_description(data: bytes, filename: str, client) -> str:
    """Generate image description using OCR + metadata heuristics (Groq vision models decommissioned)."""
    logger.info(f"Generating image description for {filename} ({len(data)} bytes)")

    metadata = get_image_metadata(data, filename)
    ocr_text = ocr_image(data)

    description = _build_heuristic_description(data, filename, metadata, ocr_text)
    logger.info(f"Image description ({len(description)} chars): {description[:100]}...")
    return description


def _guess_mime(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    mime_map = {
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".gif": "image/gif", ".bmp": "image/bmp", ".webp": "image/webp",
        ".tiff": "image/tiff", ".tif": "image/tiff",
    }
    return mime_map.get(ext, "image/png")
