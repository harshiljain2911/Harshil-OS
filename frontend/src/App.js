import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Terminal } from "@/components/terminal/Terminal";
import { AIAssistant } from "@/components/assistant/AIAssistant";
import { SearchModal } from "@/components/search/SearchModal";
import { useCollection, useSite } from "@/lib/useContent";
import { pageTransition } from "@/lib/motionVariants";

import Home from "@/pages/Home";
import About from "@/pages/About";
import Domains from "@/pages/Domains";
import DomainDetail from "@/pages/DomainDetail";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Education from "@/pages/Education";
import Experience from "@/pages/Experience";
import Achievements from "@/pages/Achievements";
import Certifications from "@/pages/Certifications";
import Timeline from "@/pages/Timeline";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import Recruiter from "@/pages/Recruiter";
import Developer from "@/pages/Developer";
import Contact from "@/pages/Contact";
import Resume from "@/pages/Resume";
import NotFound from "@/pages/NotFound";

// Hidden admin panel — lazy so it never weighs down the public bundle, and
// deliberately absent from nav, footer, terminal, sitemap, and prerender.
const AdminApp = lazy(() => import("@/pages/admin/AdminApp"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // The portfolio scrolls inside #app-scroll now, not the window. Reset that
    // container on navigation (direct property = instant, ignores scroll-smooth).
    const el = document.getElementById("app-scroll");
    if (el) { el.scrollTop = 0; el.scrollLeft = 0; }
    else window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AnimatedRoutes({ onOpenTerminal }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
      >
        <Routes location={location}>
          <Route path="/" element={<Home onOpenTerminal={onOpenTerminal} />} />
          <Route path="/about" element={<About />} />
          <Route path="/domains" element={<Domains />} />
          <Route path="/domains/:slug" element={<DomainDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
          <Route path="/education" element={<Education />} />
          <Route path="/experience" element={<Experience />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/recruiter" element={<Recruiter />} />
          <Route path="/developer" element={<Developer />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function Shell() {
  const [termOpen, setTermOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: projects = [] } = useCollection("projects");
  const { data: domains = [] } = useCollection("domains");
  const { data: site } = useSite();

  const openTerminal = useCallback(() => setTermOpen(true), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeAssistant = useCallback((val) => setAiOpen(val === false ? true : false), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setTermOpen((v) => !v);
      }
      // ⌘/Ctrl+/ opens universal search
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10001] focus:border focus:border-primary focus:bg-background focus:px-3 focus:py-2 focus:text-xs focus:uppercase focus:tracking-[0.24em] focus:text-primary"
        data-testid="skip-to-content"
      >
        Skip to content
      </a>
      {/* ChatGPT/Copilot-style layout: the shell is exactly one viewport tall
          and clips itself, so the browser window never scrolls. Inside it are
          TWO independent scroll containers — the portfolio (#app-scroll) and the
          assistant's own message list. Opening Ask OS shrinks the portfolio
          column (push layout) rather than covering it. */}
      <div className="relative flex h-full overflow-hidden">
        <div
          id="app-scroll"
          className="app-main-col flex h-full min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain scroll-smooth"
        >
          <Navbar onOpenSearch={openSearch} />
          <div id="main" className="flex-1">
            <AnimatedRoutes onOpenTerminal={openTerminal} />
          </div>
          <Footer />
        </div>
        <AIAssistant open={aiOpen} onClose={closeAssistant} />
      </div>
      <Terminal open={termOpen} onClose={() => setTermOpen(false)} projects={projects} domains={domains} site={site} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<div className="grid min-h-screen place-items-center bg-background text-xs uppercase tracking-[0.24em] text-muted-foreground">Loading admin…</div>}>
                <AdminApp />
              </Suspense>
            }
          />
          <Route path="*" element={<Shell />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}
