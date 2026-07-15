import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { fadeUp } from "@/lib/motionVariants";
import { T } from "@/lib/testIds";
import { cn } from "@/lib/utils";

export const DomainCard = ({ domain, featured = false }) => {
  return (
    <motion.div variants={fadeUp} className={cn("group", featured && "md:col-span-2 md:row-span-2")}>
      <Link
        to={`/domains/${domain.slug}`}
        data-testid={T.domain.card(domain.slug)}
        className={cn(
          "flex h-full flex-col border border-border bg-card p-6 transition-colors hover:border-primary md:p-8",
          featured && "md:p-10",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="eyebrow">Domain / {domain.status}</div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
        </div>
        <h3
          className={cn(
            "mt-6 font-display font-extrabold uppercase leading-none tracking-tight",
            featured ? "text-3xl md:text-5xl" : "text-xl md:text-2xl",
          )}
        >
          {domain.name}
        </h3>
        <p className={cn("mt-4 text-muted-foreground", featured ? "text-base" : "text-sm")}>
          {domain.tagline}
        </p>
        {featured && (
          <p className="mt-6 max-w-xl text-sm text-foreground/80">{domain.overview}</p>
        )}
        <div className="mt-auto pt-6">
          <div className="flex flex-wrap gap-1.5">
            {(domain.technologies || []).slice(0, featured ? 8 : 4).map((s) => (
              <span
                key={s}
                className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
