import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Clock } from "lucide-react";
import { useCollection, useItem, useSite } from "@/lib/useContent";
import { PageMeta } from "@/components/seo/PageMeta";
import { PageShell } from "@/components/layout/PageShell";
import { BlogCard } from "@/components/cards/BlogCard";
import { StructuredData, blogSchema, breadcrumbSchema } from "@/components/seo/StructuredData";
import { T } from "@/lib/testIds";

export default function BlogPost() {
  const { slug } = useParams();
  const { data: post, isLoading } = useItem("blog", slug);
  const { data: allPosts = [] } = useCollection("blog");
  const { data: site } = useSite();
  const related = allPosts.filter((p) => p.slug !== slug).slice(0, 3);

  if (isLoading) return <PageShell><div className="h-96 animate-pulse border border-border bg-card" /></PageShell>;
  if (!post) return <PageShell><p className="text-muted-foreground">Post not found.</p></PageShell>;

  return (
    <>
      <PageMeta title={post.title} description={post.subtitle} ogType="blog" ogSlug={slug} />
      <StructuredData data={blogSchema(post, site)} />
      <StructuredData data={breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Blog", url: "/blog" },
        { name: post.title, url: `/blog/${slug}` },
      ])} />
      <PageShell>
        <Link to="/blog" className="eyebrow hover:text-primary">← Writing</Link>
        <header data-testid={T.blog.post(slug)} className="mt-6 border-l-2 border-primary pl-4">
          <div className="eyebrow">
            <Clock className="mr-1 inline h-3 w-3" /> {post.reading_minutes} min · {post.published_at}
          </div>
          <h1 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none tracking-tighter md:text-6xl">
            {post.title}
          </h1>
          {post.subtitle && <p className="mt-4 text-sm text-muted-foreground md:text-base">{post.subtitle}</p>}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(post.tags || []).map((t) => (
              <span key={t} className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{t}</span>
            ))}
          </div>
        </header>

        <article className="mt-10 max-w-3xl text-foreground [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:uppercase [&_h2]:tracking-tight [&_p]:mt-4 [&_p]:text-sm [&_p]:leading-relaxed md:[&_p]:text-base [&_ul]:mt-4 [&_ul]:list-decimal [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_li]:text-sm [&_strong]:text-primary [&_code]:border [&_code]:border-border [&_code]:bg-card [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full [&_img]:max-w-full">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>{post.body_md}</ReactMarkdown>
        </article>

        {related.length > 0 && (
          <section className="mt-16">
            <div className="eyebrow">Related</div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {related.map((p) => <BlogCard key={p.slug} post={p} />)}
            </div>
          </section>
        )}
      </PageShell>
    </>
  );
}
