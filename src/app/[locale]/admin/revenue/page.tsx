import { db } from "@/db";
import { subscriptions, revenueEvents } from "@/db/schema";
import { desc } from "drizzle-orm";
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AdminRevenuePage() {
  const t = await getTranslations("admin.revenue");

  const allSubs = await db.select().from(subscriptions);
  const allEvents = await db.select().from(revenueEvents).orderBy(desc(revenueEvents.createdAt)).limit(100);

  const activeSubs = allSubs.filter((s) => s.status === "active" || s.status === "trialing");
  const mrr = activeSubs.reduce((sum, s) => {
    if (s.tier === "vip_weekly") return sum + (45 * 4.33);
    if (s.tier === "vip_monthly") return sum + 120;
    return sum;
  }, 0);

  const byTier = {
    vip_weekly: activeSubs.filter((s) => s.tier === "vip_weekly").length,
    vip_monthly: activeSubs.filter((s) => s.tier === "vip_monthly").length,
    season_pass: activeSubs.filter((s) => s.tier === "season_pass").length,
  };

  const churned = allSubs.filter((s) => s.status === "cancelled" || s.status === "expired").length;
  const churnRate = allSubs.length > 0 ? ((churned / allSubs.length) * 100).toFixed(1) : "\u2014";

  const statCards = [
    { icon: DollarSign, value: `$${mrr.toFixed(0)}`, label: t("mrr"), accent: "from-success to-success" },
    { icon: TrendingUp, value: `$${(mrr * 12).toFixed(0)}`, label: t("arr"), accent: "from-primary to-primary" },
    { icon: Users, value: String(activeSubs.length), label: t("activeSubscribers"), accent: "from-accent to-accent" },
    { icon: AlertTriangle, value: `${churnRate}%`, label: t("churnRate"), accent: "from-danger to-danger" },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
        <span className="text-primary">{t("title")}</span>
        <span className="text-gray-400 text-lg font-normal ml-3">{t("subtitle")}</span>
      </h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-5 transition-all duration-300 hover:bg-gray-100 group"
          >
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.accent} opacity-60 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center gap-2 mb-3">
              <card.icon className="h-4 w-4 text-gray-400" />
            </div>
            <p className="font-mono text-2xl font-bold text-navy">{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Breakdown by Tier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-heading font-bold text-lg text-navy">{t("subscribersByTier")}</h2>
          </div>
          <div className="p-6 space-y-4">
            {Object.entries(byTier).map(([tier, count]) => {
              const total = activeSubs.length || 1;
              const pct = ((count / total) * 100).toFixed(0);
              const label = tier.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className="text-sm font-mono text-navy font-semibold">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription Status Breakdown */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-heading font-bold text-lg text-navy">{t("subscriptionStatus")}</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {["active", "trialing", "past_due", "cancelled", "expired"].map((status) => {
                const cnt = allSubs.filter((s) => s.status === status).length;
                const colors: Record<string, string> = {
                  active: "bg-success/15 text-success",
                  trialing: "bg-primary/15 text-primary",
                  past_due: "bg-warning/15 text-warning",
                  cancelled: "bg-danger/15 text-danger",
                  expired: "bg-gray-100 text-gray-500",
                };
                return (
                  <div key={status} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
                      {status.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-sm font-semibold text-navy">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Revenue Events */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-heading font-bold text-lg text-navy">{t("recentEvents")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("type")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("amount")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("tier")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("source")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {allEvents.map((event) => (
                <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6">
                    <span className="flex items-center gap-1.5 text-gray-700">
                      {event.type === "new_mrr" || event.type === "expansion" || event.type === "reactivation" ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-danger" />
                      )}
                      {event.type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className={`py-3 px-6 text-center font-mono font-semibold ${
                    event.type === "churn" || event.type === "contraction" ? "text-danger" : "text-success"
                  }`}>
                    {event.type === "churn" || event.type === "contraction" ? "-" : "+"}${event.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-center text-gray-500 text-xs font-mono">
                    {event.tier?.replace(/_/g, " ") || "\u2014"}
                  </td>
                  <td className="py-3 px-6 text-center text-gray-400 text-xs">{event.source || "\u2014"}</td>
                  <td className="py-3 px-6 text-center text-xs text-gray-400">
                    {event.createdAt ? new Date(event.createdAt).toLocaleDateString() : "\u2014"}
                  </td>
                </tr>
              ))}
              {allEvents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <DollarSign className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t("noEvents")}</p>
                    <p className="text-gray-300 text-xs mt-1">{t("eventsHint")}</p>
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
