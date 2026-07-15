import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, X, Send } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API } from "@/lib/api";
import { useSite } from "@/lib/useContent";
import { T } from "@/lib/testIds";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Who is Harshil?",
  "Show AI Projects",
  "Latest Certifications",
  "Current Experience",
  "Tech Stack",
  "Show Embedded Projects",
];

// Deterministic intents handled instantly on the client — no API round-trip.
// Domain-specific project/cert filters come before the generic patterns so the
// most specific match wins (the list is evaluated top-to-bottom).
const NAV_INTENTS = [
  [/\b(ai|artificial intelligence)\b.*\bprojects?\b|\bprojects?\b.*\b(ai|artificial intelligence)\b/i, "/projects?domain=artificial-intelligence", "Filtering AI projects…"],
  [/\bembedded\b.*\bprojects?\b|\bprojects?\b.*\bembedded\b/i, "/projects?domain=embedded-systems", "Filtering embedded projects…"],
  [/\b(web|full.?stack)\b.*\bprojects?\b/i, "/projects?domain=software-engineering", "Filtering software projects…"],
  [/\b(open|go to|show( me)?|take me to)\b.*\bcontact\b/i, "/contact", "Opening the contact page…"],
  [/\b(open|go to|show( me)?|view)\b.*\bcertifi/i, "/certifications", "Opening certifications…"],
  [/\b(open|go to|show( me)?)\b.*\bprojects?\b/i, "/projects", "Opening projects…"],
  [/\b(open|go to|show( me)?)\b.*\beducation\b/i, "/education", "Opening education…"],
  [/\b(open|go to|show( me)?)\b.*\bexperience\b/i, "/experience", "Opening experience…"],
  [/\b(open|go to|show( me)?)\b.*\bdomains?\b/i, "/domains", "Opening domains…"],
  [/\b(open|go to|show( me)?)\b.*\bblog\b/i, "/blog", "Opening the blog…"],
  [/\b(open|show|view|download)\b.*\bresume\b/i, "/domains", "Resumes live inside each domain — opening domains…"],
  [/\brecruiter mode\b/i, "/recruiter", "Switching to Recruiter Mode…"],
];

/** Strip a trailing `ACTION {...}` line emitted by the LLM; return [text, action|null]. */
function extractAction(text) {
  const m = text.match(/\nACTION\s+(\{.*\})\s*$/);
  if (!m) return [text, null];
  try {
    return [text.slice(0, m.index).trimEnd(), JSON.parse(m[1])];
  } catch {
    return [text, null];
  }
}

const MD_CLASSES = "text-sm text-foreground [&_p]:mt-2 [&_p:first-child]:mt-0 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-0.5 [&_strong]:text-primary [&_code]:border [&_code]:border-border [&_code]:bg-background [&_code]:px-1 [&_pre]:mt-2 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border [&_pre]:bg-background [&_pre]:p-2 [&_a]:underline";

const CITATION_PATH = {
  projects: (s) => `/projects/${s}`,
  domains: (s) => `/domains/${s}`,
  blog: (s) => `/blog/${s}`,
  experience: () => `/experience`,
  achievements: () => `/achievements`,
  certifications: () => `/certifications`,
  timeline: () => `/timeline`,
  site: () => `/about`,
};

