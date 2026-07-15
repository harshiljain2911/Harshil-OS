# Content Guide

All site content is **JSON on disk** under `backend/content/`, validated by Pydantic models in `backend/models.py`. You can edit it through the admin panel (recommended) or directly in the files.

## Layout

```
backend/content/
├── site.json            # singleton: identity, hero, nav, contact, seo, ai, narrative
├── projects/<slug>.json
├── domains/<slug>.json
├── experience/<slug>.json
├── certifications/<slug>.json
├── achievements/<slug>.json
├── blog/<slug>.json
├── timeline/<slug>.json
├── research/<slug>.json
├── resumes/<slug>.json
├── drafts/              # not shown publicly
└── archived/            # retired items
```

Each collection maps to a schema via `COLLECTION_MAP` in `models.py`. The filename (slug) is the item's URL key.

## Rules

1. **Schema-validated.** Every file must satisfy its model. Invalid content **fails backend boot**, so problems are caught immediately rather than in production.
2. **Slugs are identity.** `projects/my-thing.json` is served at `/projects/my-thing` and cited by the assistant as such.
3. **UTF-8 always.** Keep files UTF-8 (em-dashes, symbols). If editing outside the admin, ensure your editor writes UTF-8.
4. **Media by reference.** Point image/PDF fields at uploaded files (e.g. `/uploads/...`), managed via the admin Media library.

## Adding an item (via admin)

1. Open the collection → **New**.
2. Fill the schema-driven form; save as **draft** or **publish**.
3. Published items appear on the site and become retrievable by the assistant instantly.

## Adding an item (by hand)

1. Create `backend/content/<collection>/<slug>.json` matching the schema.
2. Restart the backend (or trigger a reload via the admin) so it validates and loads.
3. If it's malformed, the boot log tells you exactly which field failed.

## The site singleton

`site.json` holds cross-cutting settings: identity/headline, hero copy, navigation, contact info, SEO/meta, footer, brand narrative, and the `ai` block (provider/model/fallback preferences). Edit it under **Admin → Site**.

## Assistant grounding

Because retrieval runs over these same files, **what you publish is what the assistant knows.** No separate knowledge base to maintain.
