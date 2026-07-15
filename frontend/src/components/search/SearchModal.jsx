/**
 * Universal search — queries /api/content/search across every collection
 * (projects, domains, certifications, experience, education, blog, timeline,
 * achievements). Debounced, keyboard-navigable, instant.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { client } from "@/lib/api";
import { cn } from "@/lib/utils";

const KIND_LABEL = {
  projects: "project", domains: "domain", blog: "blog", certifications: "certification",
  experience: "experience", education: "education", timeline: "timeline", achievements: "achievement",
};

export const SearchModal = ({ open, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const [state, setState] = useState("idle"); // idle | loading | done
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActive(0);
      setState("idle");
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const runSearch = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); setState("idle"); return; }
    setState("loading");
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await client.get("/content/search", { params: { q } });
        setResults(data.results || []);
        setActive(0);
        setState("done");
      } catch {
        setResults([]);
        setState("done");
      }
    }, 180);
  }, []);

  const go = (r) => {
    if (!r) return;
    navigate(r.path);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className="fixed inset-0 z-[60] bg-black/90 p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="mx-auto flex max-h-[70vh] w-full max-w-2xl flex-col border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); runSearch(e.target.value); }}
            onKeyDown={onKeyDown}
            placeholder="Search projects, certifications, skills, education…"
            aria-label="Search everything"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {state === "idle" && (
            <p className="px-4 py-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Type at least 2 characters — searches everything on the site.
            </p>
          )}
          {state === "loading" && (
            <p className="px-4 py-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span className="mr-2 inline-block h-3 w-2 animate-blink bg-primary align-middle" aria-hidden />
              searching
            </p>
          )}
          {state === "done" && results.length === 0 && (
            <p className="px-4 py-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">No matches.</p>
          )}
          <ul>
            {results.map((r, i) => (
              <li key={`${r.kind}-${r.path}-${i}`}>
                <button
                  type="button"
                  onClick={() => go(r)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-baseline gap-3 border-l-2 px-4 py-3 text-left",
                    i === active ? "border-primary bg-primary/5" : "border-transparent",
                  )}
                >
                  <span className="mono-data shrink-0 text-[10px] uppercase text-primary">
                    {KIND_LABEL[r.kind] || r.kind}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{r.title}</span>
                    {r.subtitle && <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-border px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          ↑↓ navigate · enter open · esc close
        </div>
      </div>
    </div>
  );
};
