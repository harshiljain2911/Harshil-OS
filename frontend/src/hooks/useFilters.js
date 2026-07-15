import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

// URL-query-driven filters per §2.6/§7. Never local state — the URL is truth.
export function useFilters() {
  const [params, setParams] = useSearchParams();

  const get = useCallback((k) => params.get(k) || "", [params]);
  const getAll = useCallback((k) => params.getAll(k), [params]);

  const set = useCallback(
    (k, v) => {
      const p = new URLSearchParams(params);
      if (!v) p.delete(k);
      else p.set(k, v);
      setParams(p, { replace: true });
    },
    [params, setParams],
  );

  const toggle = useCallback(
    (k, v) => {
      const p = new URLSearchParams(params);
      const existing = p.getAll(k);
      if (existing.includes(v)) {
        p.delete(k);
        existing.filter((x) => x !== v).forEach((x) => p.append(k, x));
      } else {
        p.append(k, v);
      }
      setParams(p, { replace: true });
    },
    [params, setParams],
  );

  const clear = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  const query = useMemo(() => Object.fromEntries(params.entries()), [params]);

  return { get, getAll, set, toggle, clear, query };
}
