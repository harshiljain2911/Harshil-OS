import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowUpCircle, ArchiveRestore } from "lucide-react";
import { adminListContent, adminSetStatus, adminDeleteItem } from "@/lib/adminApi";

const STATUS_STYLE = {
  published: "border-terminal text-terminal",
  draft: "border-primary text-primary",
  archived: "border-muted-foreground text-muted-foreground",
};

export default function AdminCollection() {
  const { collection } = useParams();
  const qc = useQueryClient();
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["admin-list", collection],
    queryFn: () => adminListContent(collection),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-list", collection] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["collection", collection] });
  };

  const setStatus = async (slug, status) => {
    try { await adminSetStatus(collection, slug, status); refresh(); }
    catch (e) { alert(e?.response?.data?.detail || "Failed"); }
  };

  const del = async (slug) => {
    if (!window.confirm(`Delete ${collection}/${slug}? This removes the file permanently.`)) return;
    try { await adminDeleteItem(collection, slug); refresh(); }
    catch (e) { alert(e?.response?.data?.detail || "Failed"); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight md:text-4xl">{collection}</h1>
        <Link
          to={`/admin/content/${collection}/new`}
          className="inline-flex items-center gap-2 border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add
        </Link>
      </div>

      {isLoading && <div className="mt-8 h-48 animate-pulse border border-border bg-card" />}
      {error && <p className="mt-8 text-sm text-destructive">Failed to load.</p>}

      {!isLoading && !error && (
        <div className="mt-6 overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 eyebrow font-normal">Title</th>
                <th className="px-4 py-3 eyebrow font-normal">Slug</th>
                <th className="px-4 py-3 eyebrow font-normal">Status</th>
                <th className="px-4 py-3 eyebrow font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nothing here yet. Click Add to create the first entry.</td></tr>
              )}
              {items.map((it) => (
                <tr key={`${it.slug}-${it.status}`}>
                  <td className="px-4 py-3">
                    <Link to={`/admin/content/${collection}/${it.slug}`} className="hover:text-primary">{it.title}</Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{it.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`border px-2 py-0.5 text-[10px] uppercase tracking-widest ${STATUS_STYLE[it.status]}`}>{it.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {it.status !== "published" && (
                        <button type="button" title="Publish" onClick={() => setStatus(it.slug, "published")} className="text-muted-foreground hover:text-terminal">
                          <ArrowUpCircle className="h-4 w-4" />
                        </button>
                      )}
                      {it.status === "published" && (
                        <button type="button" title="Unpublish (to draft)" onClick={() => setStatus(it.slug, "draft")} className="text-muted-foreground hover:text-primary">
                          <ArchiveRestore className="h-4 w-4" />
                        </button>
                      )}
                      <button type="button" title="Delete" onClick={() => del(it.slug)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
