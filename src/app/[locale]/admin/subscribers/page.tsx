import { db } from "@/db";
import { users, subscriptions } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Users, UserCheck, Clock, UserX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SubscriberActionMenu, ExportButton } from "@/components/admin/subscriber-actions";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminSubscribersPage({ searchParams }: Props) {
  const t = await getTranslations("admin.subscribers");
  const params = await searchParams;

  const allUsers = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(200);

  const allSubs = await db.select().from(subscriptions);

  const subsByUser = new Map<string, typeof allSubs[0]>();
  for (const sub of allSubs) {
    if (sub.userId) subsByUser.set(sub.userId, sub);
  }

  const usersWithSubs = allUsers.map((user) => ({
    ...user,
    subscription: subsByUser.get(user.id) ?? null,
  }));

  const filtered = params.status
    ? usersWithSubs.filter((u) => {
        if (params.status === "none") return !u.subscription;
        return u.subscription?.status === params.status;
      })
    : usersWithSubs;

  const totalActive = usersWithSubs.filter((u) => u.subscription?.status === "active").length;
  const totalTrialing = usersWithSubs.filter((u) => u.subscription?.status === "trialing").length;
  const totalCancelled = usersWithSubs.filter((u) => u.subscription?.status === "cancelled").length;

  const statCards = [
    { icon: Users, value: allUsers.length, label: t("totalUsers"), accent: "from-primary to-primary" },
    { icon: UserCheck, value: totalActive, label: t("active"), accent: "from-success to-success" },
    { icon: Clock, value: totalTrialing, label: t("trialing"), accent: "from-accent to-accent" },
    { icon: UserX, value: totalCancelled, label: t("cancelled"), accent: "from-danger to-danger" },
  ];

  const statusFilters = ["All", "active", "trialing", "past_due", "cancelled", "none"];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
        </h1>
        <ExportButton />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-5 transition-all duration-300 hover:bg-gray-100 group"
          >
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.accent} opacity-60 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center gap-3 mb-2">
              <card.icon className="h-4 w-4 text-gray-400" />
            </div>
            <p className="font-mono text-2xl font-bold text-navy">{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
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
              {s === "none" ? t("noSub") : s === "All" ? s : s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")}
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
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("email")}</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("name")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("role")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("plan")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("status")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("joined")}</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6 text-gray-700">{user.email}</td>
                  <td className="py-3 px-6 text-gray-500">{user.name || "\u2014"}</td>
                  <td className="py-3 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      user.role === "admin"
                        ? "bg-accent/15 text-accent border border-accent/20"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center font-mono text-xs text-gray-500">
                    {user.subscription?.tier?.replace(/_/g, " ") || "\u2014"}
                  </td>
                  <td className="py-3 px-6 text-center">
                    {user.subscription ? (
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.subscription.status === "active"
                          ? "bg-success/15 text-success border border-success/20"
                          : user.subscription.status === "trialing"
                            ? "bg-primary/15 text-primary border border-primary/20"
                            : user.subscription.status === "past_due"
                              ? "bg-warning/15 text-warning border border-warning/20"
                              : "bg-danger/15 text-danger border border-danger/20"
                      }`}>
                        {user.subscription.status}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center text-xs text-gray-400">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "\u2014"}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <SubscriberActionMenu user={user} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
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
