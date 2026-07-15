/**
 * Schema-driven form generator. Given a Pydantic-exported JSON Schema, renders
 * the right input per field so every content type gets a complete professional
 * form without hand-authoring one per collection.
 */
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MediaGalleryEditor, MediaPicker } from "./MediaPicker";

const LONG_TEXT_HINT = /(_md$|^body|^summary$|^overview$|^philosophy$|^problem$|^approach$|^outcome$|^learnings$|^next_steps$|^pitch$|^positioning|^subhead$|description|^architecture$|^engineering_notes$)/;
const MD_HINT = /_md$/;

/**
 * Which fields become upload controls (admins never type URLs). External web
 * links (github_url, live_url, credential_url) intentionally stay plain text.
 * Returns null for non-media fields.
 */
function mediaFieldConfig(name, resolved) {
  if (name === "media") return { type: "gallery", category: "projects" };
  if (resolved._refName === "Media") {
    return { type: "single-object", category: name === "hero_media" ? "projects" : "images", accept: "any" };
  }
  if (resolved.type === "array") {
    const items = resolved.items || {};
    if (items.$ref?.endsWith("/Media")) return { type: "gallery", category: "images" };
  }
  if (name === "image_url" || name === "thumbnail_url") return { type: "single-url", category: name === "thumbnail_url" ? "images" : "certificates", accept: "image" };
  if (name === "demo_video_url") return { type: "single-url", category: "videos", accept: "video" };
  if (name === "resume_url" || name === "file_url" || name === "pdf_url") return { type: "single-url", category: "resumes", accept: "doc" };
  return null;
}

/** Resolve `str | None` unions and $refs enough to classify a field. */
function resolve(prop, defs) {
  if (!prop) return {};
  if (prop.$ref) {
    const name = prop.$ref.split("/").pop();
    return { ...(defs?.[name] || {}), _refName: name };
  }
  if (prop.anyOf) {
    const nonNull = prop.anyOf.find((p) => p.type !== "null");
    return resolve(nonNull || prop.anyOf[0], defs);
  }
  return prop;
}

function classify(name, prop, defs) {
  const p = resolve(prop, defs);
  if (p.enum) return "enum";
  if (p.const) return "const";
  if (p.type === "boolean") return "boolean";
  if (p.type === "integer" || p.type === "number") return "number";
  if (p.type === "array") {
    const items = resolve(p.items, defs);
    if (items.type === "string" && !items.enum) return "tags";
    return "json";
  }
  if (p.type === "object" || p._refName) return "json";
  if (p.type === "string") {
    if (MD_HINT.test(name)) return "markdown";
    if (LONG_TEXT_HINT.test(name)) return "textarea";
    return "text";
  }
  return "json";
}

export function emptyValue(name, prop, defs) {
  const kind = classify(name, prop, defs);
  const p = resolve(prop, defs);
  if (kind === "boolean") return p.default ?? false;
  if (kind === "number") return p.default ?? "";
  if (kind === "tags") return [];
  if (kind === "json") return p.type === "array" ? [] : null;
  if (kind === "enum") return p.default ?? p.enum?.[0] ?? "";
  return p.default ?? "";
}

const inputCls = "mt-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function Field({ name, prop, defs, value, onChange, required, relationOptions }) {
  const [showPreview, setShowPreview] = useState(false);
  const [jsonError, setJsonError] = useState("");
  const kind = classify(name, prop, defs);
  const p = resolve(prop, defs);

  const label = (
    <div className="eyebrow flex items-center gap-2">
      {name}
      {required && <span className="text-primary" title="Required">*</span>}
    </div>
  );

  // Upload-based media fields (no manual URLs)
  const media = mediaFieldConfig(name, p);
  if (media) {
    if (media.type === "gallery") {
      return (
        <div className="block">
          {label}
          <MediaGalleryEditor value={Array.isArray(value) ? value : []} onChange={onChange} category={media.category} />
        </div>
      );
    }
    return (
      <div className="block">
        {label}
        <MediaPicker
          value={value}
          onChange={onChange}
          category={media.category}
          accept={media.accept || "any"}
          asObject={media.type === "single-object"}
        />
      </div>
    );
  }

  // Relationship fields → multi-select checkboxes populated from live content
  const relation = relationOptions?.[name];
  if (relation) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <label className="block">
        {label}
        <div className="mt-2 flex flex-wrap gap-2">
          {relation.length === 0 && <span className="text-xs text-muted-foreground">No options yet.</span>}
          {relation.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChange(active ? selected.filter((v) => v !== opt.value) : [...selected, opt.value])
                }
                className={
                  "border px-2 py-1 text-[11px] uppercase tracking-widest " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary")
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </label>
    );
  }

  if (kind === "boolean") {
    return (
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
        <span className="eyebrow">{name}</span>
      </label>
    );
  }

  if (kind === "enum") {
    return (
      <label className="block">
        {label}
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          {p.enum.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </label>
    );
  }

  if (kind === "number") {
    return (
      <label className="block">
        {label}
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className={inputCls}
        />
      </label>
    );
  }

  if (kind === "tags") {
    const text = Array.isArray(value) ? value.join(", ") : "";
    return (
      <label className="block">
        {label}
        <input
          value={text}
          onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          placeholder="comma, separated, values"
          className={inputCls}
        />
      </label>
    );
  }

  if (kind === "markdown") {
    return (
      <div>
        <div className="flex items-center justify-between">
          {label}
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div className="mt-2 min-h-[200px] border border-border bg-card p-4 text-sm [&_h2]:mt-4 [&_h2]:font-display [&_h2]:font-bold [&_h2]:uppercase [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_pre]:overflow-x-auto [&_code]:bg-background [&_code]:px-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || "*Nothing to preview.*"}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={12}
            spellCheck={false}
            className={inputCls + " font-mono text-xs leading-relaxed"}
          />
        )}
      </div>
    );
  }

  if (kind === "textarea") {
    return (
      <label className="block">
        {label}
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={4} className={inputCls} />
      </label>
    );
  }

  if (kind === "json") {
    const text = value == null ? "" : JSON.stringify(value, null, 2);
    return (
      <label className="block">
        <div className="eyebrow flex items-center gap-2">
          {name} <span className="text-muted-foreground normal-case tracking-normal">(JSON)</span>
          {required && <span className="text-primary">*</span>}
        </div>
        <textarea
          defaultValue={text}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (!raw) { setJsonError(""); onChange(p.type === "array" ? [] : null); return; }
            try {
              onChange(JSON.parse(raw));
              setJsonError("");
            } catch {
              setJsonError("Invalid JSON — not saved until fixed.");
            }
          }}
          rows={Math.min(12, Math.max(3, text.split("\n").length))}
          spellCheck={false}
          className={inputCls + " font-mono text-xs leading-relaxed"}
        />
        {jsonError && <div className="mt-1 text-xs text-destructive">{jsonError}</div>}
      </label>
    );
  }

  return (
    <label className="block">
      {label}
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}

export function SchemaForm({ schema, value, onChange, relationOptions }) {
  const defs = schema.$defs || {};
  const required = new Set(schema.required || []);
  const props = schema.properties || {};

  return (
    <div className="space-y-6">
      {Object.entries(props).map(([name, prop]) => (
        <Field
          key={name}
          name={name}
          prop={prop}
          defs={defs}
          required={required.has(name)}
          value={value?.[name]}
          onChange={(v) => onChange({ ...value, [name]: v })}
          relationOptions={relationOptions}
        />
      ))}
    </div>
  );
}
