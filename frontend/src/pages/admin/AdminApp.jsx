/**
 * Hidden Admin Panel — never linked from public navigation, sitemap, terminal,
 * or prerender config. Direct URL access without a token redirects to login.
 */
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeftCircle, Bot, LayoutDashboard, FolderKanban, FileText, Globe, Image as ImageIcon, LogOut } from "lucide-react";
import { getAdminToken, clearAdminToken } from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import AdminCollection from "./AdminCollection";
import AdminEditor from "./AdminEditor";
import AdminSite from "./AdminSite";
import AdminMedia from "./AdminMedia";
import AdminAI from "./AdminAI";
import AdminResumes from "./AdminResumes";

// Generic collections (rendered by AdminCollection). "resumes" gets its own
// dedicated Resume Management view, so it is intentionally not in this list.
export const COLLECTIONS = [
  "domains", "projects", "experience", "certifications", "achievements",
  "timeline", "blog", "research",
];

function Guard({ children }) {
  if (!getAdminToken()) return <Navigate to="/admin/login" replace />;
  return children;
}

function Sidebar() {
  const { pathname } = useLocation();
  const linkCls = (active) =>
    cn(
      "flex items-center gap-2 border border-transparent px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground",
      active && "border-border bg-card text-foreground",
    );
  return (
    <aside className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b border-border bg-background p-3 md:h-screen md:w-56 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:sticky md:top-0">
      <div className="hidden px-3 pb-4 pt-2 font-display text-sm font-extrabold uppercase tracking-[0.18em] md:block">
        Harshil<span className="text-primary">/</span>OS <span className="text-muted-foreground">· Admin</span>
      </div>
      <NavLink to="/admin" end className={({ isActive }) => linkCls(isActive)}>
        <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
      </NavLink>
      <NavLink to="/admin/site" className={({ isActive }) => linkCls(isActive)}>
        <Globe className="h-3.5 w-3.5" /> Site
      </NavLink>
      <NavLink to="/admin/media" className={({ isActive }) => linkCls(isActive)}>
        <ImageIcon className="h-3.5 w-3.5" /> Media
      </NavLink>
      <NavLink to="/admin/ai" className={({ isActive }) => linkCls(isActive)}>
        <Bot className="h-3.5 w-3.5" /> AI Settings
      </NavLink>
      <div className="hidden px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.24em] text-muted-foreground md:block">
        Collections
      </div>
      {COLLECTIONS.map((c) => (
        <NavLink key={c} to={`/admin/content/${c}`} className={() => linkCls(pathname.startsWith(`/admin/content/${c}`))}>
          <FolderKanban className="h-3.5 w-3.5" /> {c}
        </NavLink>
      ))}
      <NavLink to="/admin/content/resumes" className={() => linkCls(pathname.startsWith("/admin/content/resumes"))}>
        <FileText className="h-3.5 w-3.5" /> Resume Management
      </NavLink>
      <NavLink
        to="/"
        className="mt-auto flex items-center gap-2 border border-transparent px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftCircle className="h-3.5 w-3.5" /> Exit Admin Mode
      </NavLink>
      <button
        type="button"
        onClick={() => { clearAdminToken(); window.location.href = "/admin/login"; }}
        className="flex items-center gap-2 border border-transparent px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive"
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out
      </button>
    </aside>
  );
}

function AdminShell({ children }) {
  return (
    <Guard>
      <div className="flex min-h-screen flex-col bg-background md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </Guard>
  );
}

export default function AdminApp() {
  return (
    <>
      <Helmet>
        <title>Admin — Harshil OS</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route path="" element={<AdminShell><AdminDashboard /></AdminShell>} />
        <Route path="site" element={<AdminShell><AdminSite /></AdminShell>} />
        <Route path="media" element={<AdminShell><AdminMedia /></AdminShell>} />
        <Route path="ai" element={<AdminShell><AdminAI /></AdminShell>} />
        <Route path="content/resumes" element={<AdminShell><AdminResumes /></AdminShell>} />
        <Route path="content/:collection" element={<AdminShell><AdminCollection /></AdminShell>} />
        <Route path="content/:collection/new" element={<AdminShell><AdminEditor mode="create" /></AdminShell>} />
        <Route path="content/:collection/:slug" element={<AdminShell><AdminEditor mode="edit" /></AdminShell>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </>
  );
}
