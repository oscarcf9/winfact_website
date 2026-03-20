import { db } from "@/db";
import { subscriptions, picks, posts } from "@/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import {
  Users,
  Target,
  FileText,
  DollarSign,
  Eye,
  TrendingUp,
  Send,
  Activity,
  Brain,
  PenLine,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TodaysGames } from "@/components/admin/todays-games";
import { ActivePicksFeed } from "@/components/admin/active-picks-feed";
import { NewPickButton } from "@/components/admin/new-pick-button";

async function getAdminStats() {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [subscriberCount, picksThisMonth, postCount, draftPostCount, allActiveSubs] = await Promise.all([
    db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: count() })
      .from(picks)
      .where(sql`${picks.publishedAt} >= ${monthStart}`)
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.status, "published"))
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.status, "draft"))
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ tier: subscriptions.tier })
      .from(subscriptions)
      .where(sql`${subscriptions.status} IN ('active', 'trialing')`),
  ]);

  // Calculate MRR from active subscriptions
  const mrr = allActiveSubs.reduce((sum, s) => {
    if (s.tier === "vip_weekly") return sum + (45 * 4.33);
    if (s.tier === "vip_monthly") return sum + 120;
    if (s.tier === "season_pass") return sum + (599 / 6); // ~6 month season amortized
    return sum;
  }, 0);

  return { subscriberCount, picksThisMonth, postCount, draftPostCount, mrr };
}

function getGreeting(t: (key: string) => string) {
  const hour = new Date().getHours();
  if (hour < 12) return t("greetingMorning");
  if (hour < 17) return t("greetingAfternoon");
  return t("greetingEvening");
}

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin.dashboard");
  const stats = await getAdminStats();
  const greeting = getGreeting(t);

  const STAT_CARDS = [
    { key: "subscribers", icon: Users, accent: "from-primary to-primary", label: t("activeSubscribers") },
    { key: "picks", icon: Target, accent: "from-accent to-accent", label: t("picksThisMonth") },
    { key: "posts", icon: FileText, accent: "from-success to-success", label: t("publishedPosts") },
    { key: "revenue", icon: DollarSign, accent: "from-warning to-warning", label: t("monthlyRevenue") },
  ] as const;

  const statValues: Record<string, string> = {
    subscribers: String(stats.subscriberCount),
    picks: String(stats.picksThisMonth),
    posts: String(stats.postCount),
    revenue: stats.mrr > 0 ? `$${Math.round(stats.mrr).toLocaleString("en-US")}` : "$0",
  };

  const quickActions = [
    { href: "/admin/blog/new", icon: FileText, label: t("newPost") },
    { href: "/", icon: Eye, label: t("viewSite") },
    { href: "/admin/performance", icon: TrendingUp, label: t("performance") },
    { href: "/admin/distribution", icon: Send, label: t("distribution") },
    { href: "/admin/intelligence", icon: Activity, label: t("intelligence") },
    { href: "/admin/ai", icon: Brain, label: t("aiAssistant") },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top row: Header + Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-gray-400 text-sm mb-1">{greeting}</p>
          <h1 className="font-heading font-bold text-3xl md:text-4xl tracking-tight">
            <span className="text-primary">{t("title")}</span>
          </h1>
        </div>

        {/* Quick Actions — compact row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <NewPickButton label={t("newPick")} />
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-navy"
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-5 transition-all duration-300 hover:border-gray-300 group"
          >
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.accent} opacity-60 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <card.icon className="h-4.5 w-4.5 text-gray-500" />
              </div>
            </div>
            <div className="font-mono text-2xl font-bold tracking-tight text-navy">
              {statValues[card.key]}
            </div>
            <p className="text-xs text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Pending Blog Drafts */}
      {stats.draftPostCount > 0 && (
        <Link
          href="/admin/blog?status=draft"
          className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-amber-50 border border-amber-200/60 hover:bg-amber-100/60 transition-colors group"
        >
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <PenLine className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {stats.draftPostCount} {t("blogDraftsAwaiting")}
            </p>
            <p className="text-xs text-amber-600/80">{t("blogDraftsReview")}</p>
          </div>
          <span className="text-xs font-medium text-amber-600 group-hover:underline">{t("blogDraftsAction")}</span>
        </Link>
      )}

      {/* Main content: Today's Games + Active Picks */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Today's Games — takes 3/5 */}
        <div className="lg:col-span-3">
          <TodaysGames />
        </div>

        {/* Active Picks — takes 2/5 */}
        <div className="lg:col-span-2">
          <ActivePicksFeed />
        </div>
      </div>
    </div>
  );
}
