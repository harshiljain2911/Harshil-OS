import { Link } from "react-router-dom";
import { PageMeta } from "@/components/seo/PageMeta";
import { PageShell } from "@/components/layout/PageShell";
import { T } from "@/lib/testIds";

export default function NotFound() {
  return (
    <>
      <PageMeta title="404" />
      <PageShell>
        <div data-testid={T.notFound.root} className="border border-border bg-card p-8 md:p-16">
          <div className="mono-data text-[10px] text-primary">status · 404</div>
          <h1 className="mt-4 font-display text-5xl font-extrabold uppercase leading-none tracking-tighter md:text-8xl">
            Route not<br />mounted.
          </h1>
          <p className="mt-6 max-w-xl text-sm text-muted-foreground md:text-base">
            The path you asked for isn&apos;t in the file system of this OS. Try one of the mounted volumes below.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/"
              data-testid={T.notFound.homeLink}
              className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-foreground hard-shadow-hover"
            >
              / home
            </Link>
            <Link
              to="/projects"
              data-testid={T.notFound.projectsLink}
              className="border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] hover:border-primary"
            >
              /projects
            </Link>
          </div>
        </div>
      </PageShell>
    </>
  );
}
