import { cn } from "@/lib/utils";

export const PageShell = ({ children, className }) => (
  <main className={cn("mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-20", className)}>{children}</main>
);

export const SectionHeader = ({ eyebrow, title, subtitle, id }) => (
  <header id={id} className="mb-10 border-l-2 border-primary pl-4 md:mb-14">
    {eyebrow && <div className="eyebrow">{eyebrow}</div>}
    <h1 className="mt-2 font-display text-3xl font-extrabold uppercase leading-none tracking-tight md:text-5xl">
      {title}
    </h1>
    {subtitle && (
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">{subtitle}</p>
    )}
  </header>
);

export const NotApplicable = ({ label = "Section" }) => (
  <div className="border border-dashed border-border bg-muted/30 p-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
    <span className="text-primary">›</span> {label}: Not applicable yet
  </div>
);
