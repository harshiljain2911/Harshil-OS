import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Github, ExternalLink, Star } from "lucide-react";
import { client } from "@/lib/api";
import { PageMeta } from "@/components/seo/PageMeta";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { useSite } from "@/lib/useContent";
import { T } from "@/lib/testIds";

const FALLBACK_BRAND_SLUG = "harshil-os";

// Real architecture of this codebase.
const folderTree = (brandSlug) => `${brandSlug}/
├── backend/                       # FastAPI · Pydantic v2 · content-as-data
│   ├── content/                   # git-diffable JSON — the CMS store
│   │   ├── domains/*.json         # one file per item, per collection
│   │   ├── projects/*.json
│   │   ├── certifications/*.json
│   │   ├── experience/*.json
│   │   ├── resumes/*.json         # resumes are a first-class collection
│   │   ├── drafts/  archived/     # unpublished content, invisible to the site
│   │   └── site.json              # identity, hero, nav, SEO, AI settings…
│   ├── uploads/                   # media library (images/videos/resumes/…)
│   ├── models.py                  # Pydantic schema — the single source of truth
│   ├── content_loader.py          # boot-time validation (fail-to-boot)
│   └── routers/
│       ├── content_routes.py      # public read API + universal search
│       ├── admin_routes.py        # auth · CRUD · drafts · media uploads
│       ├── assistant_routes.py    # multi-provider RAG assistant (SSE)
│       ├── contact_routes.py      # validated form → email + durable store
│       ├── github_routes.py       # live repos · cached
│       └── seo_routes.py          # sitemap.xml · robots.txt
└── frontend/                      # React 19 · Tailwind · Framer Motion
    └── src/
        ├── pages/                 # one per route
        │   └── admin/             # the hidden CMS (schema-driven forms)
        ├── components/
        │   ├── media/             # ResumeViewer (pdf.js), MediaGallery
        │   ├── assistant/         # Ask OS push panel (streaming)
        │   └── layout/  seo/  cards/
        └── lib/                   # api client · react-query hooks`;

const STACK = [
  "React 19", "React Router 7", "Tailwind CSS 3.4", "Framer Motion 11",
  "React Query 5", "react-pdf (pdf.js)",
  "FastAPI", "Pydantic v2", "MongoDB (Motor)", "Pillow (OG images)",
  "SlowAPI (rate limiting)", "OpenRouter (assistant)",
];

// How I build — engineering principles, not a resume list.
const PRINCIPLES = [
  { k: "Fundamentals first", v: "Understand the whole system before optimizing a part. A hardware fault, a slow query, and a flaky model are all the same bug until proven otherwise." },
  { k: "Documentation is code", v: "Every project follows one structure — problem, approach, outcome, learnings. If it isn't written down, it isn't finished." },
  { k: "Version control as a habit", v: "Content and config are git-diffable JSON, so every change is reviewable and reversible — the CMS writes files, not opaque rows." },
  { k: "Validate at the boundary", v: "One Pydantic schema validates everything on the way in; the server refuses to boot on bad data. Invalid content can't reach the site." },
  { k: "Maintainability over cleverness", v: "Adding a project, resume, or domain is filling a form — additive, never a rewrite. The architecture is meant to last years without code edits." },
  { k: "Production mindset", v: "Rate limits, graceful fallbacks, honeypots, no secrets on the client. Things degrade cleanly instead of failing loudly." },
];

// Real decisions taken while building THIS platform.
const DECISIONS = [
  { slug: "fastapi", title: "Why FastAPI", body: "Async Python with Pydantic validation baked into the request boundary. The same models validate the public API, the CMS writes, and the boot-time content loader — one schema, zero drift." },
  { slug: "json-cms", title: "Why a JSON content store (not a DB)", body: "Content lives as git-diffable JSON files, so every edit is reviewable, reversible, and portable. MongoDB is reserved for what actually needs a database: form submissions and API caches." },
  { slug: "upload-cms", title: "Why an upload-based CMS", body: "Admins never type a URL. Files are uploaded, stored server-side, and their URLs generated automatically — removing an entire class of broken-link and typo mistakes." },
  { slug: "backend-ai", title: "Why route AI through the backend", body: "API keys never touch the browser. Retrieval runs server-side over live content, the model streams over SSE, and rate limits + a retrieval fallback keep it safe and always responsive." },
  { slug: "openrouter", title: "Why OpenRouter", body: "One key, many models. The provider and model are editable from the admin panel — switch models with no redeploy — and the assistant degrades to grounded retrieval if the provider is unavailable." },
  { slug: "collections", title: "Why modular content collections", body: "Each content type is an isolated folder of validated JSON with its own schema. Adding a new type (resumes were added this way) is additive and never forces a rewrite of the rest." },
  { slug: "admin-first", title: "Why admin-first architecture", body: "Every change flows through the hidden panel, which validates and reloads the in-memory registry live. The site updates immediately — no code edits, no restarts, no redeploys." },
  { slug: "domain-resumes", title: "Why independent domain resumes", body: "Resumes are a first-class collection typed by domain, so each domain page resolves and renders its own tailored resume automatically, with a legacy fallback so nothing breaks." },
  { slug: "media-library", title: "Why a shared media library", body: "One folder-organized store (images, videos, resumes, certificates) reused across every content type, so a file is uploaded once and referenced anywhere — never duplicated." },
];

