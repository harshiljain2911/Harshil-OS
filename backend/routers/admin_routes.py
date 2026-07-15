"""
Hidden Admin Panel API — auth + content CRUD + drafts + media library.

Design:
 - Auth: ADMIN_PASSWORD env var (required to enable admin at all) compared in
   constant time; successful login returns an HMAC-signed expiring token
   (secret = ADMIN_JWT_SECRET env var, falls back to a random per-boot secret,
   which simply means tokens don't survive a server restart).
 - Content statuses map to directories:
       published → content/{collection}/
       draft     → content/drafts/{collection}/
       archived  → content/archived/{collection}/
   The public loader only reads content/{collection}/, so drafts/archived are
   invisible to the public site by construction.
 - Every write is validated against the same Pydantic models the public
   loader uses (fail-fast, extra="forbid"), then the in-memory registry is
   reloaded so changes are live immediately — no code changes, no redeploys.
 - Media uploads go to backend/uploads/ (served read-only at /uploads),
   extension-whitelisted and size-capped.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from content_loader import CONTENT_ROOT, registry
from models import COLLECTION_MAP, Site

logger = logging.getLogger("admin")

router = APIRouter(prefix="/admin", tags=["admin"])
login_limiter = Limiter(key_func=get_remote_address)

UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
DRAFTS_ROOT = CONTENT_ROOT / "drafts"
ARCHIVED_ROOT = CONTENT_ROOT / "archived"

TOKEN_TTL_SECONDS = 24 * 3600
_BOOT_SECRET = secrets.token_hex(32)

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico"}
VIDEO_EXT = {".mp4", ".webm", ".mov"}
DOC_EXT = {".pdf", ".txt", ".doc", ".docx"}
ALLOWED_UPLOAD_EXT = IMAGE_EXT | VIDEO_EXT | DOC_EXT

MAX_IMAGE_BYTES = 20 * 1024 * 1024    # 20 MB
MAX_DOC_BYTES = 25 * 1024 * 1024      # 25 MB
MAX_VIDEO_BYTES = 200 * 1024 * 1024   # 200 MB

# Media library folders (uploads/{category}/). "other" catches legacy root files.
MEDIA_CATEGORIES = ("certificates", "projects", "blogs", "resumes", "videos", "images", "other")


def _max_bytes_for(ext: str) -> int:
    if ext in VIDEO_EXT:
        return MAX_VIDEO_BYTES
    if ext in DOC_EXT:
        return MAX_DOC_BYTES
    return MAX_IMAGE_BYTES


def _safe_category(category: str | None) -> str:
    c = (category or "").strip().lower()
    return c if c in MEDIA_CATEGORIES else "other"

STATUSES = ("published", "draft", "archived")


# ---------------------------------------------------------------- auth

def _secret() -> str:
    return os.environ.get("ADMIN_JWT_SECRET") or _BOOT_SECRET


def _sign(payload: dict) -> str:
    raw = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(_secret().encode(), raw.encode(), hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def _verify(token: str) -> bool:
    try:
        raw, sig = token.rsplit(".", 1)
        expected = hmac.new(_secret().encode(), raw.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return False
        padded = raw + "=" * (-len(raw) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        return payload.get("exp", 0) > time.time()
    except Exception:
        return False


def require_admin(request: Request) -> None:
    if not os.environ.get("ADMIN_PASSWORD"):
        raise HTTPException(status_code=503, detail="Admin panel is not configured")
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer ") or not _verify(auth[7:]):
        raise HTTPException(status_code=401, detail="Not authenticated")


class LoginPayload(BaseModel):
    password: str = Field(min_length=1, max_length=200)


@router.post("/login")
@login_limiter.limit("5/minute")
async def login(request: Request, payload: LoginPayload) -> dict:
    configured = os.environ.get("ADMIN_PASSWORD")
    if not configured:
        raise HTTPException(status_code=503, detail="Admin panel is not configured")
    if not hmac.compare_digest(payload.password.encode(), configured.encode()):
        logger.warning("admin.login_failed ip=%s", get_remote_address(request))
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = _sign({"exp": time.time() + TOKEN_TTL_SECONDS, "v": 1})
    logger.info("admin.login_ok ip=%s", get_remote_address(request))
    return {"token": token, "expires_in": TOKEN_TTL_SECONDS}


@router.get("/me", dependencies=[Depends(require_admin)])
async def me() -> dict:
    return {"ok": True}


@router.get("/ai-status", dependencies=[Depends(require_admin)])
async def ai_status() -> dict:
    """Provider Manager view: which providers are ACTIVE (key present) vs
    DISABLED, the current provider, the fallback order, and per-provider models.
    API keys themselves are NEVER returned — only booleans."""
    from routers.assistant_routes import (
        DEFAULT_MODELS, MODEL_OPTIONS, PROVIDER_PREFERENCE,
        _api_key, _model, _provider, _provider_order, _site_ai,
    )
    site_ai = _site_ai()
    keys_present = {name: bool(_api_key(name)) for name in PROVIDER_PREFERENCE}
    saved_models = site_ai.get("models") if isinstance(site_ai.get("models"), dict) else {}

    # Ordered fallback list (only providers that actually have a key).
    fallback_order = [n for n in _provider_order() if keys_present.get(n)]
    p = _provider()
    current = p[0] if p else None

    providers = [
        {
            "name": name,
            "label": {"openrouter": "OpenRouter", "openai": "OpenAI", "gemini": "Gemini", "anthropic": "Anthropic"}[name],
            "active": keys_present.get(name, False),
            "is_current": name == current,
            "model": _model(name),
            "options": MODEL_OPTIONS.get(name, []),
            "saved_model": saved_models.get(name, ""),
        }
        for name in PROVIDER_PREFERENCE
    ]

    return {
        "configured": bool(current),
        "provider": current,
        "model": _model(current) if current else None,
        "mode": "llm+retrieval" if current else "retrieval-fallback",
        "keys_present": keys_present,
        "providers": providers,
        "fallback_order": fallback_order,
        "settings": {
            "provider": site_ai.get("provider"),
            "model": site_ai.get("model"),
            "models": saved_models,
        },
        "default_models": DEFAULT_MODELS,
        "model_options": MODEL_OPTIONS,
        "hint": None if current else "No provider key detected/valid. Add a working OPENROUTER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY to backend/.env, then restart the backend.",
    }


@router.post("/ai-test", dependencies=[Depends(require_admin)])
async def ai_test() -> dict:
    """Live probe of every provider that has a key — a real 1-token request so the
    admin can see which providers actually work (vs merely configured)."""
    from routers.assistant_routes import PROVIDER_PREFERENCE, _api_key, _model, probe_provider
    results = {}
    for name in PROVIDER_PREFERENCE:
        key = _api_key(name)
        if not key:
            results[name] = {"tested": False, "ok": False, "detail": "no key configured"}
            continue
        ok, detail = await probe_provider(name, key)
        results[name] = {"tested": True, "ok": ok, "detail": detail, "model": _model(name)}
    logger.info("admin.ai_test %s", {k: v["ok"] for k, v in results.items()})
    return {"results": results}


class AISettingsPayload(BaseModel):
    provider: str | None = None
    model: str | None = None
    models: dict[str, str] | None = None


@router.put("/ai-settings", dependencies=[Depends(require_admin)])
async def put_ai_settings(payload: AISettingsPayload) -> dict:
    """Persist provider/model choices into site.json (no API keys here).
    Takes effect immediately — the assistant reads it live per request."""
    from routers.assistant_routes import _api_key
    valid = {"", "openrouter", "anthropic", "openai", "gemini"}
    provider = (payload.provider or "").strip().lower()
    if provider not in valid:
        raise HTTPException(status_code=422, detail=f"provider must be one of {sorted(valid - {''})} or empty for auto")
    if provider and not _api_key(provider):
        raise HTTPException(status_code=422, detail=f"No API key configured for '{provider}' — add its key to backend/.env first")

    # Per-provider model overrides — keep only known providers with a non-empty value.
    models = {
        k.strip().lower(): v.strip()
        for k, v in (payload.models or {}).items()
        if k.strip().lower() in (valid - {""}) and v and v.strip()
    }

    site = json.loads((CONTENT_ROOT / "site.json").read_text(encoding="utf-8"))
    site["ai"] = {
        "provider": provider or None,
        "model": (payload.model or "").strip() or None,
        "models": models,
    }
    try:
        parsed = Site(**site)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Schema validation failed: {e}") from e
    _write(CONTENT_ROOT / "site.json", parsed.model_dump(mode="json"))
    _reload()
    logger.info("admin.ai_settings provider=%s model=%s models=%s", site["ai"]["provider"], site["ai"]["model"], models)
    return {"ok": True, "ai": site["ai"]}


# ---------------------------------------------------------------- helpers

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,80}$")


def _check_collection(collection: str) -> None:
    if collection not in COLLECTION_MAP:
        raise HTTPException(status_code=404, detail=f"Unknown collection '{collection}'")


def _check_slug(slug: str) -> None:
    if not _SLUG_RE.match(slug):
        raise HTTPException(status_code=400, detail="Invalid slug (lowercase letters, digits, hyphens)")


def _dir_for(collection: str, status: str) -> Path:
    if status == "published":
        return CONTENT_ROOT / collection
    if status == "draft":
        return DRAFTS_ROOT / collection
    if status == "archived":
        return ARCHIVED_ROOT / collection
    raise HTTPException(status_code=400, detail=f"Invalid status '{status}'")


def _find(collection: str, slug: str) -> tuple[Path, str] | None:
    for status in STATUSES:
        p = _dir_for(collection, status) / f"{slug}.json"
        if p.exists():
            return p, status
    return None


def _validate(collection: str, data: dict) -> dict:
    model = COLLECTION_MAP[collection]
    try:
        parsed = model(**data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Schema validation failed: {e}") from e
    return parsed.model_dump(mode="json")


def _write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _enforce_single_featured(collection: str, keep_slug: str) -> None:
    """Only one resume may be featured — clear the flag on every other file
    (across published/draft/archived) when `keep_slug` is set featured."""
    if collection != "resumes":
        return
    for status in STATUSES:
        d = _dir_for(collection, status)
        if not d.exists():
            continue
        for f in d.glob("*.json"):
            if f.stem == keep_slug:
                continue
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            if data.get("featured"):
                data["featured"] = False
                _write(f, data)


def _reload() -> None:
    registry.load_all()


class ContentPayload(BaseModel):
    data: dict
    status: str = "draft"


# ---------------------------------------------------------------- overview

@router.get("/overview", dependencies=[Depends(require_admin)])
async def overview() -> dict:
    counts = {}
    recent = []
    for collection in COLLECTION_MAP:
        published = len(registry.list(collection))
        draft_dir = DRAFTS_ROOT / collection
        archived_dir = ARCHIVED_ROOT / collection
        drafts = len(list(draft_dir.glob("*.json"))) if draft_dir.exists() else 0
        archived = len(list(archived_dir.glob("*.json"))) if archived_dir.exists() else 0
        counts[collection] = {"published": published, "drafts": drafts, "archived": archived}
        for status, d in (("published", CONTENT_ROOT / collection), ("draft", draft_dir)):
            if d.exists():
                for f in d.glob("*.json"):
                    recent.append({
                        "collection": collection,
                        "slug": f.stem,
                        "status": status,
                        "updated_at": f.stat().st_mtime,
                    })
    recent.sort(key=lambda r: -r["updated_at"])
    return {"counts": counts, "recent": recent[:12]}


# ---------------------------------------------------------------- site singleton

@router.get("/site", dependencies=[Depends(require_admin)])
async def get_site_raw() -> dict:
    return json.loads((CONTENT_ROOT / "site.json").read_text(encoding="utf-8"))


@router.put("/site", dependencies=[Depends(require_admin)])
async def put_site(data: dict) -> dict:
    try:
        parsed = Site(**data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Schema validation failed: {e}") from e
    _write(CONTENT_ROOT / "site.json", parsed.model_dump(mode="json"))
    _reload()
    return {"ok": True}


# ---------------------------------------------------------------- content CRUD

@router.get("/content/{collection}", dependencies=[Depends(require_admin)])
async def admin_list(collection: str) -> dict:
    _check_collection(collection)
    items = []
    for status in STATUSES:
        d = _dir_for(collection, status)
        if not d.exists():
            continue
        for f in sorted(d.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                data = {"slug": f.stem, "_corrupt": True}
            items.append({
                "slug": data.get("slug", f.stem),
                "title": data.get("title") or data.get("name") or data.get("role") or f.stem,
                "status": status,
                "updated_at": f.stat().st_mtime,
            })
    return {"items": items}


@router.get("/content/{collection}/{slug}", dependencies=[Depends(require_admin)])
async def admin_get(collection: str, slug: str) -> dict:
    _check_collection(collection)
    found = _find(collection, slug)
    if not found:
        raise HTTPException(status_code=404, detail="Not found")
    path, status = found
    return {"data": json.loads(path.read_text(encoding="utf-8")), "status": status}


@router.post("/content/{collection}", dependencies=[Depends(require_admin)])
async def admin_create(collection: str, payload: ContentPayload) -> dict:
    _check_collection(collection)
    data = _validate(collection, payload.data)
    slug = data.get("slug", "")
    _check_slug(slug)
    if _find(collection, slug):
        raise HTTPException(status_code=409, detail=f"'{slug}' already exists")
    _write(_dir_for(collection, payload.status) / f"{slug}.json", data)
    if data.get("featured"):
        _enforce_single_featured(collection, slug)
    if payload.status == "published":
        _reload()
    logger.info("admin.create %s/%s status=%s", collection, slug, payload.status)
    return {"ok": True, "slug": slug, "status": payload.status}


@router.put("/content/{collection}/{slug}", dependencies=[Depends(require_admin)])
async def admin_update(collection: str, slug: str, payload: ContentPayload) -> dict:
    _check_collection(collection)
    found = _find(collection, slug)
    if not found:
        raise HTTPException(status_code=404, detail="Not found")
    old_path, old_status = found
    data = _validate(collection, payload.data)
    new_slug = data.get("slug", slug)
    _check_slug(new_slug)
    new_status = payload.status if payload.status in STATUSES else old_status
    new_path = _dir_for(collection, new_status) / f"{new_slug}.json"
    if (new_slug != slug or new_status != old_status) and new_path.exists():
        raise HTTPException(status_code=409, detail="Target slug/status already exists")
    _write(new_path, data)
    if new_path != old_path and old_path.exists():
        old_path.unlink()
    if data.get("featured"):
        _enforce_single_featured(collection, new_slug)
    if "published" in (old_status, new_status):
        _reload()
    logger.info("admin.update %s/%s -> %s status=%s", collection, slug, new_slug, new_status)
    return {"ok": True, "slug": new_slug, "status": new_status}


@router.post("/content/{collection}/{slug}/status", dependencies=[Depends(require_admin)])
async def admin_set_status(collection: str, slug: str, body: dict) -> dict:
    """Move an item between published / draft / archived."""
    _check_collection(collection)
    target = body.get("status")
    if target not in STATUSES:
        raise HTTPException(status_code=400, detail="status must be published|draft|archived")
    found = _find(collection, slug)
    if not found:
        raise HTTPException(status_code=404, detail="Not found")
    path, current = found
    if current == target:
        return {"ok": True, "status": current}
    data = _validate(collection, json.loads(path.read_text(encoding="utf-8")))
    _write(_dir_for(collection, target) / f"{slug}.json", data)
    path.unlink()
    _reload()
    logger.info("admin.status %s/%s %s->%s", collection, slug, current, target)
    return {"ok": True, "status": target}


@router.delete("/content/{collection}/{slug}", dependencies=[Depends(require_admin)])
async def admin_delete(collection: str, slug: str) -> dict:
    _check_collection(collection)
    found = _find(collection, slug)
    if not found:
        raise HTTPException(status_code=404, detail="Not found")
    path, status = found
    path.unlink()
    if status == "published":
        _reload()
    logger.info("admin.delete %s/%s status=%s", collection, slug, status)
    return {"ok": True}


# ---------------------------------------------------------------- media library

_SAFE_NAME_RE = re.compile(r"[^a-zA-Z0-9._-]")


def _kind_for(ext: str) -> str:
    if ext in VIDEO_EXT:
        return "video"
    if ext in IMAGE_EXT:
        return "image"
    return "doc"


def _resolve_upload_path(url: str) -> Path:
    """Resolve a /uploads/... URL to a real path, guarding against traversal."""
    rel = url.split("/uploads/", 1)[-1].lstrip("/")
    if ".." in rel or rel.startswith(("/", "\\")):
        raise HTTPException(status_code=400, detail="Invalid path")
    target = (UPLOADS_DIR / rel).resolve()
    if not str(target).startswith(str(UPLOADS_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid path")
    return target


@router.get("/media", dependencies=[Depends(require_admin)])
async def media_list(category: str | None = None) -> dict:
    """List every uploaded file across category folders (and legacy root)."""
    UPLOADS_DIR.mkdir(exist_ok=True)
    wanted = _safe_category(category) if category else None
    files = []
    # Category folders
    for cat in MEDIA_CATEGORIES:
        if cat == "other":
            continue
        d = UPLOADS_DIR / cat
        if not d.exists():
            continue
        for f in d.glob("*"):
            if f.is_file():
                ext = f.suffix.lower()
                files.append({
                    "name": f.name, "category": cat, "kind": _kind_for(ext),
                    "url": f"/uploads/{cat}/{f.name}", "size": f.stat().st_size,
                    "updated_at": f.stat().st_mtime,
                })
    # Legacy files in uploads root → category "other"
    for f in UPLOADS_DIR.glob("*"):
        if f.is_file():
            ext = f.suffix.lower()
            files.append({
                "name": f.name, "category": "other", "kind": _kind_for(ext),
                "url": f"/uploads/{f.name}", "size": f.stat().st_size,
                "updated_at": f.stat().st_mtime,
            })
    if wanted:
        files = [f for f in files if f["category"] == wanted]
    files.sort(key=lambda f: -f["updated_at"])
    return {"files": files, "categories": [c for c in MEDIA_CATEGORIES if c != "other"]}


@router.post("/media", dependencies=[Depends(require_admin)])
async def media_upload(file: UploadFile, category: str | None = None) -> dict:
    """Upload into uploads/{category}/. Returns the stored URL (admins never type URLs)."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_UPLOAD_EXT:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed")
    content = await file.read()
    limit = _max_bytes_for(ext)
    if len(content) > limit:
        raise HTTPException(status_code=413, detail=f"File too large (max {limit // (1024 * 1024)} MB)")
    cat = _safe_category(category)
    base = _SAFE_NAME_RE.sub("-", Path(file.filename).stem)[:60] or "file"
    name = f"{base}-{secrets.token_hex(4)}{ext}"
    dest_dir = UPLOADS_DIR / cat
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / name).write_bytes(content)
    url = f"/uploads/{cat}/{name}"
    logger.info("admin.media_upload %s (%d bytes)", url, len(content))
    return {"name": name, "category": cat, "kind": _kind_for(ext), "url": url, "size": len(content)}


@router.delete("/media", dependencies=[Depends(require_admin)])
async def media_delete(url: str) -> dict:
    """Delete by its /uploads/... URL (traversal-guarded)."""
    path = _resolve_upload_path(url)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    path.unlink()
    return {"ok": True}
