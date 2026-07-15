import { PageMeta } from "@/components/seo/PageMeta";
import { PageShell, SectionHeader } from "@/components/layout/PageShell";
import { useSite } from "@/lib/useContent";

const FALLBACK_BIO = [
  "I grew up in Kishangarh, Rajasthan, and finished Class X at MSS Public School with 95.40%.",
  "I moved to Kota for JEE preparation — Class XII at Lord Buddha Public School (93.40%), then a 95.83 percentile at JEE Main (AIR 64326) and an AIR of 23142 at JEE Advanced. The first real proof that consistent work pays off.",
  "That brought me to LNMIIT, Jaipur, where I'm in my 5th semester of a B.Tech in Electronics & Communication Engineering (CGPA 7.79). I expected to focus on hardware — but every project I actually cared about needed software too. So I build both.",
  "Outside coursework: a Frontend Developer internship at AIMargdarshak, Creative Lead for ASME EFx 2026, and the Phoenix Robotics, QBit Quantum Computing, and Capriccio Music clubs.",
];

const FALLBACK_FACTS = [
  { label: "Location", value: "Jaipur, Rajasthan" },
  { label: "Currently", value: "B.Tech Student, LNMIIT" },
  { label: "Open to", value: "Interesting problems" },
];

export default function About() {
  const { data: site } = useSite();
  const about = site?.about;
  const bio = about?.bio_paragraphs?.length ? about.bio_paragraphs : FALLBACK_BIO;
  const facts = about?.facts?.length ? about.facts : FALLBACK_FACTS;

  return (
    <>
      <PageMeta title="Engineer DNA" />
      <PageShell>
        <SectionHeader
          eyebrow={about?.eyebrow || "/ about"}
          title={about?.title || "Engineer DNA"}
          subtitle={about?.subtitle || "Building intelligent systems across embedded hardware, full-stack software, and applied AI."}
        />
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6 text-sm leading-relaxed md:text-base">
            {bio.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <aside className="space-y-4">
            {facts.map((f) => (
              <div key={f.label} className="border border-border bg-card p-5">
                <div className="eyebrow">{f.label}</div>
                <div className="mt-1 font-mono text-sm">{f.value}</div>
              </div>
            ))}
          </aside>
        </div>
      </PageShell>
    </>
  );
}
