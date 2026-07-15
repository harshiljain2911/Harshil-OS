import { motion } from "framer-motion";
import { PageMeta } from "@/components/seo/PageMeta";
import { useMemo } from "react";
import { useCollection } from "@/lib/useContent";
import { useFilters } from "@/hooks/useFilters";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { listContainer } from "@/lib/motionVariants";
import { T } from "@/lib/testIds";
import { cn } from "@/lib/utils";

const STATUSES = ["shipped", "in-progress", "archived", "prototype"];

export default function Projects() {
  const { data: projects = [], isLoading } = useCollection("projects");
  const { data: domains = [] } = useCollection("domains");
  const { get, getAll, set, toggle, clear } = useFilters();

  const q = get("q");
  const selectedDomains = getAll("domain");
  const selectedStatus = get("status");

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (q) {
        const blob = `${p.title} ${p.subtitle} ${(p.tags || []).join(" ")} ${(p.stack || []).join(" ")}`.toLowerCase();
        if (!blob.includes(q.toLowerCase())) return false;
      }
      if (selectedDomains.length && !selectedDomains.some((d) => (p.domain_slugs || []).includes(d))) return false;
      if (selectedStatus && p.status !== selectedStatus) return false;
      return true;
    });
  }, [projects, q, selectedDomains, selectedStatus]);

  return (
    <>
      <PageMeta title="Projects" />
      <PageShell>
        <SectionHeader
          eyebrow="/ projects"
          title="Projects Hub"
          subtitle="Ordered by depth of documentation × recency. Filters live in the URL."
        />

        {/* Mission-control stats, folded in from the old homepage dashboard */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Shipped", projects.filter((p) => p.status === "shipped").length, "text-primary"],
            ["In Progress", projects.filter((p) => p.status === "in-progress").length, "text-accent"],
            ["Prototypes", projects.filter((p) => p.status === "prototype").length, "text-foreground"],
            ["Domains Covered", new Set(projects.flatMap((p) => p.domain_slugs || [])).size, "text-terminal"],
          ].map(([label, n, color]) => (
            <div key={label} className="border border-border bg-card p-4">
              <div className="eyebrow">{label}</div>
              <div className={`mt-2 font-mono text-3xl font-bold ${color}`}>{String(n).padStart(2, "0")}</div>
            </div>
          ))}
        </div>

        <div className="mb-8 grid gap-4 border border-border bg-card p-4 md:grid-cols-[1fr_auto_auto]">
          <input
            data-testid={T.project.filterInput}
            type="search"
            value={q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="filter · title · tag · stack"
            aria-label="Filter projects"
            className="border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <select
            data-testid={T.project.filter("status")}
            value={selectedStatus}
            onChange={(e) => set("status", e.target.value)}
            className="border border-border bg-background px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground focus:border-primary"
          >
            <option value="">{"status · all"}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{`status · ${s}`}</option>)}
          </select>
          <button
            type="button"
            onClick={clear}
            className="border border-border bg-background px-3 py-2 text-xs uppercase tracking-[0.2em] hover:border-primary"
          >
            Clear
          </button>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {domains.map((d) => {
            const active = selectedDomains.includes(d.slug);
            return (
              <button
                key={d.slug}
                type="button"
                data-testid={T.project.filter(`domain-${d.slug}`)}
                onClick={() => toggle("domain", d.slug)}
                className={cn(
                  "border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground",
                )}
              >
                {d.name}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 animate-pulse border border-border bg-card" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border bg-muted/30 p-12 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
            No projects match these filters.
          </div>
        ) : (
          <motion.div
            data-testid={T.project.grid}
            variants={listContainer()}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((p) => <ProjectCard key={p.slug} project={p} />)}
          </motion.div>
        )}
      </PageShell>
    </>
  );
}
