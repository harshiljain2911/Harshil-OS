import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { T } from "@/lib/testIds";

const FALLBACK_BRAND_SLUG = "harshil-os";

const bootLines = (brandSlug) => [
  `${brandSlug} v1.0 · terminal @ /home/visitor`,
  "type 'help' to list commands · esc to close",
  "",
];

// Command set: minimum set per §4.10 charter.
const buildCommands = (brandSlug) => ({
  help: () => [
    "available commands:",
    "  help                  show this list",
    "  whoami                who is running this shell",
    "  ls                    list top-level routes",
    "  goto <path>           navigate to a route",
    "  open <slug>           open a project by slug",
    "  domains               list domains",
    "  projects              list projects",
    "  contact               jump to contact form",
    "  recruiter             toggle recruiter mode",
    "  dev                   toggle developer mode",
    "  clear                 clear the screen",
    "  exit                  close terminal",
  ],
  whoami: () => [`visitor@${brandSlug} · read-only shell`],
  ls: () => [
    "/  /about  /domains  /projects  /education  /experience",
    "/achievements  /certifications  /timeline  /blog  /recruiter",
    "/developer  /contact",
  ],
  clear: () => "__CLEAR__",
});

export const Terminal = ({ open, onClose, projects = [], domains = [], site }) => {
  const brandSlug = site?.identity?.brand_slug || FALLBACK_BRAND_SLUG;
  const COMMANDS = useMemo(() => buildCommands(brandSlug), [brandSlug]);
  const [lines, setLines] = useState(() => bootLines(brandSlug));
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [hIdx, setHIdx] = useState(-1);
  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [lines]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const routeMap = useMemo(
    () => new Set([
      "/", "/about", "/domains", "/projects", "/education", "/experience",
      "/achievements", "/certifications", "/timeline", "/blog", "/recruiter",
      "/developer", "/contact",
    ]),
    [],
  );

  const projectSlugs = useMemo(() => projects.map((p) => p.slug), [projects]);
  const domainSlugs = useMemo(() => domains.map((d) => d.slug), [domains]);

  const run = useCallback(
    (raw) => {
      const cmd = raw.trim();
      if (!cmd) return;
      const [head, ...rest] = cmd.split(/\s+/);
      const arg = rest.join(" ");
      let out;
      if (head === "clear") {
        setLines([]);
        return;
      }
      if (head === "exit") {
        onClose();
        return;
      }
      if (head === "goto") {
        const target = arg.startsWith("/") ? arg : `/${arg}`;
        if (routeMap.has(target)) {
          navigate(target);
          onClose();
          return;
        }
        out = [`goto: unknown route '${arg}'`];
      } else if (head === "open") {
        if (projectSlugs.includes(arg)) {
          navigate(`/projects/${arg}`);
          onClose();
          return;
        }
        out = [`open: no project '${arg}' — try: ${projectSlugs.slice(0, 4).join(", ")}...`];
      } else if (head === "domains") {
        out = ["domains:", ...domains.map((d) => `  ${d.slug.padEnd(28)} ${d.name}`)];
      } else if (head === "projects") {
        out = ["projects:", ...projects.map((p) => `  ${p.slug.padEnd(20)} ${p.title}`)];
      } else if (head === "contact") {
        navigate("/contact"); onClose(); return;
      } else if (head === "recruiter") {
        navigate(window.location.pathname.startsWith("/recruiter") ? "/" : "/recruiter"); onClose(); return;
      } else if (head === "dev" || head === "developer") {
        navigate(window.location.pathname.startsWith("/developer") ? "/" : "/developer"); onClose(); return;
      } else if (head === "admin") {
        // Deliberately undocumented — the terminal is one of the two intended
        // entry points to the hidden admin panel (the other is the direct URL).
        navigate("/admin"); onClose(); return;
      } else if (COMMANDS[head]) {
        out = COMMANDS[head]();
        if (out === "__CLEAR__") { setLines([]); return; }
      } else {
        out = [`${head}: command not found — try 'help'`];
      }
      setLines((prev) => [...prev, `› ${cmd}`, ...out, ""]);
    },
    [COMMANDS, domains, navigate, onClose, projects, projectSlugs, routeMap],
  );

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      run(input);
      if (input.trim()) setHistory((h) => [input, ...h]);
      setInput("");
      setHIdx(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(hIdx + 1, history.length - 1);
      if (next >= 0) { setHIdx(next); setInput(history[next]); }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = hIdx - 1;
      if (next < 0) { setHIdx(-1); setInput(""); } else { setHIdx(next); setInput(history[next]); }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const parts = input.split(/\s+/);
      if (parts.length === 1) {
        const opts = Object.keys(COMMANDS).concat(["goto", "open", "domains", "projects", "contact", "resume", "exit"]);
        const match = opts.find((k) => k.startsWith(parts[0]));
        if (match) setInput(match + " ");
      } else if (parts[0] === "open") {
        const match = projectSlugs.find((s) => s.startsWith(parts[1] || ""));
        if (match) setInput(`open ${match}`);
      } else if (parts[0] === "goto") {
        const opts = Array.from(routeMap);
        const q = (parts[1] || "").startsWith("/") ? parts[1] : `/${parts[1] || ""}`;
        const match = opts.find((s) => s.startsWith(q));
        if (match) setInput(`goto ${match}`);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Terminal"
      data-testid={T.terminal.overlay}
      className="fixed inset-0 z-[60] bg-black/95"
      onClick={onClose}
    >
      <div
        className="mx-auto mt-16 flex h-[70vh] max-w-4xl flex-col border border-border bg-black text-[hsl(var(--terminal-green))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
          <span>terminal · read-only</span>
          <button
            type="button"
            data-testid={T.terminal.close}
            onClick={onClose}
            aria-label="Close terminal"
            className="hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          ref={outputRef}
          data-testid={T.terminal.output}
          className="flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed"
        >
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-border px-4 py-2">
          <span aria-hidden>›</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            data-testid={T.terminal.input}
            aria-label="Terminal input"
            className="flex-1 bg-transparent text-sm text-[hsl(var(--terminal-green))] outline-none placeholder:text-muted-foreground"
            placeholder="type help"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="inline-block h-4 w-2 animate-blink bg-[hsl(var(--terminal-green))]" aria-hidden />
        </div>
      </div>
    </div>
  );
};
