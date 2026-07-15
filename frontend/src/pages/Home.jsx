import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Cpu, Layers } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useCollection, useSite } from "@/lib/useContent";
import { PageShell } from "@/components/layout/PageShell";
import { DomainCard } from "@/components/cards/DomainCard";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { BlogCard } from "@/components/cards/BlogCard";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { StructuredData, personSchema } from "@/components/seo/StructuredData";
import { fadeUp, listContainer } from "@/lib/motionVariants";
import { T } from "@/lib/testIds";

const STEPS = [
  { n: "01", label: "Boot" },
  { n: "02", label: "Domains" },
  { n: "03", label: "Featured Project" },
  { n: "04", label: "Selected Projects" },
  { n: "05", label: "Writing" },
  { n: "06", label: "Timeline Ping" },
  { n: "07", label: "Contact CTA" },
  { n: "08", label: "Signoff" },
];

const StepLabel = ({ i, label }) => (
  <div className="flex items-center gap-3">
    <span className="mono-data text-[10px] text-primary">step·{STEPS[i].n}</span>
    <span className="h-px w-8 bg-border" />
    <span className="eyebrow">{label || STEPS[i].label}</span>
  </div>
);

export default function Home({ onOpenTerminal }) {
  const { data: domains = [] } = useCollection("domains");
  const { data: projects = [] } = useCollection("projects");
  const { data: blog = [] } = useCollection("blog");
  const { data: timeline = [] } = useCollection("timeline");
  const { data: site } = useSite();

  const featured = projects.find((p) => p.featured) || projects[0];
  const otherProjects = projects.filter((p) => p.slug !== featured?.slug).slice(0, 4);

  const identity = site?.identity;
  const hero = site?.hero;

  return (
    <>
      <Helmet>
        <title>{identity ? `${identity.display_name}${identity.brand_suffix ? ` ${identity.brand_suffix}` : ""} — ${identity.tagline}` : "Harshil OS — An engineer's operating system"}</title>
        <meta name="description" content={site?.seo?.default_description || "Harshil Jain — B.Tech ECE student building across embedded hardware, full-stack software, and applied AI."} />
      </Helmet>
      <StructuredData data={personSchema(site)} />

      {/* 01 · Boot / Hero */}
      <section data-testid={T.home.step(1)} className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-lines pointer-events-none opacity-40" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] w-full animate-scan bg-primary/50" aria-hidden />
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-16 md:px-8 md:pb-32 md:pt-24">
          <motion.div variants={listContainer(0.08)} initial="hidden" animate="show">
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <span className="border border-primary bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-primary">
                {hero?.badge || "v1.0 · booting"}
              </span>
              <StepLabel i={0} label="/ boot" />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="mt-8 max-w-5xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tighter sm:text-6xl lg:text-7xl"
              data-testid={T.home.hero}
            >
              {identity?.display_name || "Harshil"}<span className="text-primary">/</span>{identity?.brand_suffix || "OS"} —<br />
              {hero?.headline_line2 || "an engineer's"}<br />{hero?.headline_line3 || "operating system."}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-sm text-muted-foreground md:text-base">
              {hero?.subhead || "Embedded systems, full-stack software, and applied AI — engineered end to end."}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/projects"
                data-testid={T.home.heroCtaProjects}
                className="inline-flex items-center gap-2 border border-primary bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-primary-foreground hard-shadow-hover"
              >
                {hero?.cta_primary_label || "See Projects"} <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                data-testid={T.home.heroCta}
                onClick={onOpenTerminal}
                className="inline-flex items-center gap-2 border border-border bg-card px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] hover:border-primary"
              >
                {hero?.cta_secondary_label || "Terminal"}
              </button>
            </motion.div>

            {/* Mode explanations — guide first-time visitors. Subtle OS styling. */}
            <motion.div variants={fadeUp} className="mt-10 grid max-w-3xl divide-y divide-border border border-border md:grid-cols-2 md:divide-x md:divide-y-0">
              {[
                {
                  to: "/recruiter",
                  label: "Recruiter Mode",
                  desc: site?.identity?.recruiter_summary || "Quick overview of projects, experience, resume and achievements for hiring managers.",
                },
                {
                  to: "/developer",
                  label: "Developer Mode",
                  desc: site?.identity?.developer_summary || "Architecture decisions, engineering philosophy, repositories, implementation notes and technical depth.",
                },
              ].map((m) => (
                <div key={m.to} className="flex flex-col gap-3 p-5">
                  <div className="eyebrow">{m.label}</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
                  <Link
                    to={m.to}
                    className="mt-auto inline-flex w-fit items-center gap-2 border border-border bg-card px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground hover:border-primary hover:text-foreground"
                  >
                    Open <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8">
              <SocialLinks social={site?.social || {}} variant="row" />
            </motion.div>
            <motion.div variants={fadeUp} className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3">
              {[
                { icon: Cpu, k: "focus", v: hero?.stat_focus_value || "AI Systems" },
                { icon: Layers, k: "domains", v: `${domains.length}` },
                { icon: Sparkles, k: "shipped", v: `${projects.filter((p) => p.status === "shipped").length}` },
              ].map(({ icon: Icon, k, v }) => (
                <div key={k} className="border border-border bg-card p-4">
                  <div className="flex items-center gap-2 eyebrow"><Icon className="h-3 w-3" /> {k}</div>
                  <div className="mt-2 font-mono text-lg">{v}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <PageShell className="space-y-24 md:space-y-32">
        {/* 02 · Domains */}
        <section data-testid={T.home.step(2)}>
          <StepLabel i={1} />
          <h2 className="mt-4 font-display text-3xl font-extrabold uppercase leading-none tracking-tight md:text-5xl">
            Engineering domains
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            The rooms of the house. Ordered by depth of practice — featured domain gets the wide slot.
          </p>
          <motion.div
            data-testid={T.home.domainsBlock}
            variants={listContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-10 grid gap-4 md:grid-cols-3 md:grid-rows-2"
          >
            {domains.map((d, i) => (
              <DomainCard key={d.slug} domain={d} featured={i === 0} />
            ))}
          </motion.div>
        </section>

        {/* 03 · Featured Project */}
        {featured && (
          <section data-testid={T.home.step(3)}>
            <StepLabel i={2} />
            <div className="mt-4 grid gap-6 md:grid-cols-12">
              <div className="md:col-span-5">
                <div className="eyebrow">Highlight · {featured.year}</div>
                <h2 className="mt-4 font-display text-3xl font-extrabold uppercase leading-none tracking-tight md:text-5xl">
                  {featured.title}
                </h2>
                <p className="mt-4 text-sm text-muted-foreground md:text-base">{featured.subtitle}</p>
                <Link
                  to={`/projects/${featured.slug}`}
                  className="mt-6 inline-flex items-center gap-2 border border-border bg-card px-4 py-2 text-xs uppercase tracking-[0.24em] hover:border-primary"
                >
                  Read case study <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="md:col-span-7">
                <div className="border border-border bg-card p-6">
                  <div className="eyebrow">Metrics</div>
                  <ul className="mt-4 space-y-3">
                    {(featured.metrics || []).map((m, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mono-data mt-0.5 text-[10px] text-primary">{String(i + 1).padStart(2, "0")}</span>
                        <span className="text-sm">{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 04 · Selected Projects */}
        <section data-testid={T.home.step(4)}>
          <StepLabel i={3} />
          <div className="mt-4 flex items-end justify-between">
            <h2 className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight md:text-5xl">
              Selected projects
            </h2>
            <Link to="/projects" className="eyebrow hover:text-primary">See all →</Link>
          </div>
          <motion.div
            data-testid={T.home.projectsBlock}
            variants={listContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-10 grid gap-4 md:grid-cols-2"
          >
            {otherProjects.map((p) => <ProjectCard key={p.slug} project={p} />)}
          </motion.div>
        </section>

        {/* 05 · Writing */}
        <section data-testid={T.home.step(5)}>
          <StepLabel i={4} />
          <div className="mt-4 flex items-end justify-between">
            <h2 className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight md:text-5xl">
              Writing
            </h2>
            <Link to="/blog" className="eyebrow hover:text-primary">Read all →</Link>
          </div>
          <motion.div
            variants={listContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-10 grid gap-4 md:grid-cols-3"
          >
            {blog.slice(0, 3).map((b) => <BlogCard key={b.slug} post={b} />)}
          </motion.div>
        </section>

        {/* 06 · Timeline Ping */}
        <section data-testid={T.home.step(6)}>
          <StepLabel i={5} />
          <div className="mt-4 border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div className="eyebrow">Recent events</div>
              <Link to="/timeline" className="eyebrow hover:text-primary">Timeline →</Link>
            </div>
            <ul className="divide-y divide-border">
              {timeline.slice(0, 4).map((t) => (
                <li key={t.slug} className="flex items-baseline gap-6 px-6 py-4">
                  <span className="mono-data text-[10px] text-primary">{t.date}</span>
                  <span className="text-sm">{t.title}</span>
                  <span className="ml-auto eyebrow">{t.category}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 07 · Contact CTA */}
        <section data-testid={T.home.step(7)}>
          <StepLabel i={6} />
          <div className="mt-4 border border-primary bg-primary/5 p-8 md:p-16">
            <div className="eyebrow text-primary">/ contact</div>
            <h2 className="mt-4 font-display text-3xl font-extrabold uppercase leading-none tracking-tight md:text-6xl">
              Building something?<br /> Say hello.
            </h2>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
              Open to interesting problems in embedded systems, full-stack software, or applied AI. Terminal and assistant are also open right now.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/contact"
                data-testid={T.home.contactCta}
                className="inline-flex items-center gap-2 border border-primary bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-primary-foreground hard-shadow-hover"
              >
                Open contact form <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 08 · Signoff */}
        <section data-testid={T.home.step(8)} className="border-t border-border pt-16">
          <StepLabel i={7} />
          <p className="mt-4 max-w-2xl font-display text-2xl font-extrabold uppercase leading-tight tracking-tight md:text-4xl">
            Everything on this page is a git-diffable file. Nothing here is a slide.
          </p>
        </section>
      </PageShell>
    </>
  );
}
