import { motion } from "framer-motion";
import { PageMeta } from "@/components/seo/PageMeta";
import { useCollection } from "@/lib/useContent";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { BlogCard } from "@/components/cards/BlogCard";
import { listContainer } from "@/lib/motionVariants";
import { T } from "@/lib/testIds";

export default function Blog() {
  const { data: posts = [] } = useCollection("blog");
  return (
    <>
      <PageMeta title="Blog" />
      <PageShell>
        <SectionHeader eyebrow="/ blog" title="Writing" subtitle="Essays about what actually happened after the whiteboard." />
        <motion.div
          data-testid={T.blog.list}
          variants={listContainer()}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {posts.map((p) => <BlogCard key={p.slug} post={p} />)}
        </motion.div>
      </PageShell>
    </>
  );
}
