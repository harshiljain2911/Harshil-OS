/**
 * Professional fullscreen PDF viewer (Google-Drive / Adobe-style) for resumes.
 * Renders every page with pdf.js (react-pdf) at high quality, with zoom, fit
 * width / fit page, a page counter, and a metadata top bar + Download / Print /
 * Close. Opens with fade + scale (250ms). Does NOT touch the CMS/upload/storage.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Document, Page, pdfjs } from "react-pdf";
import {
  Download, Printer, X, ZoomIn, ZoomOut, MoveHorizontal, Maximize, Loader2, FileText,
} from "lucide-react";
import { API } from "@/lib/api";

// Worker copied to /public at build (avoids CRA import.meta issues).
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

const backendOrigin = API.replace(/\/api$/, "");
const resolve = (u) => (u && u.startsWith("/") ? backendOrigin + u : u);

// pdf.js render options — kept stable (referential) so the Document doesn't reload.
const PDF_OPTIONS = { cMapUrl: "/cmaps/", standardFontDataUrl: "/standard_fonts/" };

function printPdf(url) {
  const src = resolve(url);
  try {
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    frame.src = src;
    frame.onload = () => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch { window.open(src, "_blank", "noopener"); }
    };
    document.body.appendChild(frame);
    setTimeout(() => frame.parentNode && frame.parentNode.removeChild(frame), 60000);
  } catch {
    window.open(src, "_blank", "noopener");
  }
}

const ToolbarBtn = ({ onClick, title, children, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    disabled={disabled}
    className="grid h-8 w-8 place-items-center border border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground disabled:opacity-40"
  >
    {children}
  </button>
);

export function ResumeViewer({ open, onClose, url, title, typeLabel, version, updatedAt }) {
  const scrollRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const [current, setCurrent] = useState(1);
  const [containerW, setContainerW] = useState(800);
  const [containerH, setContainerH] = useState(600);
  const [mode, setMode] = useState("width");   // width | page | custom
  const [zoom, setZoom] = useState(1);          // used in custom mode
  const [aspect, setAspect] = useState(0.77);   // page width/height (updated on load)

  const src = useMemo(() => resolve(url), [url]);

  // Track available space for fit calculations.
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = scrollRef.current;
      if (el) {
        setContainerW(el.clientWidth);
        setContainerH(el.clientHeight);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  // Reset per-document state when opening a new resume.
  useEffect(() => {
    if (open) { setNumPages(0); setCurrent(1); setMode("width"); setZoom(1); }
  }, [open, url]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const pad = 48; // horizontal breathing room inside the scroller
  const pageWidth = useMemo(() => {
    const avail = Math.max(240, containerW - pad);
    if (mode === "width") return avail;
    if (mode === "page") return Math.min(avail, (containerH - pad) * aspect);
    return avail * zoom; // custom
  }, [mode, zoom, containerW, containerH, aspect]);

  const onDocLoad = useCallback(({ numPages: n }) => setNumPages(n), []);
  const onFirstPageLoad = useCallback((pageProxy) => {
    const vp = pageProxy.getViewport({ scale: 1 });
    if (vp?.width && vp?.height) setAspect(vp.width / vp.height);
  }, []);

  // Which page is centered → page counter.
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pages = el.querySelectorAll("[data-page]");
    const mid = el.scrollTop + el.clientHeight / 2;
    let best = 1;
    for (const p of pages) {
      if (p.offsetTop <= mid) best = Number(p.getAttribute("data-page"));
    }
    setCurrent(best);
  }, []);

  const zoomIn = () => { setMode("custom"); setZoom((z) => Math.min(3, (mode === "custom" ? z : 1) * 1.2)); };
  const zoomOut = () => { setMode("custom"); setZoom((z) => Math.max(0.4, (mode === "custom" ? z : 1) / 1.2)); };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="resume-viewer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[10050] bg-black/90 p-0 md:p-6"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Resume viewer: ${title || "PDF"}`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto flex h-full max-h-full w-full max-w-5xl flex-col border border-border bg-background md:h-full"
        >
          {/* Top bar: metadata + actions */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm font-bold uppercase tracking-[0.14em]">{title || "Resume"}</div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                {typeLabel && <span>{typeLabel}</span>}
                {version && <span>{version}</span>}
                {updatedAt && <span>updated {updatedAt}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={src} download className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-primary">
                <Download className="h-3.5 w-3.5" aria-hidden /> <span className="hidden sm:inline">Download</span>
              </a>
              <button type="button" onClick={() => printPdf(url)} className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-primary">
                <Printer className="h-3.5 w-3.5" aria-hidden /> <span className="hidden sm:inline">Print</span>
              </button>
              <button type="button" onClick={onClose} aria-label="Close viewer" className="grid h-8 w-8 place-items-center border border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3 border-b border-border bg-card/40 px-4 py-2">
            <div className="flex items-center gap-1.5">
              <ToolbarBtn onClick={zoomOut} title="Zoom out"><ZoomOut className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={zoomIn} title="Zoom in"><ZoomIn className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => setMode("width")} title="Fit width"><MoveHorizontal className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => setMode("page")} title="Fit page"><Maximize className="h-4 w-4" /></ToolbarBtn>
              <span className="ml-1 hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
                {mode === "custom" ? `${Math.round(zoom * 100)}%` : mode === "width" ? "fit width" : "fit page"}
              </span>
            </div>
            <div className="mono-data text-[10px] text-muted-foreground">
              {numPages ? `page ${current} / ${numPages}` : "loading…"}
            </div>
          </div>

          {/* Document scroller */}
          <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-auto bg-muted/20 px-2 py-4 [scroll-behavior:smooth]">
            <Document
              file={src}
              onLoadSuccess={onDocLoad}
              options={PDF_OPTIONS}
              loading={<div className="grid h-64 place-items-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              error={<div className="grid h-64 place-items-center px-6 text-center text-sm text-destructive">Couldn’t load this PDF. Try Download instead.</div>}
              noData={<div className="grid h-64 place-items-center text-muted-foreground">No PDF.</div>}
              className="flex flex-col items-center gap-4"
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i} data-page={i + 1} className="border border-border bg-white shadow-[0_1px_0_0_hsl(var(--border))]">
                  <Page
                    pageNumber={i + 1}
                    width={pageWidth}
                    onLoadSuccess={i === 0 ? onFirstPageLoad : undefined}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={<div style={{ width: pageWidth, height: pageWidth / aspect }} className="grid place-items-center bg-white"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
                  />
                </div>
              ))}
            </Document>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