function newSessionId() {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Parse an SSE chunk buffer into (remaining, [events]) */
function parseSSE(buffer) {
  const events = [];
  const parts = buffer.split("\n\n");
  const tail = parts.pop();
  for (const raw of parts) {
    const lines = raw.split("\n");
    let event = "message";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (data) {
      try { events.push({ event, data: JSON.parse(data) }); }
      catch { events.push({ event, data }); }
    }
  }
  return [tail, events];
}

export const AIAssistant = ({ open, onClose }) => {
  const [sessionId] = useState(newSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | typing | error | throttled
  const [draft, setDraft] = useState("");
  const [draftCitations, setDraftCitations] = useState([]);
  const inputRef = useRef(null);
  const scrollerRef = useRef(null);
  const stickRef = useRef(true); // auto-scroll only while pinned near the bottom
  const abortRef = useRef(null);
  const navigate = useNavigate();
  const { data: site } = useSite();

  const runAction = useCallback((action) => {
    if (!action || action.type !== "navigate" || typeof action.to !== "string") return;
    if (action.to.startsWith("/") && !action.to.startsWith("//")) {
      setTimeout(() => navigate(action.to), 450);
    }
  }, [navigate]);

  /** Instant client-side intents (GitHub + page navigation) — no API call. */
  const tryIntent = useCallback((question) => {
    if (/\b(open|go to|show( me)?)\b.*\bgithub\b/i.test(question) && site?.social?.github) {
      window.open(site.social.github, "_blank", "noopener");
      return "Opening GitHub in a new tab…";
    }
    for (const [re, path, reply] of NAV_INTENTS) {
      if (re.test(question)) {
        setTimeout(() => navigate(path), 450);
        return reply;
      }
    }
    return null;
  }, [site, navigate]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Track whether the user is pinned to the bottom. If they scroll up to read
  // history, we stop yanking them down while a reply streams in.
  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  // Auto-scroll ONLY the message container, and only when pinned to the bottom.
  // Never touches the window/portfolio. Instant during streaming (avoids jitter),
  // smooth when a brand-new message lands.
  useEffect(() => {
    if (!stickRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: status === "typing" ? "auto" : "smooth" });
  }, [messages, status, draft]);

  // Any new outgoing/incoming message re-pins to the bottom.
  useEffect(() => { stickRef.current = true; }, [messages.length]);

  const send = useCallback(async (q) => {
    const question = q?.trim();
    if (!question || status === "loading" || status === "typing") return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");

    // Deterministic actions (open page / GitHub) resolve instantly client-side.
    const intentReply = tryIntent(question);
    if (intentReply) {
      setMessages((m) => [...m, { role: "assistant", text: intentReply, citations: [] }]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setDraft("");
    setDraftCitations([]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`${API}/assistant/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, question }),
        signal: ctrl.signal,
      });
      if (res.status === 429) { setStatus("throttled"); return; }
      if (!res.ok || !res.body) { setStatus("error"); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let firstDelta = true;
      let accumulated = "";
      let cits = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let events;
        [buffer, events] = parseSSE(buffer);
        for (const ev of events) {
          if (ev.event === "citations") {
            cits = ev.data;
            setDraftCitations(cits);
          } else if (ev.event === "delta") {
            if (firstDelta) { setStatus("typing"); firstDelta = false; }
            accumulated += ev.data;
            setDraft(accumulated);
          } else if (ev.event === "done") {
            const [cleanText, action] = extractAction(accumulated);
            setMessages((m) => [...m, { role: "assistant", text: cleanText, citations: cits }]);
            setDraft("");
            setDraftCitations([]);
            setStatus("idle");
            runAction(action);
          } else if (ev.event === "error") {
            setStatus("error");
          }
        }
      }
      // Fallback if stream ended without an explicit done event
      if (accumulated && !firstDelta) {
        const [cleanText, action] = extractAction(accumulated);
        setMessages((m) => {
          const last = m[m.length - 1];
          if (last?.role === "assistant" && (last.text === accumulated || last.text === cleanText)) return m;
          return [...m, { role: "assistant", text: cleanText, citations: cits }];
        });
        setDraft("");
        setDraftCitations([]);
        if (status !== "throttled" && status !== "error") setStatus("idle");
        runAction(action);
      }
    } catch {
      setStatus("error");
    }
  }, [sessionId, status, tryIntent, runAction]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <>
      <button
        type="button"
        data-testid={T.assistant.launcher}
        aria-label="Open AI assistant"
        onClick={() => (open ? onClose() : onClose(false))}
        className={cn(
          "fixed bottom-24 right-6 z-[10000] flex items-center gap-2 border border-border bg-card px-4 py-3 text-xs uppercase tracking-[0.24em] hover:border-primary hover:hard-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          open && "hidden",
        )}
      >
        <Bot className="h-4 w-4 text-primary" aria-hidden />
        <span>Ask the OS</span>
      </button>

      {/* VS Code / ChatGPT-style push panel: a flex sibling of the main content
          on md+ (content shrinks, panel takes 340/380/420px), a full-screen
          drawer on mobile. It is a self-contained full-height column with its
          OWN scroll region (the message list) — the parent shell is fixed to one
          viewport, so this never participates in the portfolio's scroll. Always
          mounted so the close animation runs; `inert` when closed. */}
      <aside
        aria-label="AI assistant"
        data-testid={T.assistant.drawer}
        inert={!open ? true : undefined}
        className={cn(
          "z-[10000] flex-col bg-background",
          "md:h-full md:shrink-0 md:overflow-hidden md:border-border md:transition-[width] md:duration-300 md:ease-in-out",
          open
            ? "flex fixed inset-0 md:static md:inset-auto md:w-[340px] md:border-l lg:w-[380px] xl:w-[420px]"
            : "hidden md:flex md:w-0 md:border-l-0",
        )}
      >
        <div className="flex h-full w-full flex-col md:w-[340px] lg:w-[380px] xl:w-[420px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" aria-hidden />
              <h2 id="assistant-title" className="font-display text-sm font-bold uppercase tracking-[0.24em]">Assistant</h2>
              <span className="ml-2 border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                grounded · streaming
              </span>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              data-testid={T.assistant.close}
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Only this container scrolls — overscroll-contain stops scroll from
              chaining to the website behind it. */}
          <div ref={scrollerRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth px-4 py-4 text-sm">
            {messages.length === 0 && !draft && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Grounded on portfolio content. Streams answers with citations.
                </p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      data-testid={T.assistant.suggestion(i)}
                      onClick={() => send(s)}
                      className="w-full border border-border bg-card px-3 py-2 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      › {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                data-testid={T.assistant.message(i)}
                className={cn(
                  "mb-3 border-l-2 px-3 py-2",
                  m.role === "user" ? "border-muted-foreground bg-muted/30" : "border-primary bg-card",
                )}
              >
                <div className="eyebrow mb-1">{m.role}</div>
                {m.role === "assistant" ? (
                  <div className={MD_CLASSES}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-foreground">{m.text}</div>
                )}
                {m.citations?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.citations.map((c, j) => {
                      const to = (CITATION_PATH[c.kind] || (() => "#"))(c.slug);
                      return (
                        <Link
                          key={`${c.kind}-${c.slug}-${j}`}
                          to={to}
                          data-testid={T.assistant.citation(i, j)}
                          className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          [{j + 1}] {c.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {draft && (
              <div className="mb-3 border-l-2 border-primary bg-card px-3 py-2">
                <div className="eyebrow mb-1">assistant</div>
                <div className="whitespace-pre-wrap text-sm text-foreground">
                  {draft}<span className="inline-block h-3 w-2 translate-y-0.5 animate-blink bg-primary align-baseline" aria-hidden />
                </div>
                {draftCitations.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {draftCitations.map((c, j) => (
                      <span key={j} className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        [{j + 1}] {c.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div data-testid={T.assistant.state} className="min-h-[24px]" aria-live="polite">
              {status === "loading" && (
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <span className="inline-block h-3 w-2 animate-blink bg-primary" aria-hidden />
                  querying context
                </div>
              )}
              {status === "typing" && (
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-terminal">
                  <span className="inline-block h-3 w-2 animate-blink bg-terminal" aria-hidden />
                  streaming
                </div>
              )}
              {status === "error" && (
                <div className="border border-destructive bg-destructive/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-destructive" role="alert">
                  Assistant call failed. Try again.
                </div>
              )}
              {status === "throttled" && (
                <div className="border border-primary bg-primary/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-primary" role="alert">
                  Assistant is temporarily busy. Try again shortly.
                </div>
              )}
            </div>
          </div>

          <form
            className="flex items-center gap-2 border-t border-border p-3"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <label htmlFor="assistant-input" className="sr-only">Ask the assistant</label>
            <input
              id="assistant-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              data-testid={T.assistant.input}
              placeholder="Ask about a project, domain, decision..."
              className="flex-1 border border-border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              disabled={status === "loading" || status === "typing"}
            />
            <button
              type="submit"
              data-testid={T.assistant.send}
              aria-label="Send"
              disabled={!input.trim() || status === "loading" || status === "typing"}
              className="border border-border bg-card px-3 py-2 hover:border-primary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
};
