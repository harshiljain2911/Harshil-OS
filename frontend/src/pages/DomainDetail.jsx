/**
 * Domain page — the room of the house for one engineering domain.
 * Sections: overview, philosophy, skills, technologies, subtopics, projects,
 * experience, certifications, and the domain-specific resume (embedded PDF
 * viewer — the only place resumes exist on the site).
 */
import { Suspense, lazy, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, ExternalLink, Eye, FileText } from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import { useCollection, useItem } from "@/lib/useContent";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { CertCard, mediaUrl } from "@/components/cards/CertCard";

const ResumeViewer = lazy(() =>
  import("@/components/media/ResumeViewer").then((m) => ({ default: m.ResumeViewer })));
import { StructuredData, domainSchema, breadcrumbSchema } from "@/components/seo/StructuredData";
import { T } from "@/lib/testIds";

const Chips = ({ items, hover = false }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((s) => (
      <span
        key={s}
        className={`border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground ${hover ? "hover:border-primary hover:text-foreground" : ""}`}
      >
        {s}
      </span>
    ))}
  </div>
);

function DomainResume({ domain, resumeUrl }) {
  const [open, setOpen] = useState(false);
  if (!resumeUrl) return null;
  const url = mediaUrl(resumeUrl);
  return (
    <section className="pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="eyebrow">Domain resume</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 border border-primary bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground hard-shadow-hover"
          >
            <Eye className="h-3 w-3" aria-hidden /> View
          </button>
          <a
            href={url}
            download
            className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-primary"
          >
            <Download className="h-3 w-3" aria-hidden /> Download
          </a>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">A resume tailored to {domain.name}. Opens in a full document viewer.</p>
      {open && (
        <Suspense fallback={null}>
          <ResumeViewer
            open={open}
            onClose={() => setOpen(false)}
            url={resumeUrl}
            title={`${domain.name} Resume`}
            typeLabel={domain.name}
          />
        </Suspense>
      )}
    </section>
  );
}

