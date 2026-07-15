from __future__ import annotations

import os
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse, Response

from content_loader import registry

router = APIRouter(tags=["seo"])

SITE_URL = os.environ.get("SITE_PUBLIC_URL", "").rstrip("/")


def _site() -> str:
    return SITE_URL or ""


@router.get("/robots.txt", response_class=PlainTextResponse)
async def robots() -> str:
    site = _site()
    lines = [
        "User-agent: *",
        "Disallow: /admin",
        "Allow: /",
        f"Sitemap: {site}/api/sitemap.xml" if site else "Sitemap: /api/sitemap.xml",
    ]
    return "\n".join(lines) + "\n"


@router.get("/sitemap.xml")
async def sitemap() -> Response:
    site = _site()
    urls: list[str] = [
        "/", "/about", "/domains", "/projects", "/resume", "/education",
        "/experience", "/achievements", "/certifications", "/timeline",
        "/blog", "/recruiter", "/developer", "/contact",
    ]
    for d in registry.list("domains"):
        urls.append(f"/domains/{d['slug']}")
    for p in registry.list("projects"):
        urls.append(f"/projects/{p['slug']}")
    for b in registry.list("blog"):
        urls.append(f"/blog/{b['slug']}")

    body_parts = ['<?xml version="1.0" encoding="UTF-8"?>',
                  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        loc = f"{site}{u}" if site else u
        body_parts.append(f"  <url><loc>{loc}</loc></url>")
    body_parts.append("</urlset>")
    return Response(content="\n".join(body_parts), media_type="application/xml")
