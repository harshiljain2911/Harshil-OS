# Architecture

## High-level

```
Frontend (React 19, CRA/CRACO)  ──HTTPS /api──►  Backend (FastAPI)
      React Query cache                               │
                                                      ├── content/*.json  (source of truth)
                                                      ├── MongoDB          (optional; submissions)
                                                      └── External APIs    (AI providers, Resend, GitHub)
```

The system is split into a **stateless React SPA** and a **FastAPI backend** exposed entirely under `/api`. The backend's authority is a set of **JSON content files**; everything else (assistant retrieval, admin editing, SEO) is built on top of them.

## Backend

`server.py` mounts one `APIRouter(prefix="/api")` and includes:

| Router | Responsibility |
|---|---|
| `content_routes` | Read content collections + schemas for the frontend/admin |
| `assistant_routes` | Grounded RAG assistant, SSE streaming, multi-provider fallback |
| `contact_routes` | Contact form: validation, honeypot, rate limit, Resend, file fallback |
| `github_routes` | Live GitHub repositories (cached) |
| `admin_routes` | Auth, content CRUD, media library, AI provider management |
| `seo_routes` / `og_routes` | Sitemap/robots and Open Graph responses |

### Content as data

- Content lives in `backend/content/<collection>/*.json` plus a `site.json` singleton.
- `models.py` defines a Pydantic model per collection and a `COLLECTION_MAP`.
- On boot, every file is validated. **Invalid content fails the boot** — bad data never reaches production.
- `content_loader.py` exposes an in-memory registry the routers read from; the admin re-loads it after writes, so changes are live without a restart.

### AI assistant (RAG)

1. **Retrieve** — keyword scoring over content fields returns the top-N relevant items.
2. **Ground** — those items are formatted into a `CONTEXT` block with numbered citations.
3. **Generate** — the context + conversation history + a first-person system prompt are streamed to an LLM over SSE (`citations → delta* → done`).
4. **Fallback** — providers are tried in order (OpenRouter → OpenAI → Gemini → Anthropic). A provider that fails *before the first token* is skipped and marked unhealthy (short cooldown); if all fail, a retrieval-only answer is returned. Visitors never see provider errors.

See [AI-Assistant.md](AI-Assistant.md).

### Security

- API keys live only in `backend/.env`; the admin status endpoint returns booleans, never key values.
- All provider/email calls are server-side.
- Rate limiting via `slowapi`: assistant (10/min, 60/hr), contact (5/hr, 3/min), admin login (5/min).
- Admin auth uses an HMAC-signed token; protected routes depend on `require_admin`.

## Frontend

- **Routing** with React Router 7; page transitions via Framer Motion.
- **Data** via TanStack Query against `/api/content/*` with caching.
- **Layout** — the shell is one viewport tall with two independent scroll containers (portfolio + assistant), ChatGPT-style, so opening the assistant pushes content instead of covering it.
- **Performance** — `react-snap` prerenders routes at build; the PDF engine (`react-pdf`) is a lazy chunk loaded only when a resume opens.
- **Design system** — Tailwind tokens encode the black/orange industrial theme; components live under `src/components/*`.

## Data flow (example: viewing a project)

```
Browser → GET /api/content/projects → content_loader registry → JSON
        → React Query cache → Projects page renders cards
Assistant question → retrieve(projects, …) → LLM (grounded) → streamed answer + citations linking back to /projects/<slug>
```
