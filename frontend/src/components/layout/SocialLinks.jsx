/**
 * Social links, driven entirely by site.json → social. Rendered in the hero
 * (premium row) and the footer (compact icons). Only shows links that exist.
 */
import { Github, Linkedin, Mail, Twitter, Code2, Binary } from "lucide-react";

// Order + icon per platform. LeetCode/Codeforces/HackerRank have no brand icon
// in lucide, so they use themed code glyphs — consistent with the OS aesthetic.
const PLATFORMS = [
  { key: "github", label: "GitHub", Icon: Github },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "leetcode", label: "LeetCode", Icon: Code2 },
  { key: "codeforces", label: "Codeforces", Icon: Binary },
  { key: "twitter", label: "Twitter", Icon: Twitter },
  { key: "email", label: "Email", Icon: Mail },
];

export function SocialLinks({ social = {}, variant = "row" }) {
  const items = PLATFORMS.filter((p) => social[p.key]);
  if (items.length === 0) return null;

  if (variant === "footer") {
    return (
      <div className="flex items-center gap-4">
        {items.map(({ key, label, Icon }) => (
          <a key={key} href={social[key]} aria-label={label}
            target={key === "email" ? undefined : "_blank"} rel="noreferrer"
            className="text-muted-foreground hover:text-foreground">
            <Icon className="h-4 w-4" />
          </a>
        ))}
      </div>
    );
  }

  // Premium hero row: labeled, bordered chips matching the OS card language.
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={social[key]}
          aria-label={label}
          target={key === "email" ? undefined : "_blank"}
          rel="noreferrer"
          className="group inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <Icon className="h-3.5 w-3.5 text-primary transition-transform group-hover:scale-110" aria-hidden />
          <span className="hidden sm:inline">{label}</span>
        </a>
      ))}
    </div>
  );
}
