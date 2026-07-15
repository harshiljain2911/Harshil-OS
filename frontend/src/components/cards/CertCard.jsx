import { motion } from "framer-motion";
import { Award, ExternalLink, Maximize2 } from "lucide-react";
import { fadeUp } from "@/lib/motionVariants";
import { API } from "@/lib/api";

const backendOrigin = API.replace(/\/api$/, "");

/** Resolve media-library relative URLs (/uploads/...) against the backend. */
export const mediaUrl = (url) => (url && url.startsWith("/") ? backendOrigin + url : url);

export const CertCard = ({ cert, onOpen }) => (
  <motion.article
    variants={fadeUp}
    className="group flex h-full flex-col border border-border bg-card transition-colors hover:border-primary"
  >
    {/* certificate preview — full certificate always visible (contain, never cropped) */}
    <button
      type="button"
      onClick={() => onOpen?.(cert)}
      aria-label={`View certificate: ${cert.title}`}
      className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden border-b border-border bg-background p-3 text-left"
    >
      {cert.image_url ? (
        <img
          src={mediaUrl(cert.image_url)}
          alt={cert.title}
          loading="lazy"
          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <Award className="h-10 w-10 text-primary/40" aria-hidden />
      )}
      <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center border border-border bg-background/80 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        <Maximize2 className="h-3.5 w-3.5" aria-hidden />
      </span>
    </button>

    <div className="flex flex-1 flex-col p-5">
      <h3 className="font-display text-base font-bold uppercase leading-snug md:text-lg">{cert.title}</h3>
      <div className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {cert.issuer} · {cert.issued_at}
      </div>
      {cert.credential_id && (
        <div className="mono-data mt-2 text-[10px] text-muted-foreground">ID · {cert.credential_id}</div>
      )}
      {(cert.skills || []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {cert.skills.slice(0, 5).map((s) => (
            <span key={s} className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto flex items-center gap-2 pt-5">
        <button
          type="button"
          onClick={() => onOpen?.(cert)}
          className="border border-border bg-background px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-primary"
        >
          View
        </button>
        {cert.credential_url && (
          <a
            href={cert.credential_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 border border-primary bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Verify <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}
      </div>
    </div>
  </motion.article>
);
