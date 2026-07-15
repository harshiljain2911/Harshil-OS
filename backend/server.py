from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler  # noqa: F401
from slowapi.errors import RateLimitExceeded

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Load + validate all content on boot (fail-to-boot per charter §14)
from content_loader import registry  # noqa: E402
registry.load_all()

from routers.admin_routes import UPLOADS_DIR  # noqa: E402
from routers.admin_routes import router as admin_router  # noqa: E402
from routers.assistant_routes import limiter as assistant_limiter  # noqa: E402
from routers.assistant_routes import router as assistant_router  # noqa: E402
from routers.contact_routes import router as contact_router  # noqa: E402
from routers.content_routes import router as content_router  # noqa: E402
from routers.github_routes import router as github_router  # noqa: E402
from routers.og_routes import router as og_router  # noqa: E402
from routers.seo_routes import router as seo_router  # noqa: E402
from models import COLLECTION_MAP  # noqa: E402

app = FastAPI(title="Harshil OS API")
app.state.limiter = assistant_limiter


async def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "error": "throttled",
            "detail": "Assistant is temporarily busy. Please try again shortly.",
        },
    )


app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root() -> dict[str, str]:
    return {"service": "harshil-os", "status": "ok"}


@api_router.get("/health")
async def health() -> dict[str, object]:
    return {
        "ok": True,
        "collections": {c: len(registry.list(c)) for c in registry.collections()},
    }


@api_router.get("/schemas")
async def get_schemas() -> dict[str, dict]:
    return {name: model.model_json_schema() for name, model in COLLECTION_MAP.items()}


api_router.include_router(content_router)
api_router.include_router(contact_router)
api_router.include_router(og_router)
api_router.include_router(seo_router)
api_router.include_router(assistant_router)
api_router.include_router(github_router)
api_router.include_router(admin_router)

app.include_router(api_router)

# Media library files (uploaded via the admin panel) — public read-only.
UPLOADS_DIR.mkdir(exist_ok=True)
from starlette.staticfiles import StaticFiles  # noqa: E402
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
