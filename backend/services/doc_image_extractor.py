import io
import os
import uuid
import logging
from pathlib import Path

logger = logging.getLogger("docmind.doc_image_extractor")

IMAGES_DIR = Path(__file__).parent.parent / "extracted_images"
IMAGES_DIR.mkdir(exist_ok=True)


def extract_images_from_doc(data: bytes, filename: str, doc_id: str) -> list[dict]:
    """Extract embedded images from a document. Returns list of image metadata dicts."""
    ext = Path(filename).suffix.lower()
    logger.info(f"Extracting images from {filename} (ext={ext})")

    extractors = {
        ".pdf": _extract_from_pdf,
        ".docx": _extract_from_docx,
        ".doc": _extract_from_docx,
        ".pptx": _extract_from_pptx,
    }

    extractor = extractors.get(ext)
    if not extractor:
        logger.info(f"No image extractor for {ext}")
        return []

    try:
        images = extractor(data, doc_id)
        logger.info(f"Extracted {len(images)} images from {filename}")
        return images
    except Exception as e:
        logger.error(f"Image extraction failed for {filename}: {e}", exc_info=True)
        return []


def _extract_from_pdf(data: bytes, doc_id: str) -> list[dict]:
    """Extract images from PDF using PyMuPDF."""
    import fitz
    images = []
    doc_dir = IMAGES_DIR / doc_id
    doc_dir.mkdir(exist_ok=True)

    try:
        pdf = fitz.open(stream=data, filetype="pdf")
        img_count = 0

        for page_num in range(len(pdf)):
            page = pdf[page_num]
            image_list = page.get_images(full=True)

            for img_index, img_info in enumerate(image_list):
                xref = img_info[0]
                try:
                    base_image = pdf.extract_image(xref)
                    image_bytes = base_image["image"]
                    ext = base_image.get("ext", "png")
                    width = base_image.get("width", 0)
                    height = base_image.get("height", 0)

                    if len(image_bytes) < 500:
                        continue

                    image_filename = f"page{page_num+1}_img{img_index+1}.{ext}"
                    save_path = doc_dir / image_filename
                    save_path.write_bytes(image_bytes)

                    images.append({
                        "filename": image_filename,
                        "path": str(save_path.relative_to(IMAGES_DIR.parent)),
                        "page": page_num + 1,
                        "width": width,
                        "height": height,
                        "size_bytes": len(image_bytes),
                        "format": ext,
                    })
                    img_count += 1
                except Exception as e:
                    logger.warning(f"Failed to extract image xref={xref}: {e}")
                    continue

        page_count = len(pdf)
        pdf.close()
        logger.info(f"PDF image extraction: {img_count} images from {page_count} pages")
    except ImportError:
        logger.error("PyMuPDF not installed for image extraction")
        raise

    return images


def _extract_from_docx(data: bytes, doc_id: str) -> list[dict]:
    """Extract images from DOCX files."""
    import zipfile
    images = []
    doc_dir = IMAGES_DIR / doc_id
    doc_dir.mkdir(exist_ok=True)

    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            image_entries = [
                name for name in z.namelist()
                if name.startswith("word/media/") and any(
                    name.lower().endswith(ext)
                    for ext in (".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp", ".emf", ".wmf")
                )
            ]

            for idx, entry in enumerate(image_entries):
                try:
                    image_bytes = z.read(entry)
                    if len(image_bytes) < 500:
                        continue

                    original_name = Path(entry).name
                    ext = Path(entry).suffix.lower().lstrip(".")
                    if ext in ("emf", "wmf"):
                        ext = "png"

                    image_filename = f"image_{idx+1}.{ext}"
                    save_path = doc_dir / image_filename
                    save_path.write_bytes(image_bytes)

                    width, height = _get_image_dimensions(image_bytes)

                    images.append({
                        "filename": image_filename,
                        "path": str(save_path.relative_to(IMAGES_DIR.parent)),
                        "page": 0,
                        "width": width,
                        "height": height,
                        "size_bytes": len(image_bytes),
                        "format": ext,
                        "original_name": original_name,
                    })
                except Exception as e:
                    logger.warning(f"Failed to extract DOCX image {entry}: {e}")
                    continue

        logger.info(f"DOCX image extraction: {len(images)} images")
    except zipfile.BadZipFile:
        logger.warning("File is not a valid ZIP/DOCX for image extraction")

    return images


def _extract_from_pptx(data: bytes, doc_id: str) -> list[dict]:
    """Extract images from PPTX files."""
    import zipfile
    images = []
    doc_dir = IMAGES_DIR / doc_id
    doc_dir.mkdir(exist_ok=True)

    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            image_entries = [
                name for name in z.namelist()
                if name.startswith("ppt/media/") and any(
                    name.lower().endswith(ext)
                    for ext in (".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp")
                )
            ]

            for idx, entry in enumerate(image_entries):
                try:
                    image_bytes = z.read(entry)
                    if len(image_bytes) < 500:
                        continue

                    ext = Path(entry).suffix.lower().lstrip(".")
                    image_filename = f"slide_img_{idx+1}.{ext}"
                    save_path = doc_dir / image_filename
                    save_path.write_bytes(image_bytes)

                    width, height = _get_image_dimensions(image_bytes)

                    images.append({
                        "filename": image_filename,
                        "path": str(save_path.relative_to(IMAGES_DIR.parent)),
                        "page": 0,
                        "width": width,
                        "height": height,
                        "size_bytes": len(image_bytes),
                        "format": ext,
                    })
                except Exception as e:
                    logger.warning(f"Failed to extract PPTX image {entry}: {e}")
                    continue

        logger.info(f"PPTX image extraction: {len(images)} images")
    except zipfile.BadZipFile:
        logger.warning("File is not a valid ZIP/PPTX for image extraction")

    return images


def _get_image_dimensions(data: bytes) -> tuple[int, int]:
    """Get image width/height from bytes without PIL."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(data))
        return img.size
    except Exception:
        pass

    if data[:8] == b"\x89PNG\r\n\x1a\n":
        import struct
        w = struct.unpack(">I", data[16:20])[0]
        h = struct.unpack(">I", data[20:24])[0]
        return w, h

    if data[:2] == b"\xff\xd8":
        import struct
        idx = 2
        while idx < len(data) - 1:
            if data[idx] != 0xFF:
                break
            marker = data[idx + 1]
            if marker in (0xC0, 0xC1, 0xC2):
                h = struct.unpack(">H", data[idx + 5:idx + 7])[0]
                w = struct.unpack(">H", data[idx + 7:idx + 9])[0]
                return w, h
            length = struct.unpack(">H", data[idx + 2:idx + 4])[0]
            idx += 2 + length

    return 0, 0


def get_extracted_images(doc_id: str) -> list[dict]:
    """Get all extracted images for a document."""
    doc_dir = IMAGES_DIR / doc_id
    if not doc_dir.exists():
        return []

    images = []
    for f in sorted(doc_dir.iterdir()):
        if f.is_file() and f.suffix.lower() in (".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp"):
            width, height = _get_image_dimensions(f.read_bytes())
            images.append({
                "filename": f.name,
                "path": f"{doc_id}/{f.name}",
                "width": width,
                "height": height,
                "size_bytes": f.stat().st_size,
                "format": f.suffix.lstrip("."),
            })
    return images


def delete_extracted_images(doc_id: str):
    """Delete all extracted images for a document."""
    import shutil
    doc_dir = IMAGES_DIR / doc_id
    if doc_dir.exists():
        shutil.rmtree(doc_dir)
        logger.info(f"Deleted extracted images for {doc_id}")