export default function DomainDetail() {
  const { slug } = useParams();
  const { data: domain, isLoading } = useItem("domains", slug);
  const { data: projects = [] } = useCollection("projects");
  const { data: certs = [] } = useCollection("certifications");
  const { data: experience = [] } = useCollection("experience");
  const { data: resumes = [] } = useCollection("resumes");

  if (isLoading) return <PageShell><div className="h-64 animate-pulse border border-border bg-card" /></PageShell>;
  if (!domain) return <PageShell><p className="text-muted-foreground">Domain not found.</p></PageShell>;

  const inDomain = (item) => (item.domain_slugs || []).includes(slug);
  const relatedProjects = projects.filter(inDomain);
  // Resume for this domain: CMS resume whose type matches the slug, else legacy field.
  const domainResumeUrl = resumes.find((r) => r.resume_type === slug)?.pdf_url || domain.resume_url || null;
  const relatedCerts = certs.filter(inDomain);
  const relatedExperience = experience.filter(inDomain);

  return (
    <>
      <PageMeta title={domain.name} description={domain.overview} ogType="domain" ogSlug={slug} />
      <StructuredData data={domainSchema(domain)} />
      <StructuredData data={breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Domains", url: "/domains" },
        { name: domain.name, url: `/domains/${slug}` },
      ])} />
      <PageShell>
        <div className="mb-4 flex items-center gap-3">
          <Link to="/domains" className="eyebrow hover:text-primary">← Domains</Link>
          <span className="border border-primary bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.24em] text-primary">
            {domain.status}
          </span>
        </div>
        <SectionHeader eyebrow="/ domain" title={domain.name} subtitle={domain.tagline} />

        <div data-testid={T.domain.detail(slug)} className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2 space-y-10">
            {domain.overview && <p className="text-base leading-relaxed">{domain.overview}</p>}

            {domain.philosophy && (
              <div className="border-l-2 border-primary pl-4">
                <div className="eyebrow">Philosophy</div>
                <p className="mt-2 text-sm leading-relaxed md:text-base">{domain.philosophy}</p>
              </div>
            )}

            {(domain.focus_areas || []).length > 0 && (
              <div>
                <div className="eyebrow">Focus areas</div>
                <ul className="mt-3 space-y-2">
                  {domain.focus_areas.map((f) => (
                    <li key={f} className="flex items-center gap-3 border-l-2 border-primary pl-3">
                      <span className="mono-data text-[10px] text-primary">•</span> <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(domain.subtopics || []).length > 0 && (
              <div>
                <div className="eyebrow">Inside this domain</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {domain.subtopics.map((t) => (
                    <div key={t.slug} className="border border-border bg-card p-4">
                      <div className="font-display text-sm font-bold uppercase">{t.name}</div>
                      {t.summary && <p className="mt-1 text-xs text-muted-foreground">{t.summary}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {relatedProjects.length > 0 && (
              <div className="pt-2">
                <div className="eyebrow">Projects in this domain</div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {relatedProjects.map((p) => <ProjectCard key={p.slug} project={p} />)}
                </div>
              </div>
            )}

            {relatedExperience.length > 0 && (
              <div className="pt-2">
                <div className="eyebrow">Experience in this domain</div>
                <ul className="mt-4 divide-y divide-border border border-border bg-card">
                  {relatedExperience.map((e) => (
                    <li key={e.slug} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
                      <span className="font-display text-sm font-bold uppercase">{e.role}</span>
                      <span className="text-xs text-muted-foreground">{e.org}</span>
                      <Link to="/experience" className="ml-auto eyebrow hover:text-primary">details →</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {relatedCerts.length > 0 && (
              <div className="pt-2">
                <div className="eyebrow">Certifications in this domain</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {relatedCerts.map((c) => <CertCard key={c.slug} cert={c} />)}
                </div>
                <Link to="/certifications" className="mt-4 inline-block eyebrow hover:text-primary">All certifications →</Link>
              </div>
            )}

            <DomainResume domain={domain} resumeUrl={domainResumeUrl} />
          </div>

          <aside className="space-y-4">
            {(domain.skills || []).length > 0 && (
              <div className="border border-border bg-card p-5">
                <div className="eyebrow">Skills</div>
                <div className="mt-3"><Chips items={domain.skills} /></div>
              </div>
            )}
            {(domain.technologies || []).length > 0 && (
              <div className="border border-border bg-card p-5">
                <div className="eyebrow">Technologies</div>
                <div className="mt-3"><Chips items={domain.technologies} /></div>
              </div>
            )}
            {(domain.tools || []).length > 0 && (
              <div className="border border-border bg-card p-5">
                <div className="eyebrow">Tools</div>
                <div className="mt-3"><Chips items={domain.tools} /></div>
              </div>
            )}
            {(domain.hardware || []).length > 0 && (
              <div className="border border-border bg-card p-5">
                <div className="eyebrow">Hardware</div>
                <div className="mt-3"><Chips items={domain.hardware} /></div>
              </div>
            )}
            {(domain.external_links || []).length > 0 && (
              <div className="border border-border bg-card p-5">
                <div className="eyebrow">Links</div>
                <ul className="mt-3 space-y-2">
                  {domain.external_links.map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm hover:text-primary">
                        {l.label} <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {domainResumeUrl && (
              <div className="border border-primary bg-primary/5 p-5">
                <div className="eyebrow text-primary">Resume</div>
                <p className="mt-2 text-xs text-muted-foreground">A resume tailored to {domain.name}.</p>
                <a
                  href={mediaUrl(domainResumeUrl)}
                  download
                  className="mt-3 inline-flex items-center gap-2 border border-primary bg-primary px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground hard-shadow-hover"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden /> Download PDF
                </a>
              </div>
            )}
            <div className="border border-border bg-card p-5">
              <div className="eyebrow">Last updated</div>
              <div className="mt-1 font-mono text-sm">{domain.updated_at}</div>
            </div>
          </aside>
        </div>
      </PageShell>
    </>
  );
}
