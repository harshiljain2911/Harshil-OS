"""
Boot-time content loader.

- Reads every JSON file under content/{collection}/
- Validates against the corresponding Pydantic model
- Raises loudly on the FIRST schema violation (fail-to-boot per charter §14)
- Exposes the parsed collections as an in-memory registry
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from models import COLLECTION_MAP, Site

logger = logging.getLogger(__name__)

CONTENT_ROOT = Path(__file__).parent / "content"
SITE_PATH = CONTENT_ROOT / "site.json"


class ContentRegistry:
    def __init__(self) -> None:
        self._by_collection: dict[str, list[dict[str, Any]]] = {}
        self._by_slug: dict[str, dict[str, dict[str, Any]]] = {}
        self._site: dict[str, Any] = {}

    def load_all(self) -> None:
        for collection, model in COLLECTION_MAP.items():
            dir_path = CONTENT_ROOT / collection
            items: list[dict[str, Any]] = []
            seen_slugs: set[str] = set()
            if dir_path.exists():
                for f in sorted(dir_path.glob("*.json")):
                    try:
                        raw = json.loads(f.read_text(encoding="utf-8"))
                    except json.JSONDecodeError as e:
                        raise RuntimeError(
                            f"[content] {collection}/{f.name}: invalid JSON — {e}"
                        ) from e
                    try:
                        parsed = model(**raw)
                    except Exception as e:
                        raise RuntimeError(
                            f"[content] {collection}/{f.name}: schema violation — {e}"
                        ) from e
                    data = parsed.model_dump(mode="json")
                    slug = data.get("slug")
                    if not slug:
                        raise RuntimeError(f"[content] {collection}/{f.name}: missing slug")
                    if slug in seen_slugs:
                        raise RuntimeError(
                            f"[content] {collection}: duplicate slug '{slug}'"
                        )
                    seen_slugs.add(slug)
                    items.append(data)
            self._by_collection[collection] = items
            self._by_slug[collection] = {i["slug"]: i for i in items}
            logger.info("[content] loaded %d %s", len(items), collection)
        self._load_site()

    def _load_site(self) -> None:
        if not SITE_PATH.exists():
            raise RuntimeError("[content] site.json missing — this is the site-wide singleton")
        try:
            raw = json.loads(SITE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            raise RuntimeError(f"[content] site.json: invalid JSON — {e}") from e
        try:
            parsed = Site(**raw)
        except Exception as e:
            raise RuntimeError(f"[content] site.json: schema violation — {e}") from e
        self._site = parsed.model_dump(mode="json")
        logger.info("[content] loaded site singleton")

    def list(self, collection: str) -> list[dict[str, Any]]:
        return self._by_collection.get(collection, [])

    def get(self, collection: str, slug: str) -> dict[str, Any] | None:
        return self._by_slug.get(collection, {}).get(slug)

    def collections(self) -> list[str]:
        return list(self._by_collection.keys())

    def site(self) -> dict[str, Any]:
        return self._site


registry = ContentRegistry()


def depth_score(project: dict[str, Any]) -> int:
    """§2.4 depth-score computation.

    Simple additive model over presence + richness of the deep sections.
    """
    score = 0
    for field, weight in (
        ("problem", 2),
        ("approach", 3),
        ("outcome", 2),
        ("learnings", 3),
        ("next_steps", 1),
    ):
        val = project.get(field)
        if val and isinstance(val, str) and len(val.strip()) > 40:
            score += weight
    score += min(len(project.get("metrics") or []), 5)
    score += min(len(project.get("stack") or []), 4)
    if project.get("hero_media"):
        score += 1
    if project.get("featured"):
        score += 2
    return score


def domain_depth_score(domain_slug: str) -> int:
    """Internal sort key only — never exposed via the API or rendered in the UI.

    Computed purely from how much linked evidence exists for a domain (projects,
    certifications, research, experience, achievements, blog posts), so ranking
    updates automatically as content is added. No manual `featured`/`order` flag
    exists on Domain anymore — this replaces both.
    """

    def linked(collection: str) -> list[dict[str, Any]]:
        return [
            item
            for item in registry.list(collection)
            if domain_slug in (item.get("domain_slugs") or [])
        ]

    score = sum(depth_score(p) for p in linked("projects"))
    score += len(linked("certifications")) * 3
    score += len(linked("research")) * 3
    score += len(linked("experience")) * 4
    score += len(linked("achievements")) * 2
    score += len(linked("blog")) * 1
    return score
