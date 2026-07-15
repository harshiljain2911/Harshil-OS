"""
GitHub live repo cards — Developer Mode (§2.12).

Fetches public repo data for the configured GitHub user, caches to Mongo for 1 hour.
Falls back to an empty list on network failure so the UI can show its placeholders.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any, List

import httpx
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger("github")

router = APIRouter(prefix="/github", tags=["github"])

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=2000)
_db = _client[os.environ["DB_NAME"]]

CACHE_TTL_SECONDS = 3600

# In-process cache so live repos work even when MongoDB is unavailable.
_MEM_CACHE: dict[str, Any] = {"user": None, "repos": [], "at": None}


async def _fetch_repos(user: str) -> List[dict]:
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "harshil-os"}
    async with httpx.AsyncClient(timeout=8.0) as http:
        r = await http.get(
            f"https://api.github.com/users/{user}/repos",
            params={"sort": "updated", "per_page": 8, "type": "owner"},
            headers=headers,
        )
        if r.status_code != 200:
            logger.warning("github.fetch %s -> %s", user, r.status_code)
            return []
        data = r.json()
    return [
        {
            "slug": repo["name"],
            "title": repo["name"],
            "desc": repo.get("description") or "(no description)",
            "stars": repo.get("stargazers_count", 0),
            "url": repo.get("html_url"),
            "language": repo.get("language"),
            "topics": repo.get("topics", []) or [],
            "updated_at": repo.get("pushed_at"),
        }
        for repo in data
        if not repo.get("fork")
    ][:6]


@router.get("/repos")
async def get_repos() -> dict[str, Any]:
    user = os.environ.get("PORTFOLIO_GITHUB_USER", "").strip()
    if not user:
        return {"user": None, "repos": [], "cached_at": None}

    now = datetime.now(timezone.utc)

    # 1. In-process cache (works with or without Mongo).
    if (_MEM_CACHE["user"] == user and _MEM_CACHE["at"]
            and (now - _MEM_CACHE["at"]).total_seconds() < CACHE_TTL_SECONDS):
        return {"user": user, "repos": _MEM_CACHE["repos"], "cached_at": _MEM_CACHE["at"].isoformat()}

    # 2. Optional Mongo cache (skipped gracefully if unavailable).
    try:
        cache = await _db.github_cache.find_one({"user": user})
        if cache and cache.get("cached_at"):
            cached_at = cache["cached_at"]
            if isinstance(cached_at, str):
                cached_at = datetime.fromisoformat(cached_at.replace("Z", "+00:00"))
            if cached_at.tzinfo is None:
                cached_at = cached_at.replace(tzinfo=timezone.utc)
            if now - cached_at < timedelta(seconds=CACHE_TTL_SECONDS):
                _MEM_CACHE.update(user=user, repos=cache.get("repos", []), at=cached_at)
                return {"user": user, "repos": cache.get("repos", []), "cached_at": cached_at.isoformat()}
    except Exception:
        logger.info("github.cache_unavailable — fetching live")

    # 3. Live fetch from GitHub.
    repos = await _fetch_repos(user)
    if repos:
        _MEM_CACHE.update(user=user, repos=repos, at=now)
        try:
            await _db.github_cache.update_one(
                {"user": user},
                {"$set": {"user": user, "repos": repos, "cached_at": now.isoformat()}},
                upsert=True,
            )
        except Exception:
            pass
    return {"user": user, "repos": repos, "cached_at": now.isoformat()}
