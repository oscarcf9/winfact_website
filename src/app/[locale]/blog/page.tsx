import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Clock, Calendar, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { AnimatedSection } from "@/components/ui/animated-section";
import { Link } from "@/i18n/navigation";
import { getPublishedPosts, getPostTagsBatch } from "@/db/queries/posts";
import { samplePosts } from "@/data/sample-posts";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: "/blog",
      languages: { en: "/en/blog", es: "/es/blog" },
    },
    openGraph: {
      title: "Blog | WinFact Picks",
      description:
        "Free picks, game previews, betting strategy, and model breakdowns from the WinFact analytics team.",
      type: "website",
      images: [{ url: "/images/og-default.png" }],
    },
  };
}

type BlogPost = {
  slug: string;
  title: string;
  category: "free_pick" | "game_preview" | "strategy" | "model_breakdown" | "news";
  sports: string[];
  excerpt: string;
  readingTime: number;
  publishedAt: string;
  author: string;
};

const CATEGORIES = [
  "all",
  "free_pick",
  "game_preview",
  "strategy",
  "model_breakdown",
  "news",
] as const;

const CATEGORY_COLORS: Record<BlogPost["category"], string> = {
  free_pick: "#16a34a",
  game_preview: "#2563eb",
  strategy: "#9333ea",
  model_breakdown: "#ea580c",
  news: "#64748b",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function BlogCard({
  post,
  categoryLabel,
  readMoreLabel,
  readingTimeLabel,
}: {
  post: BlogPost;
  categoryLabel: string;
  readMoreLabel: string;
  readingTimeLabel: string;
}) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <Card className="h-full flex flex-col group-hover:border-primary/20 group-hover:shadow-lg transition-all duration-300">
        {/* Category + Sport badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge
            variant="sport"
            sportColor={CATEGORY_COLORS[post.category]}
          >
            {categoryLabel}
          </Badge>
          {post.sports.map((s) => (
            <Badge key={s} className="bg-gray-100 text-gray-600 text-[10px]">
              {s}
            </Badge>
          ))}
        </div>

        {/* Title */}
        <h3 className="font-heading font-bold text-lg text-navy mb-3 leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
          {post.excerpt}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {readingTimeLabel}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(post.publishedAt)}
            </span>
          </div>
          <span className="text-primary text-xs font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {readMoreLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Card>
    </Link>
  );
}

function CategoryTabs({ translations }: { translations: (key: string) => string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {CATEGORIES.map((category, i) => (
        <button
          key={category}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
            i === 0
              ? "bg-primary text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {translations(`categories.${category}`)}
        </button>
      ))}
    </div>
  );
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  // Fetch posts from DB (batch-load tags in single query to avoid N+1)
  const dbPosts = await getPublishedPosts({ limit: 20 });
  const tagsByPostId = await getPostTagsBatch(dbPosts.map((p) => p.id));
  const postsWithTags = dbPosts.map((post) => ({
    ...post,
    sports: tagsByPostId.get(post.id) ?? [],
  }));

  // Map DB posts to BlogPost shape, or fall back to sample data
  let posts: BlogPost[];

  if (postsWithTags.length > 0) {
    posts = postsWithTags.map((p) => ({
      slug: p.slug,
      title: locale === "es" && p.titleEs ? p.titleEs : p.titleEn,
      category: (p.category ?? "news") as BlogPost["category"],
      sports: p.sports,
      excerpt: (() => {
        const body = locale === "es" && p.bodyEs ? p.bodyEs : p.bodyEn;
        if (!body) return "";
        const plain = body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        return plain.length > 160 ? plain.slice(0, 160).replace(/\s+\S*$/, "...") : plain;
      })(),
      readingTime: (() => {
        const body = locale === "es" && p.bodyEs ? p.bodyEs : p.bodyEn;
        return body ? Math.ceil(body.replace(/<[^>]*>/g, "").split(/\s+/).length / 200) : 5;
      })(),
      publishedAt: p.publishedAt ?? p.createdAt ?? new Date().toISOString(),
      author: p.author ?? "WinFact",
    }));
  } else {
    // Fall back to sample data
    posts = samplePosts.map((p) => ({
      slug: p.slug,
      title: p.titleKey,
      category: p.category,
      sports: p.sport,
      excerpt: p.excerpt,
      readingTime: p.readingTime,
      publishedAt: p.publishedAt,
      author: p.author,
    }));
  }

  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <PageHero>
          <Badge className="mb-4 bg-white/10 text-white border border-white/20">
            Blog & Insights
          </Badge>
          <Heading as="h1" size="h1" className="text-white mb-4">
            {t("title")}
          </Heading>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            {t("subtitle")}
          </p>
          <Link href="/pricing">
            <Button variant="primary" size="xl">
              Join VIP
            </Button>
          </Link>
        </PageHero>

        {/* Category Filters */}
        <Section bg="white" className="!py-8">
          <Container>
            <AnimatedSection direction="up">
              <CategoryTabs translations={(key: string) => t(key)} />
            </AnimatedSection>
          </Container>
        </Section>

        {/* All Posts Grid */}
        <Section bg="light">
          <Container>
            <div className="mb-8">
              <Heading as="h2" size="h4" className="text-navy">
                Latest Articles
              </Heading>
            </div>

            <AnimatedSection direction="up" delay={0.1}>
              {posts.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post) => (
                    <BlogCard
                      key={post.slug}
                      post={post}
                      categoryLabel={t(`categories.${post.category}`)}
                      readMoreLabel={t("readMore")}
                      readingTimeLabel={t("readingTime", { minutes: post.readingTime })}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-gray-400 text-lg">{t("noPosts")}</p>
                </div>
              )}
            </AnimatedSection>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
