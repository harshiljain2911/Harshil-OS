import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { submitContact } from "@/lib/api";
import { PageMeta } from "@/components/seo/PageMeta";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { useSite } from "@/lib/useContent";
import { T } from "@/lib/testIds";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  const { data: site } = useSite();
  const contact = site?.contact;
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", company: "" });
  const [state, setState] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!form.name || !form.subject || !form.message) {
      setState("error"); setErrorMsg("Please fill in name, subject, and message."); return;
    }
    if (!EMAIL_RE.test(form.email)) {
      setState("error"); setErrorMsg("Please provide a valid email."); return;
    }
    setState("loading");
    try {
      await submitContact(form);
      setState("success");
      setForm({ name: "", email: "", subject: "", message: "", company: "" });
    } catch (err) {
      setState("error");
      setErrorMsg(err?.response?.data?.detail || "Something went wrong. Try again.");
    }
  };

  return (
    <>
      <PageMeta title="Contact" />
      <PageShell>
        <SectionHeader
          eyebrow={contact?.page_eyebrow || "/ contact"}
          title={contact?.page_title || "Get in touch"}
          subtitle={contact?.page_subtitle || "Direct line. Recruiter emails welcome. Product ideas welcomer."}
        />

        <form
          onSubmit={submit}
          data-testid={T.contact.form}
          className="grid max-w-3xl gap-4 border border-border bg-card p-6 md:p-8"
        >
          <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="eyebrow">Name</div>
            <input
              data-testid={T.contact.name}
              value={form.name}
              onChange={set("name")}
              className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
            <label className="block">
              <div className="eyebrow">Email</div>
              <input
                data-testid={T.contact.email}
                type="text"
                value={form.email}
                onChange={set("email")}
                className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>
          <label className="block">
            <div className="eyebrow">Subject</div>
            <input
              data-testid={T.contact.subject}
              value={form.subject}
              onChange={set("subject")}
              className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <div className="eyebrow">Message</div>
            <textarea
              data-testid={T.contact.message}
              value={form.message}
              onChange={set("message")}
              rows={6}
              className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          {/* Honeypot — hidden from humans, catches bots. */}
          <input
            type="text"
            name="company"
            value={form.company}
            onChange={set("company")}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="sr-only"
          />

          <div className="flex items-center justify-between gap-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              submitContactForm() → /api/contact
            </div>
            <button
              type="submit"
              data-testid={T.contact.submit}
              disabled={state === "loading"}
              className="inline-flex items-center gap-2 border border-primary bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-primary-foreground hard-shadow-hover disabled:opacity-60"
            >
              {state === "loading" ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending</>) : "Send message"}
            </button>
          </div>

          <AnimatePresence>
            {state === "success" && (
              <motion.div
                key="ok"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                data-testid={T.contact.success}
                className="flex items-center gap-3 border border-terminal bg-terminal/10 px-4 py-3 text-sm uppercase tracking-[0.14em] text-terminal"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 15 }}
                  className="grid h-5 w-5 place-items-center border border-terminal"
                >
                  <Check className="h-3 w-3" />
                </motion.span>
                Message received — I&apos;ll reply soon.
              </motion.div>
            )}
            {state === "error" && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24 }}
                data-testid={T.contact.error}
                className="flex items-center gap-3 border border-destructive bg-destructive/10 px-4 py-3 text-sm uppercase tracking-[0.14em] text-destructive"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" /> {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </PageShell>
    </>
  );
}
