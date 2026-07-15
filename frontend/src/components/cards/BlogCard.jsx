import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock } from "lucide-react";
import { fadeUp } from "@/lib/motionVariants";
import { T } from "@/lib/testIds";

export const BlogCard = ({ post }) => (
  <motion.article variants={fadeUp}>
    <Link
      to={`/blog/${post.slug}`}
      data-testid={T.blog.card(post.slug)}
      className="group flex h-full flex-col border border-border bg-card p-6 transition-colors hover:border-primary md:p-8"
    >
      <div className="flex items-center justify-between">
        <div className="eyebrow">
          <Clock className="mr-1 inline h-3 w-3" /> {post.reading_minutes} min · {post.published_at}
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
      </div>
      <h3 className="mt-6 font-display text-2xl font-extrabold uppercase leading-none tracking-tight">
        {post.title}
      </h3>
      {post.subtitle && <p className="mt-3 text-sm text-muted-foreground">{post.subtitle}</p>}
      <div className="mt-auto flex flex-wrap gap-1.5 pt-6">
        {(post.tags || []).map((t) => (
          <span
            key={t}
            className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
    </Link>
  </motion.article>
);
