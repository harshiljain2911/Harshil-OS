import { PageMeta } from "@/components/seo/PageMeta";
import { useCollection } from "@/lib/useContent";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";

const CAT_COLOR = {
  award: "text-primary",
  publication: "text-accent",
  talk: "text-terminal",
  milestone: "text-foreground",
  recognition: "text-muted-foreground",
};

export default function Achievements() {
  const { data: items = [] } = useCollection("achievements");
  return (
    <>
      <PageMeta title="Achievements" />
      <PageShell>
        <SectionHeader eyebrow="/ achievements" title="Achievements" subtitle="Awards, talks, publications, milestones. Kept honest by dates." />
        <ul className="divide-y divide-border border border-border bg-card">
          {items.map((a) => (
            <li key={a.slug} className="grid gap-3 px-6 py-5 md:grid-cols-[100px_120px_1fr]">
              <div className="mono-data text-[10px] text-primary">{a.date}</div>
              <div className={`eyebrow ${CAT_COLOR[a.category]}`}>● {a.category}</div>
              <div>
                <div className="font-display text-sm font-bold uppercase leading-tight">{a.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{a.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      </PageShell>
    </>
  );
}
