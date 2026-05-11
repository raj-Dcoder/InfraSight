"""Upload validation and local storage helpers."""
from pathlib import Path
import re
import uuid

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_EXTENSIONS_BY_MIME = {
    "application/pdf": {".pdf"},
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"},
    "video/mp4": {".mp4"},
}


def _safe_upload_name(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    stem = Path(filename).stem[:80]
    stem = re.sub(r"[^A-Za-z0-9_.-]+", "-", stem).strip("-") or "upload"
    return f"{uuid.uuid4().hex}_{stem}{suffix}"


def _looks_like_mime(mime_type: str, header: bytes) -> bool:
    if mime_type == "application/pdf":
        return header.startswith(b"%PDF-")
    if mime_type == "image/jpeg":
        return header.startswith(b"\xff\xd8\xff")
    if mime_type == "image/png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/webp":
        return header.startswith(b"RIFF") and header[8:12] == b"WEBP"
    if mime_type == "video/mp4":
        return len(header) >= 12 and header[4:8] == b"ftyp"
    return False


async def save_validated_upload(file: UploadFile, folder: str) -> tuple[str, int, str]:
    mime_type = (file.content_type or "").lower()
    suffix = Path(file.filename or "upload").suffix.lower()

    if mime_type not in settings.ALLOWED_UPLOAD_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type",
        )
    if suffix not in ALLOWED_EXTENSIONS_BY_MIME.get(mime_type, set()):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File extension does not match the declared file type",
        )

    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    target_dir = Path(settings.UPLOAD_DIR) / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / _safe_upload_name(file.filename or "upload")

    size = 0
    first_chunk = True
    with target.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            if first_chunk:
                first_chunk = False
                if not _looks_like_mime(mime_type, chunk[:32]):
                    target.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail="File content does not match the declared file type",
                    )
            size += len(chunk)
            if size > max_size:
                target.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit",
                )
            out.write(chunk)

    if size == 0:
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty files are not allowed")

    relative_url = f"/uploads/{folder}/{target.name}".replace("\\", "/")
    return f"{settings.PUBLIC_BASE_URL.rstrip('/')}{relative_url}", size, mime_type
