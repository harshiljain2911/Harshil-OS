import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { adminOverview } from "@/lib/adminApi";

const fmtTime = (ts) => new Date(ts * 1000).toLocaleString();

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-overview"], queryFn: adminOverview });

  if (isLoading) return <div className="h-64 animate-pulse border border-border bg-card" />;
  if (error) return <p className="text-sm text-destructive">Failed to load overview. Is the backend running?</p>;

  const counts = data?.counts || {};
  const totals = Object.values(counts).reduce(
    (acc, c) => ({
      published: acc.published + c.published,
      drafts: acc.drafts + c.drafts,
      archived: acc.archived + c.archived,
    }),
    { published: 0, drafts: 0, archived: 0 },
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight md:text-4xl">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">Content status across every collection.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Published", totals.published],
          ["Drafts", totals.drafts],
          ["Archived", totals.archived],
        ].map(([label, n]) => (
          <div key={label} className="border border-border bg-card p-5">
            <div className="eyebrow">{label}</div>
            <div className="mt-2 font-mono text-3xl">{n}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="border border-border bg-card">
          <div className="border-b border-border px-5 py-3 eyebrow">Per collection</div>
          <ul className="divide-y divide-border">
            {Object.entries(counts).map(([name, c]) => (
              <li key={name} className="flex items-center justify-between px-5 py-3 text-sm">
                <Link to={`/admin/content/${name}`} className="uppercase tracking-[0.14em] hover:text-primary">{name}</Link>
                <span className="font-mono text-xs text-muted-foreground">
                  {c.published} live · {c.drafts} draft{c.archived > 0 ? ` · ${c.archived} archived` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-border bg-card">
          <div className="border-b border-border px-5 py-3 eyebrow">Recent activity</div>
          <ul className="divide-y divide-border">
            {(data?.recent || []).length === 0 && (
              <li className="px-5 py-4 text-sm text-muted-foreground">No content yet.</li>
            )}
            {(data?.recent || []).map((r) => (
              <li key={`${r.collection}-${r.slug}-${r.status}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <Link to={`/admin/content/${r.collection}/${r.slug}`} className="min-w-0 truncate hover:text-primary">
                  <span className="text-muted-foreground">{r.collection}/</span>{r.slug}
                </Link>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{r.status} · {fmtTime(r.updated_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
