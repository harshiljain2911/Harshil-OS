import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, CircleAlert, Loader2, Save, Activity, XCircle } from "lucide-react";
import { adminAiStatus, adminAiTest, adminPutAiSettings } from "@/lib/adminApi";

const PIN_OPTIONS = [
  { value: "", label: "Auto + fallback (recommended)" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "anthropic", label: "Anthropic" },
];

export default function AdminAI() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-ai-status"], queryFn: adminAiStatus });

  const [provider, setProvider] = useState("");
  const [models, setModels] = useState({}); // per-provider model overrides
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [saveErr, setSaveErr] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);

  useEffect(() => {
    if (data?.settings) {
      setProvider(data.settings.provider || "");
      setModels(data.settings.models || {});
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    setSaveErr("");
    try {
      await adminPutAiSettings(provider, "", models);
      setSavedAt(new Date());
      qc.invalidateQueries({ queryKey: ["admin-ai-status"] });
    } catch (e) {
      setSaveErr(e?.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      const r = await adminAiTest();
      setTestResults(r.results || {});
    } catch {
      setTestResults({ _error: true });
    } finally {
      setTesting(false);
    }
  };

  const providers = data?.providers || [];

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight md:text-4xl">AI Providers</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Provider manager, fallback order, and models. API keys live only in <code className="border border-border bg-card px-1">backend/.env</code> and never reach the browser.
      </p>

      {isLoading && <div className="mt-8 h-40 animate-pulse border border-border bg-card" />}
      {error && <p className="mt-8 text-sm text-destructive">Failed to load AI status.</p>}

      {data && (
        <div className="mt-8 space-y-4">
          {/* live mode banner */}
          <div className={`flex items-start gap-4 border p-5 ${data.configured ? "border-terminal bg-terminal/5" : "border-primary bg-primary/5"}`}>
            {data.configured
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-terminal" aria-hidden />
              : <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />}
            <div className="min-w-0">
              <div className="font-display text-sm font-bold uppercase tracking-[0.14em]">
                {data.configured ? "LLM mode active" : "Retrieval fallback mode"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.configured
                  ? `Current provider: ${data.provider} · ${data.model}. Streaming, grounded on live portfolio content, with automatic fallback.`
                  : "No provider key detected. The assistant still answers from retrieval, but without natural-language generation."}
              </p>
              {data.hint && <p className="mono-data mt-2 text-[11px] text-muted-foreground">{data.hint}</p>}
              <p className="mono-data mt-2 text-[11px] text-muted-foreground">
                A key being present shows ACTIVE. Use “Test providers” below to confirm each one actually responds (billing / validity).
              </p>
            </div>
          </div>

          {/* Provider manager: status + current + fallback order + model */}
          <div className="border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="eyebrow flex items-center gap-2"><Bot className="h-3.5 w-3.5" /> Providers</div>
              <button
                type="button"
                onClick={runTest}
                disabled={testing}
                className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:border-primary hover:text-foreground disabled:opacity-50"
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />} Test providers
              </button>
            </div>

            <ul className="mt-4 space-y-3">
              {providers.map((p) => {
                const t = testResults && testResults[p.name];
                return (
                  <li key={p.name} className="border border-border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <span className={p.active ? "text-terminal" : "text-muted-foreground"} aria-hidden>{p.active ? "🟢" : "○"}</span>
                      <span className="font-display text-sm font-bold uppercase tracking-[0.12em]">{p.label}</span>
                      <span className={`border px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${p.active ? "border-terminal text-terminal" : "border-border text-muted-foreground"}`}>
                        {p.active ? "active" : "disabled"}
                      </span>
                      {p.is_current && <span className="border border-primary px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-primary">current</span>}
                      {t && (
                        <span className={`ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-widest ${t.ok ? "text-terminal" : "text-destructive"}`}>
                          {t.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {t.ok ? "responds" : "failing"}
                        </span>
                      )}
                    </div>
                    {t && !t.ok && t.detail && (
                      <p className="mono-data mt-2 break-words text-[10px] text-destructive">{t.detail}</p>
                    )}
                    {p.active && (
                      <label className="mt-3 block">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Model</span>
                        <select
                          value={models[p.name] ?? ""}
                          onChange={(e) => setModels((m) => ({ ...m, [p.name]: e.target.value }))}
                          className="mt-1 w-full border border-border bg-card px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                        >
                          <option value="">{`Default (${p.options?.[0] || data.default_models?.[p.name] || ""})`}</option>
                          {(p.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
            {testResults?._error && <p className="mt-3 text-xs text-destructive">Test failed to run.</p>}
          </div>

          {/* Fallback order */}
          <div className="border border-border bg-card p-5">
            <div className="eyebrow">Fallback order</div>
            {data.fallback_order?.length ? (
              <ol className="mt-3 space-y-1.5 font-mono text-xs">
                {data.fallback_order.map((name, i) => (
                  <li key={name} className="flex items-center gap-2">
                    <span className="border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{i + 1}</span>
                    <span className="uppercase tracking-widest text-foreground">{name}</span>
                    {i === 0 && <span className="text-[10px] uppercase tracking-widest text-primary">↞ current</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No providers configured. Add a key to backend/.env.</p>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              A request tries provider 1; if it fails it automatically retries the next, and so on. Visitors never see provider errors.
            </p>
          </div>

          {/* Pin provider + save */}
          <div className="border border-border bg-card p-5">
            <div className="eyebrow">Preferred provider</div>
            <label className="mt-3 block">
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                {PIN_OPTIONS.map((p) => {
                  const has = p.value === "" || data.keys_present?.[p.value];
                  return <option key={p.value} value={p.value}>{`${p.label}${p.value && !has ? " — no key" : ""}`}</option>;
                })}
              </select>
              <span className="mt-1 block text-[11px] text-muted-foreground">
                “Auto” tries providers in the fallback order above. Pinning one puts it first (it still falls back if it fails).
              </span>
            </label>
            {saveErr && <div className="mt-3 border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive">{saveErr}</div>}
            {savedAt && !saveErr && <div className="mt-3 border border-terminal bg-terminal/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-terminal">Saved {savedAt.toLocaleTimeString()} — live now.</div>}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="mt-4 inline-flex items-center gap-2 border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save &amp; apply
            </button>
          </div>

          {/* provider keys */}
          <div className="border border-border bg-card p-5">
            <div className="eyebrow">Keys detected (server-side)</div>
            <ul className="mt-3 space-y-1.5 font-mono text-xs">
              {Object.entries(data.keys_present || {}).map(([name, present]) => (
                <li key={name} className="flex items-center gap-2">
                  <span className={present ? "text-terminal" : "text-muted-foreground"}>{present ? "●" : "○"}</span>
                  <span className="text-muted-foreground">{name.toUpperCase()}_API_KEY</span>
                  <span className={present ? "text-terminal" : "text-muted-foreground"}>{present ? "present" : "missing"}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-border bg-card p-5">
            <div className="eyebrow">Knowledge base (RAG)</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Retrieves live content — identity, education, experience, domains, projects, certifications, blog,
              timeline, achievements — before every call. Publish anything in this panel and the assistant knows it
              immediately. No re-indexing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
