import { Link } from "react-router-dom";
import { useCollection, useSite } from "@/lib/useContent";
import { PageMeta } from "@/components/seo/PageMeta";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { CertCard } from "@/components/cards/CertCard";

export default function Recruiter() {
  const { data: projects = [] } = useCollection("projects");
  const { data: experience = [] } = useCollection("experience");
  const { data: certs = [] } = useCollection("certifications");
  const { data: site } = useSite();
  const recruiter = site?.recruiter;
  const shipped = projects.filter((p) => p.status === "shipped").slice(0, 4);

  return (
    <>
      <PageMeta title="Recruiter Mode" />
      <PageShell>
        <SectionHeader
          eyebrow={recruiter?.eyebrow || "/ recruiter mode"}
          title={recruiter?.title || "For recruiters"}
          subtitle={recruiter?.subtitle || "Simplified view: shipped work, current role, credentials, resume."}
        />

        <section className="mb-16">
          <div className="eyebrow">Currently</div>
          {experience[0] && (
            <div className="mt-3 border border-primary bg-primary/5 p-6 md:p-8">
              <div className="mono-data text-[10px] text-primary">{experience[0].start} → now</div>
              <div className="mt-2 font-display text-3xl font-extrabold uppercase leading-none tracking-tight md:text-5xl">
                {experience[0].role}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{experience[0].org}</div>
              <p className="mt-4 max-w-2xl text-sm md:text-base">{experience[0].summary}</p>
            </div>
          )}
        </section>

        <section className="mb-16">
          <div className="eyebrow">Shipped</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {shipped.map((p) => <ProjectCard key={p.slug} project={p} />)}
          </div>
        </section>

        <section className="mb-16">
          <div className="eyebrow">Credentials</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {certs.slice(0, 6).map((c) => <CertCard key={c.slug} cert={c} />)}
          </div>
        </section>

        <section className="border border-primary bg-primary/5 p-8">
          <div className="eyebrow text-primary">{recruiter?.next_step_eyebrow || "/ next step"}</div>
          <div className="mt-2 font-display text-2xl font-extrabold uppercase leading-tight md:text-4xl">
            {recruiter?.next_step_title || "Grab the resume or reach out."}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/contact" className="border border-primary bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-primary-foreground hard-shadow-hover">
              Contact
            </Link>
            <Link to="/domains" className="border border-border bg-card px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] hover:border-primary">
              Domain Resumes
            </Link>
          </div>
        </section>
      </PageShell>
    </>
  );
}
