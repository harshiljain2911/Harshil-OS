/**
 * Resume Hub — reads the CMS `resumes` collection (Admin → Resume Management).
 * A featured/general resume leads; specialized + custom resumes follow as cards.
 * Legacy fallback: if the collection is empty, still shows site.resume.file_url
 * and per-domain resume_url. View opens the professional fullscreen ResumeViewer.
 */
import { Suspense, lazy, useState } from "react";
import { motion } from "framer-motion";
import { Download, Printer, Eye, FileText, Star } from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { useCollection, useSite } from "@/lib/useContent";
import { API } from "@/lib/api";

// Lazy — react-pdf/pdf.js only loads when a resume is actually opened.
const ResumeViewer = lazy(() =>
  import("@/components/media/ResumeViewer").then((m) => ({ default: m.ResumeViewer })));

const backendOrigin = API.replace(/\/api$/, "");
const resolve = (u) => (u && u.startsWith("/") ? backendOrigin + u : u);

const TYPE_LABEL = {
  general: "General",
  "artificial-intelligence": "Artificial Intelligence",
  "software-engineering": "Software Engineering",
  "embedded-systems": "Embedded Systems",
  "electronics-engineering": "Electronics Engineering",
  "robotics-iot": "Robotics & IoT",
  "ui-ux-design": "UI/UX Design",
  custom: "Custom",
};

function printPdf(url) {
  const src = resolve(url);
  try {
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    frame.src = src;
    frame.onload = () => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch { window.open(src, "_blank", "noopener"); }
    };
    document.body.appendChild(frame);
    setTimeout(() => frame.parentNode && frame.parentNode.removeChild(frame), 60000);
  } catch {
    window.open(src, "_blank", "noopener");
  }
}

function ResumeActions({ url, compact, onView }) {
  const size = compact ? "px-3 py-1.5 text-[10px]" : "px-4 py-2 text-xs";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onView} className={`inline-flex items-center gap-2 border border-primary bg-primary ${size} font-bold uppercase tracking-[0.2em] text-primary-foreground hard-shadow-hover`}>
        <Eye className="h-3.5 w-3.5" aria-hidden /> View
      </button>
      <a href={resolve(url)} download className={`inline-flex items-center gap-2 border border-border bg-card ${size} font-bold uppercase tracking-[0.2em] hover:border-primary`}>
        <Download className="h-3.5 w-3.5" aria-hidden /> Download
      </a>
      <button type="button" onClick={() => printPdf(url)} className={`inline-flex items-center gap-2 border border-border bg-card ${size} font-bold uppercase tracking-[0.2em] hover:border-primary`}>
        <Printer className="h-3.5 w-3.5" aria-hidden /> Print
      </button>
    </div>
  );
}

function ResumeCard({ item, onView }) {
  return (
    <motion.article initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.35 }} className="flex flex-col border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow flex items-center gap-2">
            / {TYPE_LABEL[item.type] || "resume"}
            {item.featured && <Star className="h-3 w-3 fill-current text-primary" aria-hidden />}
          </div>
          <h3 className="mt-2 font-display text-lg font-bold uppercase leading-snug">{item.title}</h3>
          {item.description && <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>}
          {item.version && <div className="mono-data mt-2 text-[10px] text-muted-foreground">{item.version}</div>}
        </div>
        <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      </div>
      <div className="mt-auto pt-5">
        {item.url ? (
          <ResumeActions url={item.url} compact onView={() => onView(item)} />
        ) : (
          <div className="border border-dashed border-border bg-background px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Not uploaded yet</div>
        )}
      </div>
    </motion.article>
  );
}

export default function Resume() {
  const { data: site } = useSite();
  const { data: resumes = [] } = useCollection("resumes");
  const { data: domains = [] } = useCollection("domains");
  const [viewer, setViewer] = useState(null); // { url, title, type, version, updatedAt }

  const openViewer = (item) => setViewer(item);

  // Normalize collection entries.
  const entries = resumes.map((r) => ({
    key: r.slug, title: r.title, description: r.description, version: r.version,
    featured: r.featured, type: r.resume_type, url: r.pdf_url, updatedAt: r.updated_at,
  }));

  // Lead resume: featured, else a general one, else legacy site.resume.file_url.
  const featured = entries.find((e) => e.featured);
  const generalEntry = entries.find((e) => e.type === "general");
  let lead = featured || generalEntry;
  if (!lead && site?.resume?.file_url) {
    lead = { key: "legacy-general", title: "General Resume", type: "general", url: site.resume.file_url, description: site?.resume?.role_line };
  }

  const cards = entries.filter((e) => e.key !== lead?.key);
  const coveredTypes = new Set(entries.map((e) => e.type));
  const legacyDomainCards = domains
    .filter((d) => d.resume_url && !coveredTypes.has(d.slug))
    .map((d) => ({ key: `legacy-${d.slug}`, title: `${d.name} Resume`, type: d.slug, url: d.resume_url, description: d.tagline }));
  const allCards = [...cards, ...legacyDomainCards];

  return (
    <>
      <PageMeta title="Resume" />
      <PageShell>
        <SectionHeader
          eyebrow="/ resume"
          title="Professional Resume"
          subtitle="This page contains my professional resumes for different engineering domains."
        />

        {/* Lead / general resume */}
        <section className="mb-14">
          <div className="eyebrow">General resume</div>
          <div className="mt-4 border border-primary bg-primary/5 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="eyebrow flex items-center gap-2 text-primary">
                  {lead?.featured && <Star className="h-3 w-3 fill-current" aria-hidden />}
                  {lead ? (TYPE_LABEL[lead.type] || "resume") : "resume"}
                </div>
                <h2 className="mt-2 font-display text-2xl font-extrabold uppercase leading-none tracking-tight md:text-3xl">
                  {lead?.title || `${site?.identity?.display_name || "Harshil"} · Resume`}
                </h2>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
                  {lead?.description || site?.identity?.professional_headline || "A single overview across hardware, software, and AI."}
                </p>
              </div>
              <FileText className="h-8 w-8 shrink-0 text-primary" aria-hidden />
            </div>
            <div className="mt-6">
              {lead?.url ? (
                <ResumeActions url={lead.url} onView={() => openViewer(lead)} />
              ) : (
                <div className="border border-dashed border-border bg-background px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  No resume uploaded yet — add one in Admin → Resume Management.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Specialized + custom resumes */}
        {allCards.length > 0 && (
          <section>
            <div className="eyebrow">Specialized resumes</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allCards.map((item) => (
                <ResumeCard key={item.key} item={item} onView={openViewer} />
              ))}
            </div>
          </section>
        )}
      </PageShell>

      {viewer && (
        <Suspense fallback={null}>
          <ResumeViewer
            open={!!viewer}
            onClose={() => setViewer(null)}
            url={viewer?.url}
            title={viewer?.title}
            typeLabel={TYPE_LABEL[viewer.type] || "Resume"}
            version={viewer?.version}
            updatedAt={viewer?.updatedAt}
          />
        </Suspense>
      )}
    </>
  );
}
