import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BlogDeleteButton } from "@/components/admin/blog-delete-button";
import { NewPostButton } from "@/components/admin/new-post-modal";
import { BlogShareButton } from "@/components/admin/blog-share-button";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminBlogPage({ searchParams }: Props) {
  const t = await getTranslations("admin.blog");
  const tc = await getTranslations("admin.common");
  const params = await searchParams;
  const condition = params.status ? eq(posts.status, params.status as "draft" | "published" | "scheduled") : undefined;

  const allPosts = await db
    .select()
    .from(posts)
    .where(condition)
    .orderBy(desc(posts.createdAt))
    .limit(100);

  const statusFilters = ["All", "draft", "published", "scheduled"];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
          {" "}
          <span className="text-gray-400 text-lg font-normal ml-3">{tc("management")}</span>
        </h1>
        <NewPostButton />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((s) => {
          const isActive = (s === "All" && !params.status) || params.status === s;
          return (
            <a
              key={s}
              href={`?status=${s === "All" ? "" : s}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              {s === "All" ? s : s.charAt(0).toUpperCase() + s.slice(1)}
            </a>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("titleCol")}</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("slug")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("category")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("status")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("published")}</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {allPosts.map((post) => {
                const excerpt = post.seoDescription
                  || (post.bodyEn ? post.bodyEn.replace(/<[^>]*>/g, "").slice(0, 200).replace(/\s+\S*$/, "...") : "");
                return (
                <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors group">
                  <td className="py-3 px-6 font-medium text-gray-800 max-w-[200px] truncate">
                    <Link href={`/admin/blog/${post.id}`} className="block hover:text-primary transition-colors">
                      {post.titleEn}
                    </Link>
                  </td>
                  <td className="py-3 px-6 text-gray-400 font-mono text-xs">
                    <Link href={`/admin/blog/${post.id}`} className="block hover:text-primary transition-colors">
                      {post.slug}
                    </Link>
                  </td>
                  <td className="py-3 px-6 text-center text-xs text-gray-500">
                    {post.category ? post.category.replace(/_/g, " ") : "\u2014"}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      post.status === "published"
                        ? "bg-success/15 text-success border border-success/20"
                        : post.status === "scheduled"
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center text-xs text-gray-400">
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "\u2014"}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <BlogShareButton
                        postId={post.id}
                        slug={post.slug}
                        excerpt={excerpt}
                        imageUrl={post.featuredImage || undefined}
                      />
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="text-accent/70 hover:text-accent text-sm transition-colors"
                      >
                        {tc("edit")}
                      </Link>
                      <BlogDeleteButton
                        postId={post.id}
                        postTitle={post.titleEn}
                        isPublished={post.status === "published"}
                      />
                    </div>
                  </td>
                </tr>
                );
              })}
              {allPosts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t("empty")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
