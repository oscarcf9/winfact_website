import { db } from "@/db";
import { posts, postTags } from "@/db/schema";
import { eq, desc, and, ne, inArray } from "drizzle-orm";

type PostCategory = "free_pick" | "game_preview" | "strategy" | "model_breakdown" | "news";

export async function getPublishedPosts(options?: {
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions = [eq(posts.status, "published")];

  if (options?.category) {
    conditions.push(eq(posts.category, options.category as PostCategory));
  }

  return db
    .select()
    .from(posts)
    .where(and(...conditions))
    .orderBy(desc(posts.publishedAt))
    .limit(options?.limit ?? 20)
    .offset(options?.offset ?? 0);
}

export async function getPostBySlug(slug: string) {
  const result = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .limit(1);
  return result[0] ?? null;
}

/** Fetch any post by slug regardless of status (fallback for auto-blog drafts). */
export async function getPostBySlugAnyStatus(slug: string) {
  const result = await db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);
  return result[0] ?? null;
}

/** Fetch any post by ID regardless of status (for admin preview). */
export async function getPostById(id: string) {
  const result = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function getPostTags(postId: string) {
  return db
    .select({ sport: postTags.sport })
    .from(postTags)
    .where(eq(postTags.postId, postId));
}

export async function getPostTagsBatch(postIds: string[]) {
  if (postIds.length === 0) return new Map<string, string[]>();

  const allTags = await db
    .select({ postId: postTags.postId, sport: postTags.sport })
    .from(postTags)
    .where(inArray(postTags.postId, postIds));

  const tagsByPostId = new Map<string, string[]>();
  for (const tag of allTags) {
    const existing = tagsByPostId.get(tag.postId) ?? [];
    existing.push(tag.sport);
    tagsByPostId.set(tag.postId, existing);
  }
  return tagsByPostId;
}

export async function getRelatedPosts(
  currentSlug: string,
  sports: string[],
  limit = 3
) {
  const conditions = [
    eq(posts.status, "published"),
    ne(posts.slug, currentSlug),
  ];

  const allPosts = await db
    .select()
    .from(posts)
    .where(and(...conditions))
    .orderBy(desc(posts.publishedAt))
    .limit(limit * 3);

  // Prefer posts that share sport tags
  if (sports.length > 0) {
    const tagsResult = await db
      .select()
      .from(postTags)
      .where(
        inArray(
          postTags.postId,
          allPosts.map((p) => p.id)
        )
      );

    const postSports = new Map<string, string[]>();
    for (const tag of tagsResult) {
      const existing = postSports.get(tag.postId) ?? [];
      existing.push(tag.sport);
      postSports.set(tag.postId, existing);
    }

    const scored = allPosts.map((post) => {
      const pSports = postSports.get(post.id) ?? [];
      const overlap = pSports.filter((s) => sports.includes(s)).length;
      return { post, overlap };
    });

    scored.sort((a, b) => b.overlap - a.overlap);
    return scored.slice(0, limit).map((s) => s.post);
  }

  return allPosts.slice(0, limit);
}

export async function getAllPublishedSlugs() {
  return db
    .select({ slug: posts.slug })
    .from(posts)
    .where(eq(posts.status, "published"));
}

/**
 * Same as getAllPublishedSlugs but also returns lastModified — used by the
 * sitemap so Google's crawl budget tracks actual content changes instead
 * of the per-render timestamp.
 */
export async function getAllPublishedSlugsWithTimestamps() {
  return db
    .select({
      slug: posts.slug,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(eq(posts.status, "published"));
}
