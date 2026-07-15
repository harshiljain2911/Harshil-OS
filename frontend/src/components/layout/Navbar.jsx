import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, Search, X } from "lucide-react";
import { useScrolled } from "@/hooks/useScrolled";
import { useSite } from "@/lib/useContent";
import { T } from "@/lib/testIds";
import { cn } from "@/lib/utils";

// Fallbacks mirror backend/content/site.json so nothing shifts before the fetch resolves.
const FALLBACK_NAV_LINKS = [
  { to: "/domains", label: "Domains" },
  { to: "/projects", label: "Projects" },
  { to: "/resume", label: "Resume" },
  { to: "/certifications", label: "Certifications" },
  { to: "/achievements", label: "Achievements" },
  { to: "/education", label: "Education" },
  { to: "/experience", label: "Experience" },
  { to: "/contact", label: "Contact" },
];

const FALLBACK_RECRUITER_LINKS = [
  { to: "/projects", label: "Projects" },
  { to: "/experience", label: "Experience" },
  { to: "/certifications", label: "Certifications" },
  { to: "/contact", label: "Contact" },
];

export const Navbar = ({ onOpenSearch }) => {
  const scrolled = useScrolled();
  const { pathname } = useLocation();
  const { data: site } = useSite();
  const [menuOpen, setMenuOpen] = useState(false);
  const recruiter = pathname.startsWith("/recruiter");
  const links = (recruiter ? site?.nav?.recruiter : site?.nav?.primary)
    || (recruiter ? FALLBACK_RECRUITER_LINKS : FALLBACK_NAV_LINKS);
  const identity = site?.identity;

  // Close the mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <header
      data-testid={T.nav.root}
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur",
        scrolled && "shadow-[0_1px_0_0_hsl(var(--border))]",
      )}
    >
      {recruiter && (
        <div
          data-testid={T.recruiter.banner}
          className="border-b border-border bg-primary text-primary-foreground"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-xs uppercase tracking-[0.24em]">
            <span>Recruiter Mode Active</span>
            <NavLink
              to="/"
              data-testid={T.recruiter.exit}
              className="border border-primary-foreground/40 px-3 py-1 hover:bg-primary-foreground hover:text-primary"
            >
              Exit Recruiter Mode
            </NavLink>
          </div>
        </div>
      )}
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <NavLink
          to="/"
          data-testid={T.nav.link("home")}
          className="group flex shrink-0 items-center gap-3"
        >
          <span className="grid h-8 w-8 place-items-center border border-border bg-card font-display text-lg font-extrabold leading-none">
            H
          </span>
          <span className="font-display text-sm font-extrabold uppercase tracking-[0.18em]">
            {identity?.display_name || "Harshil"}<span className="text-primary">/</span>{identity?.brand_suffix || "OS"}
          </span>
        </NavLink>

        {/* Full navigation — shown when the CONTENT COLUMN is wide enough
            (container query), so the Ask OS panel collapses it cleanly. */}
        <div className="nav-desktop items-center gap-[clamp(0.125rem,0.6vw,0.75rem)]">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={T.nav.link(l.to.replace(/^\//, ""))}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap border border-transparent px-2 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "border-border bg-card text-foreground",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-testid="nav-search-trigger"
            onClick={onOpenSearch}
            className="flex items-center gap-2 border border-border bg-card px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:border-primary hover:text-foreground"
            aria-label="Search everything"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden 2xl:inline">Search</span>
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="nav-collapsed items-center border border-border bg-card px-3 py-1.5 text-muted-foreground hover:border-primary hover:text-foreground"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="nav-menu-panel border-t border-border bg-background">
          <div className="mx-auto grid max-w-7xl gap-1 px-6 py-4">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    "border border-transparent px-3 py-2.5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground",
                    isActive && "border-border bg-card text-foreground",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
