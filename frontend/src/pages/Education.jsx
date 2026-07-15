/**
 * Education — rendered as a boot sequence, not a timeline. Each stage of the
 * academic path is a numbered boot step with expandable detail (coursework,
 * achievements, related projects). Data lives in site.json → education,
 * editable from the admin panel (Site → education).
 */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { useSite } from "@/lib/useContent";
import { cn } from "@/lib/utils";

const Detail = ({ label, children }) => (
  <div>
    <div className="eyebrow">{label}</div>
    <div className="mt-2">{children}</div>
  </div>
);

function EducationCard({ entry, index, open, onToggle }) {
  const period = [entry.start, entry.end].filter(Boolean).join(" → ") || (entry.start ? `${entry.start} → now` : "");
  const hasDetail =
    (entry.coursework || []).length > 0 ||
    (entry.achievements || []).length > 0 ||
    (entry.related_project_slugs || []).length > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="relative border border-border bg-card"
    >
      {/* circuit trace connecting boot stages */}
      {index > 0 && (
        <span className="absolute -top-6 left-8 h-6 w-px bg-border" aria-hidden />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-4 p-5 text-left md:items-center md:gap-6 md:p-6"
      >
        <span className="mono-data grid h-10 w-10 shrink-0 place-items-center border border-primary bg-primary/10 text-xs text-primary">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mono-data block text-[10px] text-primary">
            boot·stage {period && `· ${period}`}
          </span>
          <span className="mt-1 block font-display text-lg font-extrabold uppercase leading-tight tracking-tight md:text-2xl">
            {entry.degree}{entry.field ? ` — ${entry.field}` : ""}
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            {entry.school}{entry.location ? ` · ${entry.location}` : ""}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {entry.cgpa && (
            <span className="hidden border border-border px-2 py-1 font-mono text-xs text-foreground sm:inline">
              CGPA {entry.cgpa}
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
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
              {entry.cgpa && (
                <p className="font-mono text-xs text-muted-foreground sm:hidden">CGPA {entry.cgpa}</p>
              )}
              {(entry.coursework || []).length > 0 && (
                <Detail label="Relevant coursework">
                  <div className="flex flex-wrap gap-1.5">
                    {entry.coursework.map((c) => (
                      <span key={c} className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {c}
                      </span>
                    ))}
                  </div>
                </Detail>
              )}
              {(entry.achievements || []).length > 0 && (
                <Detail label="Achievements">
                  <ul className="space-y-2">
                    {entry.achievements.map((a, i) => (
                      <li key={i} className="flex gap-3 border-l-2 border-primary pl-3 text-sm">
                        <span className="mono-data text-[10px] text-primary">{String(i + 1).padStart(2, "0")}</span> {a}
                      </li>
                    ))}
                  </ul>
                </Detail>
              )}
              {(entry.related_project_slugs || []).length > 0 && (
                <Detail label="Related projects">
                  <div className="flex flex-wrap gap-1.5">
                    {entry.related_project_slugs.map((s) => (
                      <Link
                        key={s}
                        to={`/projects/${s}`}
                        className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-foreground"
                      >
                        {s}
                      </Link>
                    ))}
                  </div>
                </Detail>
              )}
              {!hasDetail && !entry.summary && (
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Details coming soon.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default function Education() {
  const { data: site } = useSite();
  const entries = site?.education || [];
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <>
      <PageMeta title="Education" />
      <PageShell>
        <SectionHeader
          eyebrow="/ education · boot sequence"
          title="Education"
          subtitle="The academic boot sequence — each stage initialized the next."
        />
        {entries.length === 0 ? (
          <div className="border border-dashed border-border bg-muted/30 p-12 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
            No education entries yet.
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            {entries.map((e, i) => (
              <EducationCard
                key={`${e.school}-${i}`}
                entry={e}
                index={i}
                open={openIdx === i}
                onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
              />
            ))}
          </div>
        )}
      </PageShell>
    </>
  );
}
