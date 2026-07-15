import { motion } from "framer-motion";
import { PageMeta } from "@/components/seo/PageMeta";
import { useCollection } from "@/lib/useContent";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { fadeUp, listContainer } from "@/lib/motionVariants";

const CATEGORY_COLOR = {
  project: "border-primary text-primary",
  role: "border-accent text-accent",
  achievement: "border-terminal text-terminal",
  learning: "border-muted-foreground text-muted-foreground",
  life: "border-foreground text-foreground",
};

export default function Timeline() {
  const { data: events = [] } = useCollection("timeline");
  return (
    <>
      <PageMeta title="Timeline" />
      <PageShell>
        <SectionHeader eyebrow="/ timeline" title="Timeline" subtitle="A chronological rendering of the OS. Most-recent first." />
        <motion.ol
          variants={listContainer(0.04)}
          initial="hidden"
          animate="show"
          className="relative ml-4 border-l border-border pl-8"
        >
          {events.map((e, i) => (
            <motion.li key={e.slug} variants={fadeUp} layout className="relative pb-8">
              <span className="absolute -left-[38px] top-1 grid h-4 w-4 place-items-center border border-primary bg-background">
                <span className="h-1.5 w-1.5 bg-primary" />
              </span>
              <div className="mono-data text-[10px] text-primary">{e.date}</div>
              <div className={`mt-1 inline-block border ${CATEGORY_COLOR[e.category] || "border-border text-muted-foreground"} px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]`}>
                {e.category}
              </div>
              <h3 className="mt-3 font-display text-lg font-bold uppercase leading-tight">{e.title}</h3>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{e.summary}</p>
            </motion.li>
          ))}
        </motion.ol>
      </PageShell>
    </>
  );
}
