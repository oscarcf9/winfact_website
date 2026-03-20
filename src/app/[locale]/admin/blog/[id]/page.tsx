import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/post-form";
import { db } from "@/db";
import { posts, postTags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BlogDeleteButtonFull } from "@/components/admin/blog-delete-button";

type Props = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: Props) {
  const t = await getTranslations("admin.blog");
  const { id } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) notFound();

  const tags = await db.select({ sport: postTags.sport }).from(postTags).where(eq(postTags.postId, id));

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          {t("backToBlog")}
        </Link>
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("editTitle")}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">{t("postSubtitle")}</span>
        </h1>
      </div>
      <PostForm
        post={post}
        tags={tags.map((t) => t.sport)}
        deleteButton={
          <BlogDeleteButtonFull
            postId={post.id}
            postTitle={post.titleEn}
            isPublished={post.status === "published"}
          />
        }
      />
    </div>
  );
}
