# AI Assistant

The assistant ("Ask the OS") answers visitor questions **grounded in the portfolio content**, in the first person, with streaming responses, conversation memory, citations, and automatic fallback across AI providers.

## How it works

1. **Retrieve** — for each question, keyword scoring over content fields (projects, domains, experience, certifications, blog, timeline, achievements, plus the site identity) returns the top relevant items.
2. **Ground** — those items become a numbered `CONTEXT` block.
3. **Generate** — context + recent conversation history + a first-person system prompt are sent to an LLM and streamed back over Server-Sent Events: `citations → delta* → done`.
4. **Cite** — the panel renders citation chips linking to the source pages.

If no LLM is available, it returns a **retrieval-only** answer (still first-person, still cited) so it's never dead.

## Providers & fallback

Configured entirely by environment keys in `backend/.env`. Detection accepts the standard names (and a couple of tolerant aliases):

| Provider | Env var(s) |
|---|---|
| OpenRouter | `OPENROUTER_API_KEY` |
| OpenAI | `OPENAI_API_KEY` (or `OPEN_AI_API_KEY`) |
| Gemini | `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) |
| Anthropic | `ANTHROPIC_API_KEY` |

**Fallback order:** OpenRouter → OpenAI → Gemini → Anthropic (only providers with a key are tried). A provider that fails *before streaming a token* is skipped and put on a short cooldown (circuit breaker); the next provider is tried automatically. **Provider errors are logged internally and never shown to visitors.**

You can pin a preferred provider in **Admin → AI Providers** (it still falls back), and set a per-provider model.

> **Keys must be valid _and_ funded** for live generation. A key can be *present* (shows ACTIVE) but still fail at request time (e.g. `429 insufficient_quota`, `401`, invalid). Use **Test providers** in the admin to see real health.

## Models

Sensible defaults per provider, with presets selectable in the admin:

- OpenRouter: `anthropic/claude-sonnet-4` (default), `openai/gpt-5`, `google/gemini-2.5-pro`
- OpenAI: `gpt-4o-mini` (default), `gpt-4o`, `gpt-4.1-mini`, `gpt-4.1`, `gpt-5-mini`
- Gemini: `gemini-2.0-flash` (default), `gemini-2.5-flash`, `gemini-2.5-pro`
- Anthropic: `claude-sonnet-4` (default), `claude-3-5-sonnet-latest`

## Voice & behavior

- **First person** — speaks as Harshil ("I built…", "my goal…"), never third person.
- **Conversational** — synthesizes rather than dumping raw sections; asks follow-ups; recommends projects/domains based on who's asking.
- **Memory** — keeps recent turns per session so follow-ups like "why that one?" work.

Tune all of this in `SYSTEM_PROMPT` inside `backend/routers/assistant_routes.py`.

## Rate limiting & cost

Per-IP limits (10/min, 60/hr) protect against abuse and runaway cost. Responses are capped in length.
