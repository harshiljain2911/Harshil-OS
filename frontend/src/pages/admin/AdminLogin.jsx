import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { adminLogin } from "@/lib/adminApi";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!password || state === "loading") return;
    setState("loading");
    setError("");
    try {
      await adminLogin(password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setState("idle");
      const status = err?.response?.status;
      if (status === 401) setError("Invalid credentials.");
      else if (status === 429) setError("Too many attempts. Wait a minute.");
      else if (status === 503) setError("Admin panel is not configured on the server (set ADMIN_PASSWORD).");
      else setError("Login failed. Is the backend running?");
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <form onSubmit={submit} className="w-full max-w-sm border border-border bg-card p-8">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" aria-hidden />
          <h1 className="font-display text-sm font-extrabold uppercase tracking-[0.24em]">Harshil/OS · Admin</h1>
        </div>
        <label className="mt-8 block">
          <div className="eyebrow">Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        {error && (
          <div className="mt-4 border border-destructive bg-destructive/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-destructive" role="alert">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={!password || state === "loading"}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 border border-primary bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-primary-foreground disabled:opacity-50"
        >
          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in</> : "Sign in"}
        </button>
      </form>
    </main>
  );
}
