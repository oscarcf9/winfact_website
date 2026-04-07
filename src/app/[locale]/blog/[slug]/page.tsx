import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/ui/page-hero";
import { JsonLd, articleJsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import {
  getPostBySlug,
  getPostTags,
  getPostTagsBatch,
  getRelatedPosts,
  getAllPublishedSlugs,
} from "@/db/queries/posts";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  const dbPost = await getPostBySlug(slug);

  if (dbPost) {
    const title = locale === "es" && dbPost.titleEs ? dbPost.titleEs : dbPost.titleEn;
    const description = dbPost.seoDescription
      ?? (dbPost.bodyEn ? dbPost.bodyEn.slice(0, 160).replace(/\s+\S*$/, "...") : "");

    return {
      title: dbPost.seoTitle ?? title,
      description,
      alternates: {
        canonical: dbPost.canonicalUrl ?? `/${locale}/blog/${slug}`,
        languages: { en: `/en/blog/${slug}`, es: `/es/blog/${slug}` },
      },
      openGraph: {
        title,
        description,
        type: "article",
        url: `${SITE_URL}/${locale}/blog/${slug}`,
        publishedTime: dbPost.publishedAt ?? undefined,
        authors: [dbPost.author ?? "WinFact"],
        images: dbPost.ogImage ? [dbPost.ogImage] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  }

  return {};
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderBodyContent(body: string) {
  // If body already contains HTML tags, render directly
  const hasHtml = /<(h[1-6]|p|div|ul|ol|strong|em|a|br)\b/i.test(body);

  let html: string;
  if (hasHtml) {
    // Already HTML — just clean up any stray markdown
    html = body
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  } else {
    // Legacy markdown → HTML conversion
    html = body
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
      .replace(/^---$/gm, "<hr />")
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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  // Try DB first — also try draft posts to prevent 404 for auto-generated content
  let dbPost = await getPostBySlug(slug);

  // If not found as published, check if it exists as draft (auto-blog creates drafts)
  if (!dbPost) {
    const { getPostBySlugAnyStatus } = await import("@/db/queries/posts");
    dbPost = await getPostBySlugAnyStatus(slug);
  }

  if (dbPost) {
    const tags = await getPostTags(dbPost.id);
    const sports = tags.map((t) => t.sport);
    const dbRelated = await getRelatedPosts(dbPost.slug, sports, 3);

    // Build related posts with tags (batch to avoid N+1)
    const relatedTagsMap = await getPostTagsBatch(dbRelated.map((rp) => rp.id));
    const relatedWithTags = dbRelated.map((rp) => ({
      ...rp,
      sports: relatedTagsMap.get(rp.id) ?? [],
    }));

    const title = locale === "es" && dbPost.titleEs ? dbPost.titleEs : dbPost.titleEn;
    const body = (locale === "es" && dbPost.bodyEs ? dbPost.bodyEs : dbPost.bodyEn) || "";
    const category = (dbPost.category ?? "news") as "free_pick" | "game_preview" | "strategy" | "model_breakdown" | "news";
    const publishedAt = dbPost.publishedAt ?? dbPost.createdAt ?? new Date().toISOString();
    const author = dbPost.author ?? "WinFact";
    const featuredImage = dbPost.featuredImage || null;
    const readingTime = body
      ? Math.ceil(body.split(/\s+/).length / 200)
      : 5;
    const excerpt = body ? body.slice(0, 200).replace(/\s+\S*$/, "...") : "";

    return (
      <>
        <JsonLd
          data={articleJsonLd({
            title,
            description: dbPost.seoDescription ?? excerpt,
            url: `${SITE_URL}/${locale}/blog/${slug}`,
            publishedAt,
            author,
          })}
        />
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "Home", url: SITE_URL },
            { name: t("title"), url: `${SITE_URL}/${locale}/blog` },
            { name: title, url: `${SITE_URL}/${locale}/blog/${slug}` },
          ])}
        />

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

                {/* Lead excerpt */}
                {excerpt && (
                <p className="text-xl text-gray-700 leading-relaxed font-medium mb-8 border-l-4 border-primary pl-6">
                  {excerpt}
                </p>
                )}

                {/* Article content from DB */}
                {body && (
                <div className="space-y-6 text-gray-600 leading-relaxed">
                  {renderBodyContent(body)}
                </div>
                )}
              </article>

              {/* CTA within article */}
              <Card variant="navy" className="mt-12 text-center">
                <CardContent className="py-8">
                  <Heading as="h3" size="h4" className="text-white mb-3">
                    Want Full Access to Our Picks?
                  </Heading>
                  <p className="text-white/70 mb-6">
                    Join VIP for daily {sports.join(", ")} picks backed by
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

          {/* Related Posts Section */}
          {relatedWithTags.length > 0 && (
            <Section bg="light">
              <Container>
                <div className="text-center mb-12">
                  <Heading as="h2" size="h2" className="mb-3">
                    {t("relatedPosts")}
                  </Heading>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {relatedWithTags.map((related) => {
                    const relTitle =
                      locale === "es" && related.titleEs
                        ? related.titleEs
                        : related.titleEn;
                    const relCategory = (related.category ?? "news") as "free_pick" | "game_preview" | "strategy" | "model_breakdown" | "news";
                    const relPublishedAt =
                      related.publishedAt ?? related.createdAt ?? new Date().toISOString();
                    const relBody =
                      locale === "es" && related.bodyEs
                        ? related.bodyEs
                        : related.bodyEn;
                    const relExcerpt = relBody
                      ? relBody.slice(0, 200).replace(/\s+\S*$/, "...")
                      : "";
                    const relReadingTime = relBody
                      ? Math.ceil(relBody.split(/\s+/).length / 200)
                      : 5;

                    return (
                      <Link
                        key={related.slug}
                        href={`/blog/${related.slug}`}
                        className="block group"
                      >
                        <Card className="h-full group-hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <Badge variant="default">
                                {t(`categories.${relCategory}`)}
                              </Badge>
                              {related.sports.map((sport) => (
                                <Badge key={sport} variant="default" className="text-xs">
                                  {sport}
                                </Badge>
                              ))}
                            </div>
                            <Heading
                              as="h3"
                              size="h5"
                              className="group-hover:text-primary transition-colors"
                            >
                              {relTitle}
                            </Heading>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-600 text-sm line-clamp-3">
                              {relExcerpt}
                            </p>
                          </CardContent>
                          <CardFooter className="flex items-center justify-between text-xs text-gray-500">
                            <time dateTime={relPublishedAt}>
                              {formatDate(relPublishedAt)}
                            </time>
                            <span>
                              {t("readingTime", { minutes: relReadingTime })}
                            </span>
                          </CardFooter>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
                <div className="text-center mt-10">
                  <Link href="/blog">
                    <Button variant="outline">{t("title")}</Button>
                  </Link>
                </div>
              </Container>
            </Section>
          )}
        </main>

        <Footer />
      </>
    );
  }

  // No post found in database
  notFound();
}
