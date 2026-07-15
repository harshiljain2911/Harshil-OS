/**
 * Public media renderer for projects. Chooses the presentation from the data,
 * not hardcoding: single image → preview, multiple → carousel, video → embedded
 * player, mixed → gallery with inline video slides. CMS-driven.
 */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { API } from "@/lib/api";

const backendOrigin = API.replace(/\/api$/, "");
const resolve = (u) => (u && u.startsWith("/") ? backendOrigin + u : u);
const isVideo = (m) => m.kind === "video" || /\.(mp4|webm|mov)$/i.test(m.url || "");

function Slide({ item }) {
  if (isVideo(item)) {
    return (
      <video
        src={resolve(item.url)}
        controls
        playsInline
        className="h-full w-full bg-black object-contain"
        aria-label={item.alt || "Project video"}
      />
    );
  }
  return <img src={resolve(item.url)} alt={item.alt || ""} className="h-full w-full object-contain" loading="lazy" />;
}

export function MediaGallery({ media = [], demoVideoUrl }) {
  // Build the slide list: featured demo video first, then gallery media.
  const slides = [
    ...(demoVideoUrl ? [{ url: demoVideoUrl, kind: "video", alt: "Demo" }] : []),
    ...media,
  ].filter((m) => m && m.url);

  const [idx, setIdx] = useState(0);
  if (slides.length === 0) return null;

  const go = (d) => setIdx((i) => (i + d + slides.length) % slides.length);
  const current = slides[idx];

  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden border border-border bg-card">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <Slide item={current} />
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center border border-border bg-background/80 text-muted-foreground hover:border-primary hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center border border-border bg-background/80 text-muted-foreground hover:border-primary hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((s, i) => (
                <button key={i} type="button" onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 w-1.5 ${i === idx ? "bg-primary" : "bg-border"}`} />
              ))}
            </div>
          </>
        )}
        {current.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground">{current.caption}</div>
        )}
      </div>

      {/* thumbnail strip */}
      {slides.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {slides.map((s, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden border ${i === idx ? "border-primary" : "border-border"}`}>
              {isVideo(s) ? (
                <span className="grid h-full w-full place-items-center bg-black">
                  <Play className="h-4 w-4 text-primary" aria-hidden />
                </span>
              ) : (
                <img src={resolve(s.url)} alt="" className="h-full w-full object-cover" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
