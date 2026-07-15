import { NavLink } from "react-router-dom";
import { useSite } from "@/lib/useContent";
import { SocialLinks } from "@/components/layout/SocialLinks";

// Fallbacks mirror backend/content/site.json so nothing shifts before the fetch resolves.
const FALLBACK_FOOTER_COLUMNS = [
  { title: "Explore", links: [
    { label: "Domains", to: "/domains" },
    { label: "Projects", to: "/projects" },
    { label: "Blog", to: "/blog" },
  ] },
  { title: "Chronology", links: [
    { label: "Education", to: "/education" },
    { label: "Experience", to: "/experience" },
    { label: "Achievements", to: "/achievements" },
    { label: "Certifications", to: "/certifications" },
  ] },
  { title: "Modes", links: [
    { label: "Recruiter Mode", to: "/recruiter" },
    { label: "Developer Mode", to: "/developer" },
    { label: "Contact", to: "/contact" },
  ] },
];

export const Footer = () => {
  const year = new Date().getFullYear();
  const { data: site } = useSite();
  const identity = site?.identity;
  const columns = site?.nav?.footer_columns || FALLBACK_FOOTER_COLUMNS;
  const social = site?.social || {};

  return (
    <footer className="mt-24 border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-4">
        <div>
          <div className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight">
            {identity?.display_name || "Harshil"}<span className="text-primary">/</span>{identity?.brand_suffix || "OS"}
          </div>
          <p className="mt-4 max-w-xs text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {site?.footer?.tagline || "An engineer's operating system. Content-first, data-driven, opinionated."}
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <div className="eyebrow">{col.title}</div>
            <ul className="mt-4 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.to}><NavLink className="hover:text-primary" to={l.to}>{l.label}</NavLink></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 py-6 text-xs uppercase tracking-[0.2em] text-muted-foreground md:flex-row md:items-center">
          <div>© {year} {site?.footer?.copyright_name || "Harshil / OS"} · Built with intent.</div>
          <SocialLinks social={social} variant="footer" />
        </div>
      </div>
    </footer>
  );
};
