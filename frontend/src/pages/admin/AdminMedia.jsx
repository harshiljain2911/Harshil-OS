import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { adminMediaDelete, adminMediaList, adminMediaUpload } from "@/lib/adminApi";
import { mediaUrl } from "./MediaPicker";
import { cn } from "@/lib/utils";

const fmtSize = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export default function AdminMedia() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const { data, isLoading } = useQuery({ queryKey: ["admin-media", "all"], queryFn: () => adminMediaList() });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const files = data?.files || [];
  const categories = data?.categories || [];
  const shown = tab === "all" ? files : files.filter((f) => f.category === tab);
  const uploadCategory = tab === "all" ? "images" : tab;

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-media"] });

  const upload = async (fileList) => {
    setError("");
    setUploading(true);
    try {
      for (const f of fileList) await adminMediaUpload(f, uploadCategory);
      refresh();
    } catch (e) {
      setError(e?.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const del = async (url) => {
    if (!window.confirm(`Delete this file?`)) return;
    try { await adminMediaDelete(url); refresh(); }
    catch (e) { setError(e?.response?.data?.detail || "Delete failed."); }
  };

  const copyUrl = (url) => navigator.clipboard?.writeText(mediaUrl(url));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight md:text-4xl">Media library</h1>
          <p className="mt-1 text-sm text-muted-foreground">Images, videos, PDFs — uploaded once, reused anywhere. Organized by folder.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Upload to {uploadCategory}
          <input ref={inputRef} type="file" multiple className="hidden"
            accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx,.txt"
            onChange={(e) => e.target.files?.length && upload(Array.from(e.target.files))} />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {["all", ...categories].map((c) => (
          <button key={c} type="button" onClick={() => setTab(c)}
            className={cn("border px-3 py-1.5 text-xs uppercase tracking-[0.18em]",
              tab === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground")}>
            {c}
          </button>
        ))}
      </div>

      {error && <div className="mt-4 border border-destructive bg-destructive/10 px-4 py-3 text-xs text-destructive">{error}</div>}
      {isLoading && <div className="mt-6 h-48 animate-pulse border border-border bg-card" />}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {!isLoading && shown.length === 0 && (
          <p className="col-span-full border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nothing in {tab === "all" ? "the library" : `“${tab}”`} yet. Upload to add.
          </p>
        )}
        {shown.map((f) => (
          <div key={f.url} className="flex flex-col border border-border bg-card">
            <div className="grid h-28 place-items-center overflow-hidden border-b border-border bg-background">
              {f.kind === "image" ? (
                <img src={mediaUrl(f.url)} alt={f.name} className="h-full w-full object-cover" loading="lazy" />
              ) : f.kind === "video" ? (
                <video src={mediaUrl(f.url)} className="h-full w-full object-cover" muted />
              ) : (
                <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <div className="truncate font-mono text-xs" title={f.name}>{f.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{f.category} · {fmtSize(f.size)}</div>
              <div className="mt-auto flex items-center gap-2 pt-2">
                <button type="button" title="Copy URL" onClick={() => copyUrl(f.url)} className="text-muted-foreground hover:text-primary"><Copy className="h-3.5 w-3.5" /></button>
                <button type="button" title="Delete" onClick={() => del(f.url)} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
