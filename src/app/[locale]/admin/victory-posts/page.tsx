import { db } from "@/db";
import { victoryPosts, picks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { Camera, Download, Trash2, CheckCircle, Clock, XCircle } from "lucide-react";

export default async function VictoryPostsPage() {
  const posts = await db
    .select({
      id: victoryPosts.id,
      pickId: victoryPosts.pickId,
      imageUrl: victoryPosts.imageUrl,
      caption: victoryPosts.caption,
      sport: victoryPosts.sport,
      tier: victoryPosts.tier,
      status: victoryPosts.status,
      postedAt: victoryPosts.postedAt,
      createdAt: victoryPosts.createdAt,
      // Join pick data
      matchup: picks.matchup,
      pickText: picks.pickText,
    })
    .from(victoryPosts)
    .leftJoin(picks, eq(victoryPosts.pickId, picks.id))
    .orderBy(desc(victoryPosts.createdAt))
    .limit(100);

  const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
    draft: { icon: Clock, color: "text-gray-500 bg-gray-100 border-gray-200", label: "Draft" },
    pending: { icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200", label: "Pending" },
    completed: { icon: CheckCircle, color: "text-success bg-success/10 border-success/20", label: "Completed" },
    posted: { icon: CheckCircle, color: "text-success bg-success/10 border-success/20", label: "Posted" },
    failed: { icon: XCircle, color: "text-red-600 bg-red-50 border-red-200", label: "Failed" },
    skipped: { icon: XCircle, color: "text-gray-400 bg-gray-50 border-gray-200", label: "Skipped" },
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">Victory Posts</span>
          <span className="text-gray-400 text-lg font-normal ml-3">Social media celebration graphics</span>
        </h1>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm py-16 text-center">
          <Camera className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No victory posts yet</p>
          <p className="text-gray-300 text-xs mt-1">Victory posts are created when picks win</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {posts.map((post) => {
            const config = statusConfig[post.status || "draft"] || statusConfig.draft;
            const StatusIcon = config.icon;

            return (
              <Link
                key={post.id}
                href={post.pickId ? `/admin/picks/${post.pickId}/victory-post` : "#"}
                className="group rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all block"
              >
                {/* Image */}
                {post.imageUrl ? (
                  <div className="relative aspect-[3/4] bg-gray-950 overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.matchup || "Victory post"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${config.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[3/4] bg-gray-100 flex items-center justify-center">
                    <Camera className="h-10 w-10 text-gray-200" />
                    <div className="absolute top-3 right-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${config.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">{post.sport}</span>
                    <span className="text-xs text-gray-300">|</span>
                    <span className="text-xs text-gray-500 capitalize">{post.tier}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 line-clamp-1">{post.matchup || "—"}</p>
                  <p className="text-xs text-gray-400 line-clamp-1">{post.pickText || "—"}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}
                    </span>
                    <div className="flex items-center gap-1">
                      {post.imageUrl && (
                        <a
                          href={post.imageUrl}
                          download
                          className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {post.pickId && (
                        <Link
                          href={`/admin/picks/${post.pickId}/victory-post`}
                          className="p-1 rounded-md hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors"
                          title="Edit in editor"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
