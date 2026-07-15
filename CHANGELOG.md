# Changelog

All notable changes to this project are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-07-15

First public release. 🎉

### Added
- **"Operating System" portfolio UI** — black/orange industrial design language, boot-sequence hero, keyboard terminal (`⌘/Ctrl+K`), and universal search (`⌘/Ctrl+/`).
- **Headless JSON CMS** — content collections (projects, domains, experience, certifications, achievements, blog, timeline, resumes) as schema-validated JSON; the backend refuses to boot on invalid content.
- **Admin panel** — token auth, schema-driven CRUD, drafts/archive, media library, and AI provider management.
- **Grounded AI assistant** — retrieval over live content, SSE streaming, first-person voice, conversation memory, citations, suggested follow-ups, and independent (ChatGPT-style) scrolling.
- **Multi-provider AI with automatic fallback** — OpenRouter → OpenAI → Gemini → Anthropic, with a circuit-breaker cooldown and a live health probe in the admin. Provider errors never reach visitors.
- **Production contact form** — validation, honeypot, rate limiting, Resend email delivery, and a durable file fallback.
- **Live GitHub repositories** on the Developer page.
- **Resume system** — lazy-loaded in-browser PDF viewer (zoom/fit/print/download) and per-domain resume variants.
- **Recruiter** and **Developer** framing modes.
- Route prerendering (`react-snap`), lazy PDF chunk, and a responsive/accessibility pass.
- Full documentation set (`docs/`), environment templates, and deployment guides.

### Known issues
- LLM generation requires a **valid and funded** provider key. With no working key, the assistant runs in grounded retrieval mode. Configure/verify under **Admin → AI Providers → Test providers**.
- Media uploaded through the admin in production needs a persistent disk or object storage; ephemeral hosts reset the filesystem on redeploy.

### Roadmap
See the roadmap section in the [README](README.md).
