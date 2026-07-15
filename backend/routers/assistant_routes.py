"""
AI Assistant endpoint — grounded on portfolio content.

Providers (auto-detected from whichever API key is configured, or forced via
ASSISTANT_PROVIDER=anthropic|openai|gemini|openrouter):
  - Anthropic   (ANTHROPIC_API_KEY)
  - OpenAI      (OPENAI_API_KEY)
  - Google Gemini (GEMINI_API_KEY or GOOGLE_API_KEY)
  - OpenRouter  (OPENROUTER_API_KEY)

Answer paths:
 1. LLM mode: retrieval context + conversation history + streaming.
 2. Fallback mode (no key / provider failure before first token):
    retrieval-only composed answer over the same SSE protocol, so the
    assistant is always functional and never returns a dead 503.

Security & cost controls:
 - API keys never touch the frontend
 - Per-IP rate limit (slowapi); 429 → frontend renders 'throttled'
 - Abuse logging (timestamp, IP, session_id — NOT full message body)
 - In-memory session history (capped) enables follow-up questions
"""

import json
import logging
import os
import time
from collections import OrderedDict
from typing import AsyncIterator, List

import httpx
from fastapi import APIRouter, Body, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from content_loader import registry
from models import AssistantCitation, AssistantRequest, AssistantResponse

logger = logging.getLogger("assistant")

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GEMINI_URL_TMPL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={key}"

DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-4",
    "openai": "gpt-4o-mini",
    "gemini": "gemini-2.0-flash",
    "openrouter": "anthropic/claude-sonnet-4",
}
# Curated model choices surfaced in the admin AI panel (per provider). Admins can
# still type any model id; these are just convenient presets.
MODEL_OPTIONS = {
    "openrouter": ["anthropic/claude-sonnet-4", "openai/gpt-5", "google/gemini-2.5-pro"],
    "openai": ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "gpt-5-mini"],
    "gemini": ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
    "anthropic": ["claude-sonnet-4", "claude-3-5-sonnet-latest"],
}
# Fallback order: try these providers in sequence until one answers. OpenRouter
# first, then the direct providers. Only providers whose key is present are tried.
PROVIDER_PREFERENCE = ["openrouter", "openai", "gemini", "anthropic"]
# Environment variable name(s) each provider's key may be stored under. The
# second OpenAI/Gemini spellings tolerate common typos so a present key is never
# silently ignored.
_KEY_ENV = {
    "anthropic": ["ANTHROPIC_API_KEY"],
    "openai": ["OPENAI_API_KEY", "OPEN_AI_API_KEY"],
    "gemini": ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    "openrouter": ["OPENROUTER_API_KEY"],
}
MAX_TOKENS = 700
MAX_HISTORY_TURNS = 6       # question/answer pairs kept per session
MAX_SESSIONS = 500          # hard cap on tracked sessions (LRU eviction)
_PROVIDER_COOLDOWN_S = 120  # after a provider fails, skip it this long if healthier ones exist


def _api_key(provider: str) -> str | None:
    for name in _KEY_ENV.get(provider, []):
        v = os.environ.get(name)
        if v and v.strip():
            return v.strip()
    return None


def _site_ai() -> dict:
    """Admin-editable AI settings from site.json (provider/model overrides)."""
    return (registry.site() or {}).get("ai") or {}


# --------------------------------------------------- provider health (breaker)
# A provider that fails is put on a short cooldown so we don't pay a failing
# round-trip on every request while a healthy provider is available.
_provider_health: "dict[str, float]" = {}


def _mark_unhealthy(provider: str) -> None:
    _provider_health[provider] = time.monotonic() + _PROVIDER_COOLDOWN_S


def _is_healthy(provider: str) -> bool:
    return time.monotonic() >= _provider_health.get(provider, 0.0)


