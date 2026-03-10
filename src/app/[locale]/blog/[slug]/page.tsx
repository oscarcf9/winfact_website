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
  getRelatedPosts,
  getAllPublishedSlugs,
} from "@/db/queries/posts";
import { samplePosts } from "@/data/sample-posts";
import { SITE_URL } from "@/lib/constants";

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs();
  if (slugs.length > 0) {
    return slugs.map(({ slug }) => ({ slug }));
  }
  // Fall back to sample data if DB is empty
  return samplePosts.map((post) => ({ slug: post.slug }));
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
        canonical: dbPost.canonicalUrl ?? `/blog/${slug}`,
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

  // Fall back to sample data
  const post = samplePosts.find((p) => p.slug === slug);
  if (!post) return {};

  const title = post.titleKey;
  const description = post.excerpt;

  return {
    title,
    description,
    alternates: {
      canonical: `/blog/${slug}`,
      languages: { en: `/en/blog/${slug}`, es: `/es/blog/${slug}` },
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}/${locale}/blog/${slug}`,
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.sport,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
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
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim());
  return paragraphs.map((paragraph, i) => (
    <p key={i}>{paragraph.trim()}</p>
  ));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  // Try DB first
  const dbPost = await getPostBySlug(slug);

  if (dbPost) {
    const tags = await getPostTags(dbPost.id);
    const sports = tags.map((t) => t.sport);
    const dbRelated = await getRelatedPosts(dbPost.slug, sports, 3);

    // Build related posts with tags
    const relatedWithTags = await Promise.all(
      dbRelated.map(async (rp) => {
        const rpTags = await getPostTags(rp.id);
        return { ...rp, sports: rpTags.map((t) => t.sport) };
      })
    );

    const title = locale === "es" && dbPost.titleEs ? dbPost.titleEs : dbPost.titleEn;
    const body = locale === "es" && dbPost.bodyEs ? dbPost.bodyEs : dbPost.bodyEn;
    const category = (dbPost.category ?? "news") as "free_pick" | "game_preview" | "strategy" | "model_breakdown" | "news";
    const publishedAt = dbPost.publishedAt ?? dbPost.createdAt ?? new Date().toISOString();
    const author = dbPost.author ?? "WinFact";
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
                {/* Lead excerpt */}
                <p className="text-xl text-gray-700 leading-relaxed font-medium mb-8 border-l-4 border-primary pl-6">
                  {excerpt}
                </p>

                {/* Article content from DB */}
                <div className="space-y-6 text-gray-600 leading-relaxed">
                  {renderBodyContent(body)}
                </div>
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

  // ── Fall back to sample data ──────────────────────────────────────────
  const post = samplePosts.find((p) => p.slug === slug);
  if (!post) {
    notFound();
  }

  const relatedPosts = samplePosts
    .filter(
      (p) =>
        p.slug !== post.slug &&
        (p.sport.some((s) => post.sport.includes(s)) ||
          p.category === post.category)
    )
    .slice(0, 3);

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: post.titleKey,
          description: post.excerpt,
          url: `${SITE_URL}/${locale}/blog/${slug}`,
          publishedAt: post.publishedAt,
          author: post.author,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: t("title"), url: `${SITE_URL}/${locale}/blog` },
          { name: post.titleKey, url: `${SITE_URL}/${locale}/blog/${slug}` },
        ])}
      />

      <Header />

      <main>
        {/* Article Header */}
        <Section bg="gradient" className="py-16 md:py-24">
          <Container size="narrow">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Badge variant="default" className="bg-white/20 text-white border-0">
                {t(`categories.${post.category}`)}
              </Badge>
              {post.sport.map((sport) => (
                <Badge key={sport} variant="sport" sportColor="rgba(255,255,255,0.15)">
                  {sport}
                </Badge>
              ))}
            </div>
            <Heading as="h1" size="h1" className="mb-6">
              {post.titleKey}
            </Heading>
            <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
              <span className="font-medium text-white/90">{post.author}</span>
              <span aria-hidden="true">&middot;</span>
              <time dateTime={post.publishedAt}>
                {formatDate(post.publishedAt)}
              </time>
              <span aria-hidden="true">&middot;</span>
              <span>{t("readingTime", { minutes: post.readingTime })}</span>
            </div>
          </Container>
        </Section>

        {/* Article Body */}
        <Section>
          <Container size="narrow">
            <article className="prose prose-lg max-w-none">
              {/* Lead excerpt */}
              <p className="text-xl text-gray-700 leading-relaxed font-medium mb-8 border-l-4 border-primary pl-6">
                {post.excerpt}
              </p>

              {/* Placeholder article content */}
              <div className="space-y-6 text-gray-600 leading-relaxed">
                <p>
                  The betting market for {post.sport.join(", ")} continues to
                  evolve as sharp bettors and recreational players alike adjust to
                  new data sources and analytical approaches. At WinFact, our
                  multi-model consensus approach ensures we only release picks
                  where multiple independent models agree on a significant edge.
                </p>

                <Heading as="h2" size="h4" className="text-foreground mt-10 mb-4">
                  Key Factors in Our Analysis
                </Heading>
                <p>
                  Every pick we release goes through a rigorous four-step
                  validation process. First, our proprietary models generate
                  independent projections for each game. Second, we compare these
                  projections against the current market lines to identify
                  discrepancies. Third, we scan for sharp money movement that
                  confirms or contradicts our model output. Finally, we evaluate
                  the closing line value potential to ensure we are getting the
                  best possible number.
                </p>

                <Heading as="h2" size="h4" className="text-foreground mt-10 mb-4">
                  Why Closing Line Value Matters
                </Heading>
                <p>
                  Closing Line Value (CLV) remains the gold standard for
                  measuring betting skill over the long term. A bettor who
                  consistently beats the closing line is demonstrably getting
                  better odds than the market settles on, which is the clearest
                  indicator of a sustainable edge. Our track record of positive
                  average CLV across all sports speaks to the strength of our
                  analytical process.
                </p>

                <Heading as="h2" size="h4" className="text-foreground mt-10 mb-4">
                  Looking Ahead
                </Heading>
                <p>
                  As we move deeper into the season, market efficiency tends to
                  increase as sportsbooks refine their lines with more data. This
                  is where a data-driven approach truly shines — our models adapt
                  to in-season trends, injury impacts, and schedule dynamics that
                  static power ratings miss. Stay tuned for more analysis and
                  picks delivered daily to your app and dashboard.
                </p>
              </div>
            </article>

            {/* CTA within article */}
            <Card variant="navy" className="mt-12 text-center">
              <CardContent className="py-8">
                <Heading as="h3" size="h4" className="text-white mb-3">
                  Want Full Access to Our Picks?
                </Heading>
                <p className="text-white/70 mb-6">
                  Join VIP for daily {post.sport.join(", ")} picks backed by
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
        {relatedPosts.length > 0 && (
          <Section bg="light">
            <Container>
              <div className="text-center mb-12">
                <Heading as="h2" size="h2" className="mb-3">
                  {t("relatedPosts")}
                </Heading>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}`}
                    className="block group"
                  >
                    <Card className="h-full group-hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant="default">
                            {t(`categories.${related.category}`)}
                          </Badge>
                          {related.sport.map((sport) => (
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
                          {related.titleKey}
                        </Heading>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 text-sm line-clamp-3">
                          {related.excerpt}
                        </p>
                      </CardContent>
                      <CardFooter className="flex items-center justify-between text-xs text-gray-500">
                        <time dateTime={related.publishedAt}>
                          {formatDate(related.publishedAt)}
                        </time>
                        <span>
                          {t("readingTime", { minutes: related.readingTime })}
                        </span>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
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
