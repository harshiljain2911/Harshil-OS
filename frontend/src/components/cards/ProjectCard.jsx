import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Play } from "lucide-react";
import { fadeUp } from "@/lib/motionVariants";
import { API } from "@/lib/api";
import { T } from "@/lib/testIds";

const STATUS_COLOR = {
  shipped: "text-terminal",
  "in-progress": "text-primary",
  archived: "text-muted-foreground",
  prototype: "text-accent",
};

const backendOrigin = API.replace(/\/api$/, "");
const resolve = (u) => (u && u.startsWith("/") ? backendOrigin + u : u);

/** First image in the gallery/hero — a thumbnail if the project has one. */
function projectThumb(project) {
  const img = (project.media || []).find((m) => m.kind !== "video" && !/\.(mp4|webm|mov)$/i.test(m.url || ""));
  return img?.url || project.hero_media?.url || null;
}

export const ProjectCard = ({ project }) => {
  const thumb = projectThumb(project);
  const hasVideo = !!project.demo_video_url || (project.media || []).some((m) => m.kind === "video");
  return (
  <motion.div variants={fadeUp}>
    <Link
      to={`/projects/${project.slug}`}
      data-testid={T.project.card(project.slug)}
      className="group flex h-full flex-col overflow-hidden border border-border bg-card transition-colors hover:border-primary"
    >
      {thumb && (
        <div className="relative aspect-video w-full overflow-hidden border-b border-border">
          <img src={resolve(thumb)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          {hasVideo && (
            <span className="absolute bottom-2 right-2 grid h-6 w-6 place-items-center border border-border bg-background/80 text-primary">
              <Play className="h-3 w-3" aria-hidden />
            </span>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
      <div className="flex items-center justify-between">
        <div className="eyebrow">
          <span className={STATUS_COLOR[project.status] || "text-muted-foreground"}>●</span>{" "}
          {project.status} · {project.year}
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
      </div>
      <h3 className="mt-6 font-display text-2xl font-extrabold uppercase leading-none tracking-tight">
        {project.title}
      </h3>
      <p className="mt-3 text-sm text-muted-foreground">{project.subtitle}</p>
      <div className="mt-6 flex flex-wrap gap-1.5">
        {(project.tags || []).slice(0, 4).map((t) => (
          <span
            key={t}
            className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
      {project._depth_score != null && (
        <div className="mt-auto flex items-center justify-between pt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <span data-testid={T.project.depthScore}>depth · {project._depth_score}</span>
          <span>{(project.stack || []).slice(0, 2).join(" · ")}</span>
        </div>
      )}
      </div>
    </Link>
  </motion.div>
  );
};