def _provider_order() -> list[str]:
    """Provider names to attempt, most-preferred first: a pinned/forced provider
    leads, then the standard preference order."""
    chosen = (_site_ai().get("provider") or "").strip().lower()
    forced = os.environ.get("ASSISTANT_PROVIDER", "").strip().lower()
    order: list[str] = []
    for c in (chosen, forced):
        if c and c in _KEY_ENV and c not in order:
            order.append(c)
    for name in PROVIDER_PREFERENCE:
        if name not in order:
            order.append(name)
    return order


def _provider_chain() -> list[tuple[str, str]]:
    """(provider, key) pairs to try, in fallback order. Healthy providers first;
    cooled-down ones are appended last so they're still a last resort if every
    provider is currently on cooldown."""
    healthy: list[tuple[str, str]] = []
    cooling: list[tuple[str, str]] = []
    for name in _provider_order():
        key = _api_key(name)
        if not key:
            continue
        (healthy if _is_healthy(name) else cooling).append((name, key))
    return healthy + cooling


def _provider() -> tuple[str, str] | None:
    """The provider that would handle the next request (head of the chain)."""
    chain = _provider_chain()
    return chain[0] if chain else None


def _model(provider: str) -> str:
    """Model precedence for a given provider:
    1. Per-provider override in AI Settings (site.json ai.models[provider]).
    2. Legacy single ai.model / ASSISTANT_MODEL — only when this provider is pinned.
    3. Built-in default for the provider.
    """
    site_ai = _site_ai()
    models = site_ai.get("models")
    if isinstance(models, dict):
        per = (models.get(provider) or "").strip()
        if per:
            return per
    pinned = (site_ai.get("provider") or "").strip().lower() or os.environ.get("ASSISTANT_PROVIDER", "").strip().lower()
    if provider == pinned:
        legacy = (site_ai.get("model") or "").strip() or os.environ.get("ASSISTANT_MODEL", "").strip()
        if legacy:
            return legacy
    return DEFAULT_MODELS.get(provider, "")


# ---------------------------------------------------------------- history

_history: "OrderedDict[str, list[dict]]" = OrderedDict()


def _get_history(session_id: str) -> list[dict]:
    return list(_history.get(session_id, []))


def _push_history(session_id: str, question: str, answer: str) -> None:
    turns = _history.setdefault(session_id, [])
    turns.append({"role": "user", "content": question})
    turns.append({"role": "assistant", "content": answer})
    del turns[: max(0, len(turns) - MAX_HISTORY_TURNS * 2)]
    _history.move_to_end(session_id)
    while len(_history) > MAX_SESSIONS:
        _history.popitem(last=False)


# ---------------------------------------------------------------- rate limit

