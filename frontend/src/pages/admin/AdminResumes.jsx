/**
 * Resume Management — a dedicated CMS list for the `resumes` collection with
 * rich cards (Edit / Preview / Download / Duplicate / Delete + Featured badge).
 * Create/Edit reuse the schema-driven AdminEditor; PDFs upload to uploads/resumes/.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Eye, Download, Copy, Trash2, Star, FileText } from "lucide-react";
import { adminCreateItem, adminDeleteItem, adminGetItem, adminListContent } from "@/lib/adminApi";
import { mediaUrl } from "./MediaPicker";

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

const fmtTime = (ts) => (ts ? new Date(ts * 1000).toLocaleDateString() : "—");

/** Load full resume records (list gives slugs/status; we fetch each for the cards). */
function useResumesFull() {
  return useQuery({
    queryKey: ["admin-resumes-full"],
    queryFn: async () => {
      const list = await adminListContent("resumes");
      const full = await Promise.all(
        list.map(async (it) => {
          const { data, status } = await adminGetItem("resumes", it.slug);
          return { ...data, _status: status, _updated: it.updated_at };
        }),
      );
      return full;
    },
  });
}

export default function AdminResumes() {
  const qc = useQueryClient();
  const { data: resumes = [], isLoading, error } = useResumesFull();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-resumes-full"] });
    qc.invalidateQueries({ queryKey: ["admin-list", "resumes"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["collection", "resumes"] });
  };

  const sorted = useMemo(
    () => [...resumes].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b._updated || 0) - (a._updated || 0)),
    [resumes],
  );

  const del = async (slug) => {
    if (!window.confirm(`Delete resume “${slug}”? This removes the record (the PDF stays in Media).`)) return;
    try { await adminDeleteItem("resumes", slug); refresh(); }
    catch (e) { alert(e?.response?.data?.detail || "Delete failed."); }
  };

  const duplicate = async (r) => {
    const base = r.slug.replace(/-copy(-\d+)?$/, "");
    let slug = `${base}-copy`;
    let n = 2;
    const existing = new Set(resumes.map((x) => x.slug));
    while (existing.has(slug)) slug = `${base}-copy-${n++}`;
    const data = {
      ...r, slug, title: `${r.title} (copy)`, featured: false,
      updated_at: new Date().toISOString().slice(0, 10),
    };
    delete data._status;
    delete data._updated;
    try { await adminCreateItem("resumes", data, "draft"); refresh(); }
    catch (e) { alert(e?.response?.data?.detail || "Duplicate failed."); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight md:text-4xl">Resume Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload and manage every resume. Publish and it appears on the site instantly.</p>
        </div>
        <Link to="/admin/content/resumes/new" className="inline-flex items-center gap-2 border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground">
          <Plus className="h-4 w-4" /> Add Resume
        </Link>
      </div>

      {isLoading && <div className="mt-8 h-48 animate-pulse border border-border bg-card" />}
      {error && <p className="mt-8 text-sm text-destructive">Failed to load resumes.</p>}

      {!isLoading && !error && sorted.length === 0 && (
        <div className="mt-8 border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No resumes yet. Click <span className="text-foreground">Add Resume</span> to upload your first PDF.
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((r) => (
          <article key={r.slug} className="flex flex-col border border-border bg-card">
            {/* thumbnail / pdf glyph */}
            <div className="grid h-32 place-items-center overflow-hidden border-b border-border bg-background">
              {r.thumbnail_url ? (
                <img src={mediaUrl(r.thumbnail_url)} alt="" className="h-full w-full object-contain p-2" loading="lazy" />
              ) : (
                <FileText className="h-10 w-10 text-primary/40" aria-hidden />
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-sm font-bold uppercase leading-snug">{r.title}</h3>
                {r.featured && (
                  <span className="inline-flex shrink-0 items-center gap-1 border border-primary bg-primary/10 px-2 py-0.5 text-[9px] uppercase tracking-widest text-primary">
                    <Star className="h-2.5 w-2.5 fill-current" aria-hidden /> Featured
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="border border-border px-2 py-0.5">{TYPE_LABEL[r.resume_type] || r.resume_type}</span>
                {r.version && <span className="border border-border px-2 py-0.5">{r.version}</span>}
                <span className={`border px-2 py-0.5 ${r._status === "published" ? "border-terminal text-terminal" : "border-primary text-primary"}`}>{r._status}</span>
              </div>
              {r.description && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>}
              <div className="mono-data mt-2 text-[10px] text-muted-foreground">updated · {fmtTime(r._updated)}</div>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <Link to={`/admin/content/resumes/${r.slug}`} title="Edit" className="inline-flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] hover:border-primary">
                  <Pencil className="h-3 w-3" /> Edit
                </Link>
                {r.pdf_url && (
                  <>
                    <a href={mediaUrl(r.pdf_url)} target="_blank" rel="noreferrer" title="Preview" className="inline-flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] hover:border-primary">
                      <Eye className="h-3 w-3" /> Preview
                    </a>
                    <a href={mediaUrl(r.pdf_url)} download title="Download" className="inline-flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] hover:border-primary">
                      <Download className="h-3 w-3" /> Download
                    </a>
                  </>
                )}
                <button type="button" onClick={() => duplicate(r)} title="Duplicate" className="ml-auto text-muted-foreground hover:text-primary"><Copy className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => del(r.slug)} title="Delete" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
