from __future__ import annotations

from fastapi import APIRouter, HTTPException

from content_loader import depth_score, domain_depth_score, registry
from models import COLLECTION_MAP

router = APIRouter(prefix="/content", tags=["content"])


@router.get("/collections")
async def list_collections() -> dict[str, list[str]]:
    return {"collections": registry.collections()}


@router.get("/site")
async def get_site() -> dict:
    return registry.site()


# Universal search across every published collection + site education.
# Declared before /{collection} so "search" is never treated as a collection.
_SEARCH_SOURCES = {
    "projects": (["title", "subtitle", "summary", "stack", "tags"], lambda i: f"/projects/{i['slug']}"),
    "domains": (["name", "tagline", "overview", "skills", "technologies"], lambda i: f"/domains/{i['slug']}"),
    "blog": (["title", "subtitle", "tags", "body_md"], lambda i: f"/blog/{i['slug']}"),
    "certifications": (["title", "issuer", "skills"], lambda i: "/certifications"),
    "experience": (["role", "org", "summary", "stack"], lambda i: "/experience"),
    "timeline": (["title", "summary"], lambda i: "/timeline"),
    "achievements": (["title", "summary"], lambda i: "/achievements"),
}


@router.get("/search")
async def search(q: str = "") -> dict:
    query = q.strip().lower()
    if len(query) < 2:
        return {"results": []}
    tokens = [t for t in query.split() if len(t) > 1]
    results = []

    def blob_score(blob: str) -> int:
        b = blob.lower()
        return (2 if query in b else 0) + sum(1 for t in tokens if t in b)

    for kind, (fields, path_fn) in _SEARCH_SOURCES.items():
        for item in registry.list(kind):
            parts = []
            for f in fields:
                v = item.get(f)
                parts.append(" ".join(v) if isinstance(v, list) else str(v or ""))
            blob = " ".join(parts)
            s = blob_score(blob)
            if s > 0:
                results.append({
                    "score": s,
                    "kind": kind,
                    "title": item.get("title") or item.get("name") or item.get("role") or item["slug"],
                    "subtitle": (item.get("subtitle") or item.get("issuer") or item.get("org")
                                 or item.get("tagline") or item.get("summary") or "")[:110],
                    "path": path_fn(item),
                })

    for e in registry.site().get("education", []):
        blob = " ".join(str(x) for x in [e.get("school"), e.get("degree"), e.get("field"),
                                         e.get("summary"), " ".join(e.get("coursework") or [])] if x)
        s = blob_score(blob)
        if s > 0:
            results.append({
                "score": s, "kind": "education",
                "title": f"{e.get('degree')} — {e.get('school')}",
                "subtitle": (e.get("summary") or "")[:110],
                "path": "/education",
            })

    results.sort(key=lambda r: -r["score"])
    for r in results:
        r.pop("score")
    return {"results": results[:20]}


@router.get("/{collection}")
async def list_items(collection: str) -> dict[str, list[dict]]:
    if collection not in COLLECTION_MAP:
        raise HTTPException(status_code=404, detail=f"Unknown collection '{collection}'")
    items = list(registry.list(collection))
    if collection == "projects":
        items = sorted(items, key=lambda p: (-depth_score(p), -p["year"], p["slug"]))
        for p in items:
            p["_depth_score"] = depth_score(p)
    elif collection == "domains":
        # Ranked purely by linked evidence (projects, certifications, research,
        # experience, achievements, blog posts) — no manual flag, and the score
        # itself is never attached to the response, only used to order it.
        items = sorted(items, key=lambda d: -domain_depth_score(d["slug"]))
    elif collection == "timeline":
        items = sorted(items, key=lambda t: t["date"], reverse=True)
    elif collection == "blog":
        items = sorted(items, key=lambda b: b["published_at"], reverse=True)
    elif collection == "achievements":
        items = sorted(items, key=lambda a: a["date"], reverse=True)
    elif collection == "experience":
        items = sorted(items, key=lambda e: e["start"], reverse=True)
    elif collection == "certifications":
        items = sorted(items, key=lambda c: c["issued_at"], reverse=True)
    elif collection == "resumes":
        # Featured first, then most-recently-updated (stable two-pass sort).
        items = sorted(items, key=lambda r: r.get("updated_at", ""), reverse=True)
        items = sorted(items, key=lambda r: 0 if r.get("featured") else 1)
    return {"items": items}


@router.get("/{collection}/{slug}")
async def get_item(collection: str, slug: str) -> dict:
    if collection not in COLLECTION_MAP:
        raise HTTPException(status_code=404, detail=f"Unknown collection '{collection}'")
    item = registry.get(collection, slug)
    if not item:
        raise HTTPException(status_code=404, detail=f"'{slug}' not found in {collection}")
    if collection == "projects":
        item["_depth_score"] = depth_score(item)
    return item
