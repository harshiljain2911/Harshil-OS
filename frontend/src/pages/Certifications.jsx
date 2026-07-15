/**
 * Certifications — filterable by domain, premium cards, fullscreen viewer.
 * Filtering is instant (client-side); the viewer is an animated overlay.
 */
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, ExternalLink, X } from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { CertCard, mediaUrl } from "@/components/cards/CertCard";
import { useCollection } from "@/lib/useContent";
import { listContainer } from "@/lib/motionVariants";
import { cn } from "@/lib/utils";

function CertViewer({ cert, onClose }) {
  return (
    <AnimatePresence>
      {cert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] grid place-items-center bg-black/90 p-4 md:p-10"
          role="dialog"
          aria-modal="true"
          aria-label={`Certificate: ${cert.title}`}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ duration: 0.22 }}
            className="flex max-h-full w-full max-w-3xl flex-col border border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="eyebrow">certificate · viewer</span>
              <button type="button" onClick={onClose} aria-label="Close viewer" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {cert.image_url ? (
                <img src={mediaUrl(cert.image_url)} alt={cert.title} className="w-full object-contain" />
              ) : (
                <div className="grid h-64 place-items-center">
                  <Award className="h-16 w-16 text-primary/30" aria-hidden />
                </div>
              )}
            </div>
            <div className="border-t border-border p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-extrabold uppercase leading-tight">{cert.title}</h3>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {cert.issuer} · {cert.issued_at}
                    {cert.credential_id && <span className="mono-data ml-2">ID · {cert.credential_id}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(cert.skills || []).map((s) => (
                      <span key={s} className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </div>
                {cert.credential_url && (
                  <a
                    href={cert.credential_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-2 border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground hard-shadow-hover"
                  >
                    Verify <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Certifications() {
  const { data: certs = [] } = useCollection("certifications");
  const { data: domains = [] } = useCollection("domains");
  const [filter, setFilter] = useState("all");
  const [viewing, setViewing] = useState(null);

  // Only offer filters for domains that actually have certifications.
  const filterOptions = useMemo(() => {
    const used = new Set(certs.flatMap((c) => c.domain_slugs || []));
    return domains.filter((d) => used.has(d.slug));
  }, [certs, domains]);

  const visible = useMemo(
    () => (filter === "all" ? certs : certs.filter((c) => (c.domain_slugs || []).includes(filter))),
    [certs, filter],
  );

  return (
    <>
      <PageMeta title="Certifications" />
      <PageShell>
        <SectionHeader
          eyebrow="/ certifications"
          title="Certifications"
          subtitle="Structured credentials — filter by domain, click to inspect, verify at the issuer."
        />

        {filterOptions.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {[{ slug: "all", name: "All" }, ...filterOptions].map((d) => (
              <button
                key={d.slug}
                type="button"
                onClick={() => setFilter(d.slug)}
                className={cn(
                  "border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition-colors",
                  filter === d.slug
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground",
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="border border-dashed border-border bg-muted/30 p-12 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
            {certs.length === 0 ? "No certifications published yet." : "No certifications in this domain yet."}
          </div>
        ) : (
          <motion.div
            key={filter}
            variants={listContainer()}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visible.map((c) => <CertCard key={c.slug} cert={c} onOpen={setViewing} />)}
          </motion.div>
        )}
      </PageShell>
      <CertViewer cert={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
