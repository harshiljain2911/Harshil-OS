import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, UploadCloud } from "lucide-react";
import {
  adminCreateItem, adminGetItem, adminListContent, adminUpdateItem, getSchemas,
} from "@/lib/adminApi";
import { SchemaForm, emptyValue } from "./SchemaForm";

const MODEL_FOR = {
  domains: "domains", projects: "projects", certifications: "certifications",
  experience: "experience", achievements: "achievements", timeline: "timeline",
  blog: "blog", research: "research", resumes: "resumes",
};

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminEditor({ mode }) {
  const { collection, slug } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: schemas } = useQuery({ queryKey: ["schemas"], queryFn: getSchemas, staleTime: Infinity });
  const schema = schemas?.[MODEL_FOR[collection]];

  // Relationship option sources (drafts included so relations can be staged)
  const { data: domainItems = [] } = useQuery({ queryKey: ["admin-list", "domains"], queryFn: () => adminListContent("domains") });
  const { data: projectItems = [] } = useQuery({ queryKey: ["admin-list", "projects"], queryFn: () => adminListContent("projects") });
  const { data: blogItems = [] } = useQuery({ queryKey: ["admin-list", "blog"], queryFn: () => adminListContent("blog") });

  const relationOptions = useMemo(() => ({
    domain_slugs: domainItems.map((d) => ({ value: d.slug, label: d.title })),
    domain_slug: domainItems.map((d) => ({ value: d.slug, label: d.title })),
    highlight_project_slugs: projectItems.map((p) => ({ value: p.slug, label: p.title })),
    related_slugs: (collection === "blog" ? blogItems : projectItems).map((p) => ({ value: p.slug, label: p.title })),
  }), [domainItems, projectItems, blogItems, collection]);

  const [value, setValue] = useState(null);
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(null);

  // Load existing item (edit) or build an empty skeleton from the schema (create)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (mode === "edit" && collection && slug) {
        try {
          const res = await adminGetItem(collection, slug);
          if (!cancelled) { setValue(res.data); setStatus(res.status); }
        } catch {
          if (!cancelled) setError("Failed to load item.");
        }
      } else if (schema && !value) {
        const defs = schema.$defs || {};
        const skeleton = {};
        for (const [name, prop] of Object.entries(schema.properties || {})) {
          skeleton[name] = emptyValue(name, prop, defs);
        }
        if ("updated_at" in skeleton) skeleton.updated_at = today();
        if ("created_at" in skeleton) skeleton.created_at = today();
        setValue(skeleton);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, collection, slug, schema]);

  const save = async (targetStatus) => {
    if (!value || saving) return;
    setSaving(true);
    setError("");
    const data = { ...value };
    if ("updated_at" in data && !data.updated_at) data.updated_at = today();
    // Drop empty-string optionals so they serialize as null-omitted
    for (const [k, v] of Object.entries(data)) {
      if (v === "") data[k] = null;
    }
    if (!data.slug) {
      setError("Slug is required (lowercase letters, digits, hyphens).");
      setSaving(false);
      return;
    }
    try {
      if (mode === "create") {
        await adminCreateItem(collection, data, targetStatus);
      } else {
        await adminUpdateItem(collection, slug, data, targetStatus);
      }
      setStatus(targetStatus);
      setSavedAt(new Date());
      qc.invalidateQueries({ queryKey: ["admin-list", collection] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      qc.invalidateQueries({ queryKey: ["collection", collection] });
      if (mode === "create") navigate(`/admin/content/${collection}/${data.slug}`, { replace: true });
    } catch (e) {
      setError(e?.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd+S saves with current status
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save(status);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, status, saving]);

  if (!schema || !value) return <div className="h-64 animate-pulse border border-border bg-card" />;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/admin/content/${collection}`} className="eyebrow hover:text-primary">← {collection}</Link>
          <h1 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
            {mode === "create" ? `New ${collection} entry` : value.title || value.name || value.role || slug}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`border px-2 py-1 text-[10px] uppercase tracking-widest ${status === "published" ? "border-terminal text-terminal" : "border-primary text-primary"}`}>
            {status}
          </span>
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={saving}
            className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] hover:border-primary disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
          </button>
          <button
            type="button"
            onClick={() => save("published")}
            disabled={saving}
            className="inline-flex items-center gap-2 border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-50"
          >
            <UploadCloud className="h-4 w-4" /> Publish
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 whitespace-pre-wrap border border-destructive bg-destructive/10 px-4 py-3 text-xs text-destructive" role="alert">
          {error}
        </div>
      )}
      {savedAt && !error && (
        <div className="mt-4 border border-terminal bg-terminal/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-terminal">
          Saved {savedAt.toLocaleTimeString()} · {status === "published" ? "live on the site" : "draft (not public)"}
        </div>
      )}

      <div className="mt-8 border border-border bg-card p-5 md:p-8">
        <SchemaForm schema={schema} value={value} onChange={setValue} relationOptions={relationOptions} />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Tip: Ctrl/Cmd+S saves with the current status. Publishing validates against the content schema —
        invalid data is rejected with the exact reason, nothing half-saved.
      </p>
    </div>
  );
}
