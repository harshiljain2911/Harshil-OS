# Admin Guide

The admin panel is a private area for managing all site content, media, and AI settings. It is deliberately excluded from navigation, sitemap, and prerendering.

## Access

1. Go to `/admin` (redirects to `/admin/login`).
2. Enter the `ADMIN_PASSWORD` from `backend/.env`.
3. On success you receive a signed session token (stored client-side) valid for a limited time. Use **Sign out** to end it.

> Login is rate-limited (5/min). Choose a strong `ADMIN_PASSWORD` and a long random `ADMIN_JWT_SECRET`.

## Sections

### Dashboard
Overview and quick links.

### Site
Edit the `site.json` singleton — identity/headline, hero, navigation, contact details, SEO, footer, and narrative/brand voice.

### Media
Upload and browse images, resume PDFs, and other assets (organized by folder). Files are stored under `backend/uploads/` and referenced from content by URL. Use the picker inside content editors to attach media.

### AI Providers (AI Settings)
Manage the assistant's providers and models:

- **Status** — each provider shows **ACTIVE** (key present) or **DISABLED** (no key), with the **current** provider tagged.
- **Fallback order** — the numbered sequence requests try (provider 1 → 2 → 3 …).
- **Test providers** — runs a live 1-token probe against each provider so you can tell "key present" from "actually works" (e.g. billing/quota/validity). Failures show the real reason.
- **Model** — pick a per-provider model from presets (or leave default).
- **Preferred provider** — "Auto + fallback" (recommended) or pin one (it still falls back on failure).

Changes take effect immediately — no restart.

### Collections
CRUD for each content collection — **Projects, Domains, Experience, Certifications, Achievements, Timeline, Blog, Research** — plus **Resume Management**. Forms are generated from the Pydantic schema, so fields and validation always match the backend. Items support **draft** and **archived** states.

## How editing works

The admin writes JSON files under `backend/content/`, re-validates them against the schema, and reloads the in-memory registry. Because content is the source of truth for both the site *and* the AI assistant, published changes are reflected everywhere instantly — no rebuild, no re-index.

## Safety

- All admin routes require the session token (`require_admin`).
- Invalid edits are rejected by schema validation before they are written.
- API keys are never returned to the browser — only presence booleans and probe results.
