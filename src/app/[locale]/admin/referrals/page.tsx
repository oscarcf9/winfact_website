import { db } from "@/db";
import { referrals, users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Gift, UserCheck, Award, Percent } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AdminReferralsPage() {
  const t = await getTranslations("admin.referrals");
  const tc = await getTranslations("admin.common");
  const allReferrals = await db
    .select()
    .from(referrals)
    .orderBy(desc(referrals.createdAt))
    .limit(200);

  const total = allReferrals.length;
  const converted = allReferrals.filter((r) => r.status === "converted").length;
  const rewarded = allReferrals.filter((r) => r.rewardApplied).length;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "\u2014";

  // Get referrer names
  const referrerIds = [...new Set(allReferrals.map((r) => r.referrerId).filter(Boolean))];
  const referrers = referrerIds.length > 0
    ? await db.select({ id: users.id, email: users.email, name: users.name }).from(users)
    : [];
  const referrerMap = new Map(referrers.map((r) => [r.id, r.email || r.name || "Unknown"]));

  const statCards = [
    { icon: Gift, value: String(total), label: t("totalReferrals"), accent: "from-primary to-primary" },
    { icon: UserCheck, value: String(converted), label: t("converted"), accent: "from-success to-success" },
    { icon: Award, value: String(rewarded), label: t("rewardsGiven"), accent: "from-accent to-accent" },
    { icon: Percent, value: `${conversionRate}%`, label: t("conversionRate"), accent: "from-warning to-warning" },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
        <span className="text-primary">{t("title")}</span>
        <span className="text-gray-400 text-lg font-normal ml-3">{tc("management")}</span>
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

      {/* Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("referrer")}</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("referredEmail")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("status")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("reward")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {allReferrals.map((ref) => (
                <tr key={ref.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6 text-gray-700">{referrerMap.get(ref.referrerId!) || "\u2014"}</td>
                  <td className="py-3 px-6 text-gray-500">{ref.referredEmail}</td>
                  <td className="py-3 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      ref.status === "converted"
                        ? "bg-success/15 text-success border border-success/20"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                      {ref.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    {ref.rewardApplied ? (
                      <span className="text-success text-xs font-semibold">{t("applied")}</span>
                    ) : (
                      <span className="text-gray-300 text-xs">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center text-xs text-gray-400">
                    {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString() : "\u2014"}
                  </td>
                </tr>
              ))}
              {allReferrals.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Gift className="h-10 w-10 text-gray-200 mx-auto mb-3" />
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
