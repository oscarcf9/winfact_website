import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/ui/page-hero";
import { getPostById, getPostTags } from "@/db/queries/posts";
import { AlertTriangle, Pencil, Send, ArrowLeft } from "lucide-react";
import { PublishButton } from "./publish-button";

type Props = { params: Promise<{ locale: string; id: string }> };

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderBodyContent(body: string) {
  // If body contains HTML tags, render as HTML
  const hasHtml = /<(h[1-6]|p|div|ul|ol|strong|em|a|br)\b/i.test(body);

  let html: string;
  if (hasHtml) {
    html = body
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  } else {
    // Legacy markdown → HTML
    html = body
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
      .split(/\n\s*\n/)
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        if (/^<(h[1-6]|li|hr|ul|ol)/.test(trimmed)) {
          if (trimmed.includes("<li>")) return `<ul>${trimmed}</ul>`;
          return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export default async function BlogPreviewPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  const post = await getPostById(id);
  if (!post) notFound();

  const tags = await getPostTags(post.id);
  const sports = tags.map((t) => t.sport);

  const title = locale === "es" && post.titleEs ? post.titleEs : post.titleEn;
  const body = locale === "es" && post.bodyEs ? post.bodyEs : post.bodyEn;
  const category = (post.category ?? "news") as "free_pick" | "game_preview" | "strategy" | "model_breakdown" | "news";
  const publishedAt = post.publishedAt ?? post.createdAt ?? new Date().toISOString();
  const author = post.author ?? "WinFact";
  const featuredImage = post.featuredImage || null;
  const readingTime = body ? Math.ceil(body.split(/\s+/).length / 200) : 5;
  const excerpt = body ? body.replace(/<[^>]*>/g, "").slice(0, 200).replace(/\s+\S*$/, "...") : "";
  const isDraft = post.status !== "published";

  return (
    <>
      {/* Preview Banner */}
      <div className="sticky top-0 z-[60] bg-amber-500 text-white">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-2.5 gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">
              PREVIEW {isDraft ? `\u2014 This post is ${post.status}, not published yet` : "\u2014 This post is live"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/blog/${id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            {isDraft && (
              <PublishButton postId={id} />
            )}
            <Link
              href="/admin/blog"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Blog
            </Link>
          </div>
        </div>
      </div>

      <Header />

      <main>
        {/* Article Header */}
        <PageHero className="!text-left">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge variant="default" className="bg-white/20 text-white border-0">
              {t(`categories.${category}`)}
            </Badge>
            {sports.map((sport) => (
              <Badge key={sport} variant="sport" sportColor="rgba(255,255,255,0.15)">
                {sport}
              </Badge>
            ))}
            {isDraft && (
              <Badge variant="default" className="bg-amber-500/80 text-white border-0">
                {post.status?.toUpperCase()}
              </Badge>
            )}
          </div>
          <Heading as="h1" size="h1" className="mb-6">
            {title}
          </Heading>
          <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
            <span className="font-medium text-white/90">{author}</span>
            <span aria-hidden="true">&middot;</span>
            <time dateTime={publishedAt}>
              {formatDate(publishedAt)}
            </time>
            <span aria-hidden="true">&middot;</span>
            <span>{t("readingTime", { minutes: readingTime })}</span>
          </div>
        </PageHero>

        {/* Article Body */}
        <Section>
          <Container size="narrow">
            <article className="prose prose-lg max-w-none">
              {/* Featured Image */}
              {featuredImage && (
                <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
                  <img
                    src={featuredImage}
                    alt={title}
                    className="w-full h-auto object-cover"
                    loading="eager"
                  />
                </div>
              )}

              {excerpt && (
              <p className="text-xl text-gray-700 leading-relaxed font-medium mb-8 border-l-4 border-primary pl-6">
                {excerpt}
              </p>
              )}

              <div className="space-y-6 text-gray-600 leading-relaxed">
                {body ? renderBodyContent(body) : (
                  <p className="text-gray-400 italic">No content yet.</p>
                )}
              </div>
            </article>

            <Card variant="navy" className="mt-12 text-center">
              <CardContent className="py-8">
                <Heading as="h3" size="h4" className="text-white mb-3">
                  Want Full Access to Our Picks?
                </Heading>
                <p className="text-white/70 mb-6">
                  Join VIP for daily {sports.length > 0 ? sports.join(", ") : "sports"} picks backed by
                  data, delivered to your app and dashboard.
                </p>
                <Link href="/pricing">
                  <Button variant="primary" size="lg">
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
