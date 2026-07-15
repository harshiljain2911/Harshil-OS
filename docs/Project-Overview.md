# Project Overview

**Harshil/OS** is a full-stack personal engineering portfolio built as a small production platform. Instead of a hand-edited static site, it treats content as data: JSON files validated by a schema, edited through an admin panel, served by a FastAPI backend, and rendered by a React frontend — with an AI assistant that answers questions grounded in that same content.

## Goals

- **Content as data.** Everything shown on the site is JSON that a non-developer can edit safely through the admin.
- **A real backend.** Not a toy — schema validation, auth, rate limiting, email, and external integrations.
- **A useful AI assistant.** Grounded in the portfolio, conversational, and resilient (multi-provider fallback).
- **Deployable.** Clear separation of frontend/backend, environment templates, and deployment guides.

## The two "modes"

The portfolio presents itself through framing modes that reuse the same content:

- **Recruiter Mode** — impact- and outcome-focused framing for hiring contexts.
- **Developer Mode** — an "engineering notebook" emphasizing how systems are built, documented, and kept maintainable.

## Who it's for

- **Visitors / recruiters** browsing the work, asking the assistant questions, downloading a resume, or sending a message.
- **The owner** editing content, media, and AI settings through the admin — no redeploy required for content changes.
- **Developers** who want to fork a content-driven portfolio with a proper backend.

## Related docs

- [Architecture](Architecture.md) — how the pieces fit together.
- [Folder Structure](Folder-Structure.md) — where everything lives.
- [Admin Guide](Admin-Guide.md) — running the admin panel.
- [Content Guide](Content-Guide.md) — editing content collections.
- [AI Assistant](AI-Assistant.md) — providers, fallback, and grounding.
- [Deployment](Deployment.md) — shipping to production.
