/**
 * Site editor — edits the site.json singleton (identity, hero, about, contact,
 * social, SEO, footer, nav, recruiter, narrative, education). Renders a form
 * recursively from the actual JSON, so new schema fields appear automatically.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { adminGetSite, adminPutSite } from "@/lib/adminApi";
import { MediaPicker } from "./MediaPicker";

const inputCls = "mt-1 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

// Site keys that should be upload-based (never manual URLs).
const UPLOAD_KEYS = {
  file_url: { category: "resumes", accept: "doc" },
  resume_url: { category: "resumes", accept: "doc" },
  image_url: { category: "images", accept: "image" },
  url: { category: "images", accept: "image" }, // favicon.url / profile_image.url
};

/** Resume files list ([{label, url}]) — label input + PDF upload per row. */
function ResumeFilesEditor({ value, onChange }) {
  const items = Array.isArray(value) ? value : [];
  const patch = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  return (
    <div className="block">
      <span className="eyebrow">resume files</span>
      <div className="mt-2 space-y-3">
        {items.map((it, i) => (
          <div key={i} className="border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <input value={it.label || ""} onChange={(e) => patch(i, "label", e.target.value)} placeholder="label (e.g. AI Resume)"
                className="flex-1 border border-border bg-card px-2 py-1.5 text-sm outline-none focus:border-primary" />
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-2">
              <MediaPicker value={it.url} onChange={(u) => patch(i, "url", u)} category="resumes" accept="doc" />
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...items, { label: "", url: "" }])}
        className="mt-2 inline-flex items-center gap-2 border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-primary">
        <Plus className="h-3.5 w-3.5" /> Add resume
      </button>
    </div>
  );
}

function LeafField({ label, value, onChange }) {
  // Upload-based media keys
  if (label in UPLOAD_KEYS) {
    const cfg = UPLOAD_KEYS[label];
    return <div className="block"><span className="eyebrow">{label}</span><MediaPicker value={value || ""} onChange={onChange} category={cfg.category} accept={cfg.accept} /></div>;
  }
  if (label === "files" && (value == null || (Array.isArray(value) && value.every((v) => v && typeof v === "object" && "url" in v)))) {
    return <ResumeFilesEditor value={value || []} onChange={onChange} />;
  }
  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
        <span className="eyebrow">{label}</span>
      </label>
    );
  }
  if (typeof value === "number") {
    return (
      <label className="block">
        <span className="eyebrow">{label}</span>
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className={inputCls} />
      </label>
    );
  }
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return (
      <label className="block">
        <span className="eyebrow">{label} <span className="normal-case tracking-normal text-muted-foreground">(one per line)</span></span>
        <textarea
          value={value.join("\n")}
          onChange={(e) => onChange(e.target.value.split("\n"))}
          onBlur={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
          rows={Math.min(8, Math.max(2, value.length + 1))}
          className={inputCls}
        />
      </label>
    );
  }
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return <JsonField label={label} value={value} onChange={onChange} />;
  }
  const str = value ?? "";
  const long = typeof str === "string" && str.length > 90;
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      {long ? (
        <textarea value={str} onChange={(e) => onChange(e.target.value)} rows={3} className={inputCls} />
      ) : (
        <input value={str} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)} className={inputCls} />
      )}
    </label>
  );
}

function JsonField({ label, value, onChange }) {
  const [err, setErr] = useState("");
  return (
    <label className="block">
      <span className="eyebrow">{label} <span className="normal-case tracking-normal text-muted-foreground">(JSON)</span></span>
      <textarea
        defaultValue={JSON.stringify(value, null, 2)}
        onBlur={(e) => {
          try { onChange(JSON.parse(e.target.value)); setErr(""); }
          catch { setErr("Invalid JSON — fix before saving."); }
        }}
        rows={Math.min(14, Math.max(3, JSON.stringify(value, null, 2).split("\n").length))}
        spellCheck={false}
        className={inputCls + " font-mono text-xs leading-relaxed"}
      />
      {err && <div className="mt-1 text-xs text-destructive">{err}</div>}
    </label>
  );
}

function Section({ name, data, onChange }) {
  // Objects one level deep get per-field inputs; deeper structures fall back to JSON.
  if (Array.isArray(data) || typeof data !== "object" || data === null) {
    return (
      <div className="border border-border bg-card p-5">
        <LeafField label={name} value={data} onChange={onChange} />
      </div>
    );
  }
  return (
    <details className="group border border-border bg-card" open={name === "identity"}>
      <summary className="cursor-pointer select-none px-5 py-3 font-display text-sm font-bold uppercase tracking-[0.18em] hover:text-primary">
        {name}
      </summary>
      <div className="space-y-4 border-t border-border p-5">
        {Object.entries(data).map(([k, v]) => (
          <LeafField key={k} label={k} value={v} onChange={(nv) => onChange({ ...data, [k]: nv })} />
        ))}
      </div>
    </details>
  );
}

export default function AdminSite() {
  const [site, setSite] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const qc = useQueryClient();

  useEffect(() => {
    adminGetSite().then(setSite).catch(() => setError("Failed to load site.json"));
  }, []);

  const save = async () => {
    if (!site || saving) return;
    setSaving(true);
    setError("");
    try {
      await adminPutSite(site);
      setSavedAt(new Date());
      qc.invalidateQueries({ queryKey: ["site"] });
    } catch (e) {
      setError(e?.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!site) return <div className="h-64 animate-pulse border border-border bg-card" />;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight md:text-4xl">Site settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Identity, hero, about, contact, social, SEO, footer, navigation — all of site.json.</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save & apply
        </button>
      </div>

      {error && (
        <div className="mt-4 whitespace-pre-wrap border border-destructive bg-destructive/10 px-4 py-3 text-xs text-destructive" role="alert">{error}</div>
      )}
      {savedAt && !error && (
        <div className="mt-4 border border-terminal bg-terminal/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-terminal">
          Saved {savedAt.toLocaleTimeString()} — live immediately.
        </div>
      )}

      <div className="mt-8 space-y-4">
        {Object.entries(site).map(([section, data]) => (
          <Section key={section} name={section} data={data} onChange={(nv) => setSite({ ...site, [section]: nv })} />
        ))}
      </div>
    </div>
  );
}