function useGithubRepos() {
  return useQuery({
    queryKey: ["github-repos"],
    queryFn: async () => (await client.get("/github/repos")).data,
    staleTime: 5 * 60 * 1000,
  });
}

export default function Developer() {
  const { data, isLoading } = useGithubRepos();
  const { data: site } = useSite();
  const brandSlug = site?.identity?.brand_slug || FALLBACK_BRAND_SLUG;
  const repos = data?.repos || [];
  const user = data?.user;
  const summary = site?.identity?.developer_summary || site?.narrative?.philosophy?.body;

  return (
    <>
      <PageMeta title="Developer Mode" />
      <PageShell>
        {/* Exit / mode banner */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-4 py-2">
          <span className="eyebrow text-primary">Developer Mode</span>
          <Link
            to="/"
            className="inline-flex items-center gap-2 border border-border bg-background px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:border-primary hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to Portfolio
          </Link>
        </div>

        <SectionHeader
          eyebrow="/ developer mode"
          title="Engineering notebook"
          subtitle="How I think, build, and keep systems maintainable — and the deliberate decisions behind this platform."
        />

        {summary && (
          <p className="mb-14 max-w-3xl border-l-2 border-primary pl-4 text-sm leading-relaxed md:text-base">{summary}</p>
        )}

        {/* How I build — principles */}
        <section className="mb-16">
          <div className="eyebrow">How I build</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <article key={p.k} className="border border-border bg-card p-5">
                <div className="mono-data text-[10px] text-primary">›</div>
                <h3 className="mt-1 font-display text-base font-bold uppercase leading-snug">{p.k}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.v}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Stack */}
        <section className="mb-16">
          <div className="eyebrow">Stack</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {STACK.map((s) => (
              <div key={s} className="border border-border bg-card px-4 py-3 text-xs uppercase tracking-[0.18em]">
                <span className="text-primary">›</span> {s}
              </div>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section className="mb-16">
          <div className="eyebrow">Architecture</div>
          <pre
            data-testid={T.developer.tree}
            className="mt-4 overflow-x-auto border border-border bg-black p-6 font-mono text-xs leading-relaxed text-terminal"
          >
{folderTree(brandSlug)}
          </pre>
        </section>

        {/* Repositories — live from GitHub */}
        <section className="mb-16">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="eyebrow">Repositories</div>
            <div className="mono-data min-w-0 truncate text-[10px] text-muted-foreground">
              {isLoading ? "fetching…" : user ? `live · github.com/${user}` : "github"}
            </div>
          </div>
          {isLoading ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse border border-border bg-card" />)}
            </div>
          ) : repos.length === 0 ? (
            <a
              href={`https://github.com/${user || "harshiljain2911"}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-3 border border-dashed border-border bg-card px-5 py-6 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
            >
              <Github className="h-5 w-5 text-primary" aria-hidden />
              View all repositories on GitHub <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {repos.map((r) => (
                <article key={r.slug} data-testid={T.developer.repoCard(r.slug)} className="min-w-0 border border-border bg-card p-6">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center gap-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Github className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="truncate font-mono text-sm">{user ? `${user}/` : ""}{r.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                    </a>
                    <div className="mono-data flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                      <Star className="h-3 w-3" aria-hidden /> {r.stars}
                    </div>
                  </div>
                  {r.desc && <p className="mt-3 text-sm text-muted-foreground">{r.desc}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {r.language && <span className="border border-primary px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">{r.language}</span>}
                    {(r.topics || []).slice(0, 4).map((t) => (
                      <span key={t} className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{t}</span>
                    ))}
                    {r.updated_at && <span className="mono-data ml-auto text-[10px] text-muted-foreground">upd {String(r.updated_at).slice(0, 10)}</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Design decisions — real */}
        <section>
          <div className="eyebrow">Design decisions</div>
          <div className="mt-4 space-y-4">
            {DECISIONS.map((d) => (
              <article key={d.slug} data-testid={T.developer.decisionCard(d.slug)} className="border border-border bg-card p-6 md:p-8">
                <div className="mono-data text-[10px] text-primary">DECISION · {d.slug}</div>
                <h3 className="mt-2 font-display text-xl font-bold uppercase">{d.title}</h3>
                <p className="mt-3 text-sm md:text-base">{d.body}</p>
              </article>
            ))}
          </div>
        </section>
      </PageShell>
    </>
  );
}
