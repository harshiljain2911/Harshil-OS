/**
 * JSON-LD schema.org injector. Renders a plain <script type="application/ld+json">
 * directly in the tree (not via Helmet) because Helmet's async serialization
 * intermittently drops inline <script> children in production builds.
 */
export const StructuredData = ({ data }) => (
  // eslint-disable-next-line react/no-danger
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
);

// `site` is the site.json singleton (see lib/useContent.js useSite()). Callers
// pass whatever they already fetched — these stay plain functions, not hooks.
export const personSchema = (site) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  name: site?.identity?.display_name || "Harshil",
  jobTitle: site?.identity?.role_title || site?.identity?.professional_headline || "Engineering Student",
  description: site?.identity?.positioning_statement || site?.identity?.one_liner || "",
  knowsAbout: site?.identity?.primary_focus_areas?.length
    ? site.identity.primary_focus_areas
    : ["Software Engineering", "Embedded Systems", "Artificial Intelligence"],
  url: "/",
});

export const projectSchema = (project, site) => {
  const siteUrl = site?.seo?.site_url || "";
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${siteUrl}/projects/${project.slug}`,
    name: project.title,
    description: project.subtitle,
    abstract: project.summary,
    creator: { "@type": "Person", name: site?.identity?.display_name || "Harshil" },
    dateModified: project.updated_at,
    keywords: [...(project.tags || []), ...(project.stack || [])].join(", "),
    about: (project.domain_slugs || []).map((d) => ({ "@type": "Thing", name: d })),
  };
};

export const blogSchema = (post, site) => {
  const siteUrl = site?.seo?.site_url || "";
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${siteUrl}/blog/${post.slug}`,
    headline: post.title,
    description: post.subtitle || "",
    datePublished: post.published_at,
    author: { "@type": "Person", name: site?.identity?.display_name || "Harshil" },
    keywords: (post.tags || []).join(", "),
    wordCount: (post.body_md || "").split(/\s+/).length,
    timeRequired: `PT${post.reading_minutes}M`,
  };
};

export const domainSchema = (domain) => ({
  "@context": "https://schema.org",
  "@type": "Thing",
  name: domain.name,
  description: domain.tagline,
  disambiguatingDescription: domain.overview,
});

export const breadcrumbSchema = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: it.url,
  })),
});
