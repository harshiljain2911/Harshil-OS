/**
 * Experience — presented as software version releases instead of a timeline.
 * Earliest role = v1.0, each subsequent role bumps the major version. Cards
 * expand in place with responsibilities, highlights, and technologies.
 */
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { useCollection } from "@/lib/useContent";
import { cn } from "@/lib/utils";

function ReleaseCard({ entry, version, latest, open, onToggle, index }) {
  const period = `${entry.start || "—"} → ${entry.end || "now"}`;
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className={cn("border bg-card", latest ? "border-primary" : "border-border")}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-4 p-5 text-left md:items-center md:gap-6 md:p-6"
      >
        <span className={cn(
          "mono-data shrink-0 border px-2.5 py-1.5 text-xs",
          latest ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
        )}>
          v{version}.0
        </span>
        <span className="min-w-0 flex-1">
          <span className="mono-data block text-[10px] text-primary">
            release · {period}{latest ? " · current" : ""}
          </span>
          <span className="mt-1 block font-display text-lg font-extrabold uppercase leading-tight tracking-tight md:text-2xl">
            {entry.role}
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            {entry.org}{entry.location ? ` · ${entry.location}` : ""}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden"
          >
            <div className="space-y-6 border-t border-border p-5 md:p-6">
              {entry.summary && <p className="text-sm md:text-base">{entry.summary}</p>}
              {(entry.highlights || []).length > 0 && (
                <div>
                  <div className="eyebrow">Changelog</div>
                  <ul className="mt-3 space-y-2">
                    {entry.highlights.map((h, i) => (
                      <li key={i} className="flex gap-3 border-l-2 border-primary pl-3 text-sm">
                        <span className="mono-data text-[10px] text-primary">{String(i + 1).padStart(2, "0")}</span> {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(entry.stack || []).length > 0 && (
                <div>
                  <div className="eyebrow">Technologies</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {entry.stack.map((s) => (
                      <span key={s} className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default function Experience() {
  const { data: entries = [] } = useCollection("experience");
  const [openSlug, setOpenSlug] = useState(null);

  // API returns newest-first; version numbers count from the earliest role.
  const releases = useMemo(() => {
    const total = entries.length;
    return entries.map((e, i) => ({ entry: e, version: total - i }));
  }, [entries]);

  return (
    <>
      <PageMeta title="Experience" />
      <PageShell>
        <SectionHeader
          eyebrow="/ experience · release history"
          title="Experience"
          subtitle="Shipped versions of the engineer. Latest release first."
        />
        {releases.length === 0 ? (
          <div className="border border-dashed border-border bg-muted/30 p-12 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
            No releases yet.
          </div>
        ) : (
          <div className="max-w-3xl space-y-4">
            {releases.map(({ entry, version }, i) => (
              <ReleaseCard
                key={entry.slug}
                entry={entry}
                version={version}
                latest={i === 0}
                index={i}
                open={openSlug === entry.slug}
                onToggle={() => setOpenSlug(openSlug === entry.slug ? null : entry.slug)}
              />
            ))}
          </div>
        )}
      </PageShell>
    </>
  );
}
