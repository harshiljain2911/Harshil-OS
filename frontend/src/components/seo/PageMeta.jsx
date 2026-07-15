import { Helmet } from "react-helmet-async";
import { useSite } from "@/lib/useContent";
import { ogUrl } from "@/lib/api";

// Shared <title>/description/OG builder so the "— Harshil OS" suffix, the
// default meta description, and the Open Graph image all live in one place
// (site.json + the existing /api/og endpoint) instead of being retyped or
// left unset on every page.
export const PageMeta = ({ title, description, ogType = "default", ogSlug }) => {
  const { data: site } = useSite();
  const suffix = site?.seo?.default_title_suffix || "Harshil OS";
  const desc = description ?? site?.seo?.default_description;
  const fullTitle = title ? `${title} — ${suffix}` : suffix;
  const image = ogUrl(ogType, ogSlug);
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:type" content={ogSlug ? "article" : "website"} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {desc && <meta name="twitter:description" content={desc} />}
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};