def _rate_key(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    ip = xff.split(",")[0].strip() if xff else get_remote_address(request)
    return ip or "anon"


router = APIRouter(prefix="/assistant", tags=["assistant"])
limiter = Limiter(key_func=_rate_key, default_limits=["60/hour", "10/minute"])

MAX_CONTEXT_ITEMS = 6
MAX_SNIPPET_CHARS = 700


# ---------------------------------------------------------------- retrieval

def _site_pseudo_items() -> List[dict]:
    site = registry.site()
    if not site:
        return []
    identity = site.get("identity", {})
    about = site.get("about", {})
    narrative = site.get("narrative", {})
    contact = site.get("contact", {})
    items = []

    items.append({
        "slug": "about",
        "title": "Identity & Profile",
        "text": " ".join(str(x) for x in [
            identity.get("full_name"), identity.get("professional_headline"),
            identity.get("positioning_statement"), identity.get("current_status"),
            identity.get("institution"), identity.get("education_summary"),
            " ".join(identity.get("primary_focus_areas") or []),
            " ".join(identity.get("current_interests") or []),
            contact.get("email"), contact.get("location"),
        ] if x),
    })
    if about.get("bio_paragraphs"):
        items.append({"slug": "about", "title": "About / Bio", "text": " ".join(about["bio_paragraphs"])})
    if site.get("education"):
        items.append({
            "slug": "about",
            "title": "Education",
            "text": " · ".join(
                f"{e.get('degree')} {e.get('field') or ''} at {e.get('school')} — {e.get('summary') or ''}"
                for e in site["education"]
            ),
        })
    if narrative:
        items.append({
            "slug": "about",
            "title": "Mission & Values",
            "text": " ".join(str(x) for x in [
                narrative.get("career_mission"),
                narrative.get("professional_summary"),
                " ".join(f"{v.get('label')}: {v.get('evidence')}" for v in (narrative.get("core_values") or [])),
            ] if x),
        })
    return items


def _retrieve(question: str) -> List[dict]:
    q = question.lower()
    q_tokens = {t for t in q.replace(",", " ").replace("?", " ").split() if len(t) > 2}
    scored: List[tuple] = []

    def score(text: str) -> int:
        text_l = text.lower()
        return sum(1 for t in q_tokens if t in text_l)

    for kind, fields in (
        ("projects", ["title", "subtitle", "summary", "problem", "approach", "outcome", "learnings"]),
        ("domains", ["name", "tagline", "overview", "philosophy"]),
        # NOTE: "research" is intentionally not retrieved while the public
        # research section is disabled — citations must never point to a 404.
        ("blog", ["title", "subtitle", "body_md"]),
        ("experience", ["role", "org", "summary"]),
        ("achievements", ["title", "summary"]),
        ("certifications", ["title", "issuer"]),
        ("timeline", ["title", "summary"]),
    ):
        for item in registry.list(kind):
            blob = " ".join(str(item.get(f, "")) for f in fields)
            s = score(blob)
            if s > 0:
                snippet = (item.get("summary") or item.get("overview") or item.get("body_md") or blob)[:MAX_SNIPPET_CHARS]
                scored.append((s, {
                    "kind": kind,
                    "slug": item["slug"],
                    "title": item.get("title") or item.get("name") or item.get("role") or item["slug"],
                    "snippet": snippet,
                }))

    for pseudo in _site_pseudo_items():
        s = score(pseudo["text"])
        if any(t in q for t in ("who", "harshil", "cgpa", "education", "study", "student", "college", "contact", "email")):
            s += 2
        if s > 0:
            scored.append((s, {
                "kind": "site",
                "slug": pseudo["slug"],
                "title": pseudo["title"],
                "snippet": pseudo["text"][:MAX_SNIPPET_CHARS],
            }))

    scored.sort(key=lambda x: -x[0])
    seen, out = set(), []
    for _, c in scored:
        key = (c["kind"], c["slug"], c["title"])
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
        if len(out) >= MAX_CONTEXT_ITEMS:
            break
    return out


def _build_context(contexts: List[dict]) -> str:
    lines = [f"[{i}] ({c['kind']}/{c['slug']}) {c['title']}\n{c['snippet']}" for i, c in enumerate(contexts, 1)]
    return "\n\n".join(lines) if lines else "(no relevant portfolio content matched)"


SYSTEM_PROMPT = (
    "You ARE Harshil Jain, speaking through the assistant built into Harshil/OS — my personal "
    "engineering portfolio. I'm a B.Tech ECE student at LNMIIT, Jaipur working across embedded "
    "systems, software engineering, and AI. Talk to visitors as me, in the first person: \"I built…\", "
    "\"I learned…\", \"My goal is…\". Never refer to \"Harshil\" in the third person.\n\n"
    "VOICE: warm, sharp, and conversational — like a senior engineer chatting over coffee, not a search "
    "engine. Sound human. Explain and synthesize; never dump raw sections or paste long blocks of the "
    "portfolio verbatim. Prefer 2–5 tight sentences (or a short bullet list) over a wall of text. Aim for "
    "under ~150 words unless the person asks for depth.\n\n"
    "CONVERSATION: use the prior turns — remember what we've already discussed and refer back to it "
    "naturally (\"like I mentioned about the drone project…\"). If someone asks a follow-up like \"why "
    "that one?\", answer in the context of what I just recommended. When a request is broad, don't list "
    "everything — recommend and ask a clarifying question (e.g. \"Are you more interested in the embedded "
    "side or the AI side?\"). Tailor recommendations to who's asking: recruiters → impact and outcomes; "
    "developers → architecture and trade-offs; embedded/AI/software → the matching work.\n\n"
    "GREETINGS & SMALL TALK: for \"hi\", \"who are you\", thanks, etc., just respond warmly and naturally "
    "— no context needed. A good opener: \"Hey! Welcome to Harshil/OS. Want to explore my projects, "
    "embedded work, AI, software engineering, or my resume?\"\n\n"
    "GROUNDING: the CONTEXT block is my source of truth for facts — projects, dates, roles, numbers, "
    "achievements. Ground factual claims in it and never invent specifics. When something genuinely "
    "isn't there, say so casually (\"I haven't written that up yet — but I can tell you about…\") and "
    "steer to what I do have. You may add light, honest connective framing, but no fabricated facts. "
    "Cite sources inline as [1], [2] matching the numbered context items when you use them. Simple "
    "markdown is fine (bold, bullets, inline code); no headings.\n\n"
    "FOLLOW-UPS: end most answers with one natural next step or offer — e.g. \"Want me to walk you "
    "through its architecture?\" or \"I can open the GitHub repo if you'd like.\" Keep it to a single line.\n\n"
    "NAVIGATION: I can also move the site for the visitor. When they clearly ask to open, show, filter, "
    "or go to a page or item, end the reply with ONE line in exactly this form:\n"
    'ACTION {"type":"navigate","to":"<path>"}\n'
    "Valid paths: /, /about, /domains, /domains/<slug>, /projects, /projects/<slug>, "
    "/projects?domain=<slug> (to filter projects by domain), /education, /experience, /certifications, "
    "/certifications?domain=<slug>, /blog, /blog/<slug>, /timeline, /achievements, /contact, /recruiter, "
    "/developer. Domain slugs include: software-engineering, artificial-intelligence, embedded-systems, "
    "electronics-engineering, robotics-iot, ui-ux-design, research-innovation. Resumes live inside each "
    "domain page (/domains/<slug>) — for a general 'open resume' request, navigate to /domains. "
    "Only emit an ACTION when the person clearly asked to open, show, or navigate; otherwise just talk."
)


def _fallback_answer(question: str, contexts: List[dict]) -> str:
    # Retrieval-only safety net (used only when no LLM key is set or the provider
    # fails before the first token). Kept first-person to match the assistant voice.
    if not contexts:
        return (
            "I don't have anything written up on that yet. "
            "Ask me about my projects, embedded work, AI, software engineering, education, or resume — "
            "I'd be happy to walk you through any of them."
        )
    lines = ["Here's the relevant work from my portfolio:"]
    for i, c in enumerate(contexts, 1):
        snippet = c["snippet"].strip().replace("\n", " ")
        if len(snippet) > 220:
            snippet = snippet[:220].rsplit(" ", 1)[0] + "…"
        lines.append(f"[{i}] {c['title']} — {snippet}")
    lines.append("Want me to go deeper on any of these?")
    return "\n\n".join(lines)


# ---------------------------------------------------------------- LLM streaming

def _chat_messages(history: list[dict], ctx_text: str, question: str) -> list[dict]:
    return history + [{"role": "user", "content": f"CONTEXT:\n{ctx_text}\n\nQUESTION: {question}"}]


async def _stream_anthropic(key: str, messages: list[dict]) -> AsyncIterator[str]:
    payload = {
        "model": _model("anthropic"), "max_tokens": MAX_TOKENS,
        "system": SYSTEM_PROMPT, "stream": True, "messages": messages,
    }
    headers = {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", ANTHROPIC_URL, json=payload, headers=headers) as resp:
            if resp.status_code != 200:
                raise RuntimeError(f"anthropic {resp.status_code}: {(await resp.aread())[:300]!r}")
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data or data == "[DONE]":
                    continue
                try:
                    ev = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if ev.get("type") == "content_block_delta":
                    delta = ev.get("delta", {})
                    if delta.get("type") == "text_delta" and delta.get("text"):
                        yield delta["text"]


async def _stream_openai_compat(url: str, key: str, model: str, messages: list[dict], extra_headers: dict | None = None, stats: dict | None = None) -> AsyncIterator[str]:
    payload = {
        "model": model, "max_tokens": MAX_TOKENS, "stream": True,
        "stream_options": {"include_usage": True},
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + messages,
    }
    headers = {"Authorization": f"Bearer {key}", "content-type": "application/json", **(extra_headers or {})}
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            if resp.status_code != 200:
                raise RuntimeError(f"llm {resp.status_code}: {(await resp.aread())[:300]!r}")
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data or data == "[DONE]":
                    continue
                try:
                    ev = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if stats is not None and ev.get("usage"):
                    stats["usage"] = ev["usage"]
                text = (ev.get("choices") or [{}])[0].get("delta", {}).get("content")
                if text:
                    yield text


async def _stream_gemini(key: str, messages: list[dict]) -> AsyncIterator[str]:
    contents = [
        {"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]}
        for m in messages
    ]
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": MAX_TOKENS},
    }
    url = GEMINI_URL_TMPL.format(model=_model("gemini"), key=key)
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", url, json=payload) as resp:
            if resp.status_code != 200:
                raise RuntimeError(f"gemini {resp.status_code}: {(await resp.aread())[:300]!r}")
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data:
                    continue
                try:
                    ev = json.loads(data)
                except json.JSONDecodeError:
                    continue
                for cand in ev.get("candidates") or []:
                    for part in cand.get("content", {}).get("parts") or []:
                        if part.get("text"):
                            yield part["text"]


def _stream_llm(provider: str, key: str, messages: list[dict], stats: dict | None = None) -> AsyncIterator[str]:
    if provider == "anthropic":
        return _stream_anthropic(key, messages)
    if provider == "openai":
        return _stream_openai_compat(OPENAI_URL, key, _model("openai"), messages, stats=stats)
    if provider == "openrouter":
        return _stream_openai_compat(
            OPENROUTER_URL, key, _model("openrouter"), messages,
            extra_headers={"HTTP-Referer": os.environ.get("SITE_PUBLIC_URL", "https://harshil-os.dev"), "X-Title": "Harshil/OS Assistant"},
            stats=stats,
        )
    if provider == "gemini":
        return _stream_gemini(key, messages)
    raise RuntimeError(f"unknown provider {provider}")


async def probe_provider(provider: str, key: str) -> tuple[bool, str]:
    """Live 1-token health check for a provider. Returns (ok, short_detail).
    Used by the admin panel to distinguish 'key present' from 'actually works'."""
    model = _model(provider)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if provider in ("openrouter", "openai"):
                url = OPENROUTER_URL if provider == "openrouter" else OPENAI_URL
                headers = {"Authorization": f"Bearer {key}", "content-type": "application/json"}
                if provider == "openrouter":
                    headers.update({"HTTP-Referer": os.environ.get("SITE_PUBLIC_URL", "https://harshil-os.dev"), "X-Title": "Harshil/OS Assistant"})
                r = await client.post(url, json={"model": model, "max_tokens": 1, "messages": [{"role": "user", "content": "ping"}]}, headers=headers)
            elif provider == "anthropic":
                r = await client.post(ANTHROPIC_URL, json={"model": model, "max_tokens": 1, "messages": [{"role": "user", "content": "ping"}]},
                                      headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"})
            elif provider == "gemini":
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
                r = await client.post(url, json={"contents": [{"role": "user", "parts": [{"text": "ping"}]}], "generationConfig": {"maxOutputTokens": 1}})
            else:
                return False, "unknown provider"
        if r.status_code == 200:
            return True, "ok"
        # Surface a concise reason (e.g. quota, invalid key) without the full body.
        try:
            msg = (r.json().get("error") or {}).get("message") or r.text[:120]
        except Exception:
            msg = r.text[:120]
        return False, f"{r.status_code}: {str(msg)[:140]}"
    except Exception as e:
        return False, f"error: {str(e)[:140]}"


def _log_call(ip: str, provider: str, model: str, started: float, stats: dict, error: str | None = None) -> None:
    """Dev observability: provider, model, latency, token usage, errors."""
    elapsed_ms = round((time.monotonic() - started) * 1000)
    usage = stats.get("usage") or {}
    logger.info(
        "assistant.call ip=%s provider=%s model=%s time_ms=%d tokens=%s/%s%s",
        ip, provider, model, elapsed_ms,
        usage.get("prompt_tokens", "?"), usage.get("completion_tokens", "?"),
        f" error={error}" if error else "",
    )


# ---------------------------------------------------------------- endpoints

@router.post("", response_model=AssistantResponse)
@limiter.limit("10/minute;60/hour")
async def ask(request: Request, payload: AssistantRequest = Body(...)) -> AssistantResponse:
    ip = get_remote_address(request)
    logger.info("assistant.request ip=%s session=%s q_len=%d", ip, payload.session_id, len(payload.question))

    contexts = _retrieve(payload.question)
    ctx_text = _build_context(contexts)

    answer_text = ""
    # Same provider fallback chain as the streaming path.
    for provider, key in _provider_chain():
        try:
            messages = _chat_messages(_get_history(payload.session_id), ctx_text, payload.question)
            acc = ""
            async for chunk in _stream_llm(provider, key, messages):
                acc += chunk
            if acc:
                answer_text = acc
                break
        except Exception as e:
            _mark_unhealthy(provider)
            logger.warning("assistant.provider_failed ip=%s provider=%s: %s", ip, provider, e)
            continue
    if not answer_text:
        answer_text = _fallback_answer(payload.question, contexts)

    _push_history(payload.session_id, payload.question, answer_text)
    citations = [AssistantCitation(kind=c["kind"], slug=c["slug"], title=c["title"]) for c in contexts]
    return AssistantResponse(answer=answer_text.strip(), citations=citations, session_id=payload.session_id)


@router.post("/stream")
@limiter.limit("10/minute;60/hour")
async def ask_stream(request: Request, payload: AssistantRequest = Body(...)) -> StreamingResponse:
    """SSE: citations → delta* → done (error event only after partial output)."""
    ip = get_remote_address(request)
    logger.info("assistant.stream ip=%s session=%s q_len=%d", ip, payload.session_id, len(payload.question))

    contexts = _retrieve(payload.question)
    ctx_text = _build_context(contexts)
    citations = [{"kind": c["kind"], "slug": c["slug"], "title": c["title"]} for c in contexts]
    chain = _provider_chain()

    async def event_gen():
        yield f"event: citations\ndata: {json.dumps(citations)}\n\n"
        accumulated = ""
        streamed = False
        # Try each configured provider in turn. A provider that fails BEFORE
        # emitting any token is skipped and the next one is tried — the visitor
        # never sees provider errors. A mid-stream failure can't be re-tried
        # cleanly, so we stop there with whatever streamed.
        for provider, key in chain:
            model = _model(provider)
            started, stats = time.monotonic(), {}
            produced = 0
            try:
                messages = _chat_messages(_get_history(payload.session_id), ctx_text, payload.question)
                async for text in _stream_llm(provider, key, messages, stats=stats):
                    produced += 1
                    accumulated += text
                    yield f"event: delta\ndata: {json.dumps(text)}\n\n"
                _log_call(ip, provider, model, started, stats)
                streamed = True
                break
            except Exception as e:
                _log_call(ip, provider, model, started, stats, error=str(e))
                _mark_unhealthy(provider)
                logger.warning("assistant.provider_failed ip=%s provider=%s produced=%d: %s", ip, provider, produced, e)
                if produced > 0:
                    yield f"event: error\ndata: {json.dumps('stream interrupted')}\n\n"
                    streamed = True
                    break
                continue  # nothing streamed yet — fall through to the next provider
        # Every provider failed (or none configured): answer from retrieval.
        if not streamed and not accumulated:
            accumulated = _fallback_answer(payload.question, contexts)
            yield f"event: delta\ndata: {json.dumps(accumulated)}\n\n"
        if accumulated:
            _push_history(payload.session_id, payload.question, accumulated)
        yield 'event: done\ndata: {}\n\n'

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )
