from __future__ import annotations

import io
from fastapi import APIRouter, Query
from fastapi.responses import Response
from PIL import Image, ImageDraw, ImageFont

from content_loader import registry

router = APIRouter(tags=["og"])

W, H = 1200, 630
BG = (10, 10, 10)
FG = (245, 245, 245)
ORANGE = (255, 79, 0)
MUTED = (170, 170, 170)
BORDER = (55, 55, 55)


def _font(size: int) -> ImageFont.ImageFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _wrap(text: str, draw: ImageDraw.ImageDraw, font: ImageFont.ImageFont, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _render(kind: str, eyebrow: str, title: str, subtitle: str | None, brand_label: str, brand_host: str) -> bytes:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([(24, 24), (W - 24, H - 24)], outline=BORDER, width=1)
    d.rectangle([(24, 24), (24 + 8, H - 24)], fill=ORANGE)

    f_eye = _font(28)
    f_title = _font(72)
    f_sub = _font(30)
    f_foot = _font(24)

    d.text((72, 88), f"{brand_label.upper()} / {kind.upper()}", font=f_eye, fill=ORANGE)
    d.text((72, 124), eyebrow.upper(), font=f_eye, fill=MUTED)

    y = 200
    for line in _wrap(title, d, f_title, W - 144)[:3]:
        d.text((72, y), line, font=f_title, fill=FG)
        y += 84

    if subtitle:
        y += 12
        for line in _wrap(subtitle, d, f_sub, W - 144)[:2]:
            d.text((72, y), line, font=f_sub, fill=MUTED)
            y += 40

    d.text((72, H - 78), f"› {brand_host}", font=f_foot, fill=MUTED)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


@router.get("/og")
async def og_image(
    type: str = Query("default"),
    slug: str | None = Query(None),
) -> Response:
    site = registry.site()
    identity = site.get("identity", {})
    brand_label = f"{identity.get('display_name', 'Harshil')} {identity.get('brand_suffix', 'OS')}"
    brand_host = f"{identity.get('brand_slug', 'harshil-os')}.dev"

    kind = type
    eyebrow = kind
    title = brand_label
    subtitle: str | None = identity.get("tagline", "An engineer's operating system")

    if type == "project" and slug:
        item = registry.get("projects", slug)
        if item:
            title = item["title"]
            subtitle = item["subtitle"]
            eyebrow = "project"
    elif type == "domain" and slug:
        item = registry.get("domains", slug)
        if item:
            title = item["name"]
            subtitle = item["tagline"]
            eyebrow = "domain"
    elif type == "blog" and slug:
        item = registry.get("blog", slug)
        if item:
            title = item["title"]
            subtitle = item.get("subtitle") or ""
            eyebrow = "blog"

    png = _render(kind, eyebrow, title, subtitle, brand_label, brand_host)
    return Response(content=png, media_type="image/png",
                    headers={"Cache-Control": "public, max-age=3600"})
