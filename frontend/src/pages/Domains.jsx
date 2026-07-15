import { motion } from "framer-motion";
import { PageMeta } from "@/components/seo/PageMeta";
import { useCollection } from "@/lib/useContent";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { DomainCard } from "@/components/cards/DomainCard";
import { listContainer } from "@/lib/motionVariants";
import { T } from "@/lib/testIds";

export default function Domains() {
  const { data: domains = [], isLoading } = useCollection("domains");
  return (
    <>
      <PageMeta title="Domains" />
      <PageShell>
        <SectionHeader
          eyebrow="/ domains"
          title="Engineering domains"
          subtitle="The rooms of the house — ordered by depth of practice. Featured domain gets the wide slot."
        />
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse border border-border bg-card" />
            ))}
          </div>
        ) : (
          <motion.div
            data-testid={T.domain.grid}
            variants={listContainer()}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-3 md:grid-rows-2"
          >
            {domains.map((d, i) => <DomainCard key={d.slug} domain={d} featured={i === 0} />)}
          </motion.div>
        )}
      </PageShell>
    </>
  );
}
