import { Link, useParams } from "react-router-dom";
import { Github, ExternalLink } from "lucide-react";
import { useCollection, useItem, useSite } from "@/lib/useContent";
import { PageMeta } from "@/components/seo/PageMeta";
import { PageShell, SectionHeader, NotApplicable } from "@/components/layout/PageShell";
import { MediaGallery } from "@/components/media/MediaGallery";
import { StructuredData, projectSchema, breadcrumbSchema } from "@/components/seo/StructuredData";
import { T } from "@/lib/testIds";

// Fixed section order. NotApplicable when a section is genuinely empty.
const SECTIONS = [
  { key: "problem", label: "Problem" },
  { key: "approach", label: "Approach" },
  { key: "architecture", label: "Architecture", optional: true },
  { key: "outcome", label: "Outcome" },
  { key: "metrics", label: "Metrics", type: "list" },
  { key: "engineering_notes", label: "Engineering notes", optional: true },
  { key: "learnings", label: "Learnings" },
  { key: "next_steps", label: "Next steps" },
];

export default function ProjectDetail() {
  const { slug } = useParams();
  const { data: project, isLoading } = useItem("projects", slug);
  const { data: certs = [] } = useCollection("certifications");
  const { data: site } = useSite();

  if (isLoading) return <PageShell><div className="h-96 animate-pulse border border-border bg-card" /></PageShell>;
  if (!project) return <PageShell><p className="text-muted-foreground">Project not found.</p></PageShell>;

  const relatedCerts = certs.filter((c) => (project.related_cert_slugs || []).includes(c.slug));

  return (
    <>
      <PageMeta title={project.title} description={project.subtitle} ogType="project" ogSlug={slug} />
      <StructuredData data={projectSchema(project, site)} />
      <StructuredData data={breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Projects", url: "/projects" },
        { name: project.title, url: `/projects/${slug}` },
      ])} />
      <PageShell>
        <div className="mb-4 flex items-center gap-3">
          <Link to="/projects" className="eyebrow hover:text-primary">← Projects</Link>
          <span className="border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {project.status} · {project.year}
          </span>
          {project.version && (
            <span className="border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">v{project.version}</span>
          )}
          {project.difficulty && (
            <span className="border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{project.difficulty}</span>
          )}
          {project._depth_score != null && (
            <span data-testid={T.project.depthScore} className="border border-primary bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-primary">
              depth · {project._depth_score}
            </span>
          )}
        </div>
        <SectionHeader eyebrow={`/ project · ${slug}`} title={project.title} subtitle={project.subtitle} />

        {/* CMS-driven media gallery (images carousel + embedded video) */}
        {((project.media || []).length > 0 || project.demo_video_url) && (
          <div className="mb-10">
            <MediaGallery media={project.media || []} demoVideoUrl={project.demo_video_url} />
          </div>
        )}

        <div data-testid={T.project.detail(slug)} className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2 space-y-10">
            <p className="border-l-2 border-primary pl-4 text-base leading-relaxed">{project.summary}</p>
            {SECTIONS.map(({ key, label, type, optional }) => {
              const val = project[key];
              const isEmpty = type === "list" ? !val || val.length === 0 : !val || (typeof val === "string" && val.trim().length < 3);
              if (optional && isEmpty) return null;
              return (
                <section key={key}>
                  <div className="eyebrow">{label}</div>
                  <h3 className="mt-1 font-display text-xl font-bold uppercase tracking-tight md:text-2xl">
                    {label}
                  </h3>
                  <div className="mt-4">
                    {isEmpty ? (
                      <NotApplicable label={label} />
                    ) : type === "list" ? (
                      <ul className="space-y-2">
                        {val.map((m, i) => (
                          <li key={i} className="flex gap-3 border border-border bg-card p-3">
                            <span className="mono-data text-[10px] text-primary">{String(i + 1).padStart(2, "0")}</span>
                            <span className="text-sm">{m}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm leading-relaxed md:text-base">{val}</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          <aside className="space-y-4">
            {(project.github_url || project.live_url || (project.links || []).length > 0) && (
              <div className="border border-border bg-card p-5">
                <div className="eyebrow">Links</div>
                <div className="mt-3 space-y-2">
                  {project.github_url && (
                    <a href={project.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                      <Github className="h-4 w-4" aria-hidden /> GitHub
                    </a>
                  )}
                  {project.live_url && (
                    <a href={project.live_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                      <ExternalLink className="h-4 w-4" aria-hidden /> Live demo
                    </a>
                  )}
                  {(project.links || []).map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                      <ExternalLink className="h-4 w-4" aria-hidden /> {l.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="border border-border bg-card p-5">
              <div className="eyebrow">Role</div>
              <div className="mt-1 font-mono text-sm">{project.role}</div>
            </div>
            <div className="border border-border bg-card p-5">
              <div className="eyebrow">Stack</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(project.stack || []).map((s) => (
                  <span key={s} className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="border border-border bg-card p-5">
              <div className="eyebrow">Domains</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(project.domain_slugs || []).map((d) => (
                  <Link
                    key={d}
                    to={`/domains/${d}`}
                    className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-foreground"
                  >
                    {d}
                  </Link>
                ))}
              </div>
            </div>
            {(project.skills_learned || []).length > 0 && (
              <div className="border border-border bg-card p-5">
                <div className="eyebrow">Skills learned</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.skills_learned.map((s) => (
                    <span key={s} className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {relatedCerts.length > 0 && (
              <div className="border border-border bg-card p-5">
                <div className="eyebrow">Related certificates</div>
                <ul className="mt-3 space-y-2">
                  {relatedCerts.map((c) => (
                    <li key={c.slug}>
                      <Link to="/certifications" className="text-sm hover:text-primary">{c.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="border border-border bg-card p-5">
              <div className="eyebrow">Last updated</div>
              <div className="mt-1 font-mono text-sm">{project.updated_at}</div>
            </div>
          </aside>
        </div>
      </PageShell>
    </>
  );
}
