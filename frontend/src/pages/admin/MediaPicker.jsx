/**
 * Upload-first media controls for the CMS. Admins never type URLs — they
 * Upload (file picker → backend stores it) or Browse (reuse existing library
 * media). Used by SchemaForm for image/video/doc fields and media galleries.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, FileText, FolderOpen, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { API } from "@/lib/api";
import { adminMediaList, adminMediaUpload } from "@/lib/adminApi";

const backendOrigin = API.replace(/\/api$/, "");
export const mediaUrl = (u) => (u && u.startsWith("/") ? backendOrigin + u : u);

const IMG_RE = /\.(png|jpe?g|webp|gif|svg|ico)$/i;
const VID_RE = /\.(mp4|webm|mov)$/i;
export const kindOf = (u = "") => (VID_RE.test(u) ? "video" : IMG_RE.test(u) ? "image" : "doc");

const ACCEPT_ATTR = {
  image: "image/png,image/jpeg,image/webp,image/gif,image/svg+xml",
  video: "video/mp4,video/webm,video/quicktime",
  doc: ".pdf,.doc,.docx,.txt",
  any: "",
};
const matchesAccept = (accept, k) =>
  accept === "any" || !accept ? true : accept === k;

function Preview({ url, className = "h-28" }) {
  const k = kindOf(url);
  if (k === "image") return <img src={mediaUrl(url)} alt="" className={`${className} w-full object-cover`} loading="lazy" />;
  if (k === "video") return <video src={mediaUrl(url)} className={`${className} w-full object-cover`} muted />;
  return (
    <div className={`${className} grid w-full place-items-center bg-background`}>
      <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
    </div>
  );
}

function LibraryModal({ open, category, accept = "any", onPick, onClose }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-media", category || "all"],
    queryFn: () => adminMediaList(category),
    enabled: open,
  });
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const files = (data?.files || []).filter((f) => matchesAccept(accept, f.kind));

  const upload = async (fileList) => {
    setUploading(true);
    try {
      let last = null;
      for (const f of fileList) last = await adminMediaUpload(f, category);
      qc.invalidateQueries({ queryKey: ["admin-media"] });
      if (last) onPick(last);
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col border border-border bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="eyebrow flex items-center gap-2"><FolderOpen className="h-3.5 w-3.5" /> Media library{category ? ` · ${category}` : ""}</span>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 border border-primary bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />} Upload
              <input ref={inputRef} type="file" multiple className="hidden" accept={ACCEPT_ATTR[accept] || ""}
                onChange={(e) => e.target.files?.length && upload(Array.from(e.target.files))} />
            </label>
            <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {isLoading && <div className="h-32 animate-pulse border border-border bg-background" />}
          {!isLoading && files.length === 0 && (
            <p className="py-8 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">Nothing here yet — Upload to add.</p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {files.map((f) => (
              <button key={f.url} type="button" onClick={() => onPick(f)} className="group flex flex-col border border-border bg-background text-left hover:border-primary">
                <Preview url={f.url} className="h-24" />
                <span className="truncate px-2 py-1.5 font-mono text-[10px] text-muted-foreground" title={f.name}>{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Single media value. `asObject` stores a Media object {url,kind,alt,caption}; else a plain URL string. */
export function MediaPicker({ value, onChange, category, accept = "image", asObject = false, label }) {
  const url = asObject ? value?.url : value;
  const [uploading, setUploading] = useState(false);
  const [browse, setBrowse] = useState(false);
  const inputRef = useRef(null);

  const set = (picked) => {
    if (!picked) { onChange(asObject ? null : ""); return; }
    if (asObject) onChange({ url: picked.url, kind: picked.kind || kindOf(picked.url), alt: value?.alt || "", caption: value?.caption || null });
    else onChange(picked.url);
  };

  const upload = async (file) => {
    setUploading(true);
    try { set(await adminMediaUpload(file, category)); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  return (
    <div className="block">
      {label && <div className="eyebrow">{label}</div>}
      <div className="mt-2 flex items-start gap-3">
        {url ? (
          <div className="relative w-32 shrink-0 border border-border">
            <Preview url={url} className="h-20" />
            <button type="button" onClick={() => set(null)} aria-label="Remove" className="absolute right-1 top-1 grid h-5 w-5 place-items-center border border-border bg-background/90 text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="grid h-20 w-32 shrink-0 place-items-center border border-dashed border-border bg-background text-[10px] uppercase tracking-widest text-muted-foreground">
            none
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 border border-primary bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />} Upload
            <input ref={inputRef} type="file" className="hidden" accept={ACCEPT_ATTR[accept] || ""}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          <button type="button" onClick={() => setBrowse(true)} className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-primary">
            <FolderOpen className="h-3.5 w-3.5" /> Browse
          </button>
        </div>
      </div>
      {asObject && url && (
        <input
          value={value?.alt || ""}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
          placeholder="alt text (accessibility)"
          className="mt-2 w-full border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
        />
      )}
      <LibraryModal open={browse} category={category} accept={accept} onPick={(f) => { set(f); setBrowse(false); }} onClose={() => setBrowse(false)} />
    </div>
  );
}

/** Ordered gallery of Media objects (images + videos) — upload/browse to add. */
export function MediaGalleryEditor({ value, onChange, category = "projects", label }) {
  const items = Array.isArray(value) ? value : [];
  const [uploading, setUploading] = useState(false);
  const [browse, setBrowse] = useState(false);
  const inputRef = useRef(null);

  const add = (picked) => onChange([...items, { url: picked.url, kind: picked.kind || kindOf(picked.url), alt: "", caption: null }]);
  const removeAt = (i) => onChange(items.filter((_, j) => j !== i));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  const patch = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));

  const upload = async (fileList) => {
    setUploading(true);
    try { for (const f of fileList) add(await adminMediaUpload(f, category)); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  return (
    <div className="block">
      {label && <div className="eyebrow">{label}</div>}
      <div className="mt-2 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-3 border border-border bg-background p-2">
            <Preview url={it.url} className="h-16 w-24 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="mono-data text-[10px] text-muted-foreground">{it.kind || kindOf(it.url)} · {it.url.split("/").pop()}</div>
              <input value={it.alt || ""} onChange={(e) => patch(i, "alt", e.target.value)} placeholder="alt / caption"
                className="w-full border border-border bg-card px-2 py-1 text-xs outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => move(i, -1)} aria-label="Move up" className="text-muted-foreground hover:text-foreground"><ChevronUp className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Move down" className="text-muted-foreground hover:text-foreground"><ChevronDown className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => removeAt(i)} aria-label="Remove" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 border border-primary bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />} Upload
          <input ref={inputRef} type="file" multiple className="hidden" accept="image/*,video/mp4,video/webm,video/quicktime"
            onChange={(e) => e.target.files?.length && upload(Array.from(e.target.files))} />
        </label>
        <button type="button" onClick={() => setBrowse(true)} className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-primary">
          <FolderOpen className="h-3.5 w-3.5" /> Browse
        </button>
      </div>
      <LibraryModal open={browse} category={category} accept="any" onPick={(f) => { add(f); setBrowse(false); }} onClose={() => setBrowse(false)} />
    </div>
  );
}
