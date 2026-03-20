import { db } from "@/db";
import { users, subscriptions } from "@/db/schema";
import { desc, eq, sql, and, isNull } from "drizzle-orm";
import { Users, UserCheck, Clock, UserX, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SubscriberActionMenu, ExportButton } from "@/components/admin/subscriber-actions";

type Props = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function AdminSubscribersPage({ searchParams }: Props) {
  const t = await getTranslations("admin.subscribers");
  const params = await searchParams;
  const pageSize = 50;
  const page = Math.max(1, parseInt(params.page || "1"));
  const offset = (page - 1) * pageSize;

  // ── Stat cards: full COUNT queries (no LIMIT) ──
  const [totalUsersRow] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [activeRow] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "active"));
  const [trialingRow] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "trialing"));
  const [cancelledRow] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "cancelled"));
  const [pastDueRow] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "past_due"));

  const totalUsers = totalUsersRow?.count ?? 0;
  const totalActive = activeRow?.count ?? 0;
  const totalTrialing = trialingRow?.count ?? 0;
  const totalCancelled = cancelledRow?.count ?? 0;
  const totalPastDue = pastDueRow?.count ?? 0;

  const statCards = [
    { icon: Users, value: totalUsers, label: t("totalUsers"), accent: "from-primary to-primary" },
    { icon: UserCheck, value: totalActive, label: t("active"), accent: "from-success to-success" },
    { icon: Clock, value: totalTrialing, label: t("trialing"), accent: "from-accent to-accent" },
    { icon: AlertTriangle, value: totalPastDue, label: "Past Due", accent: "from-warning to-warning" },
    { icon: UserX, value: totalCancelled, label: t("cancelled"), accent: "from-danger to-danger" },
  ];

  // ── Build filtered query for list + count ──
  // Determine the filtered total and paginated rows based on status filter
  let filteredTotal: number;
  let filteredRows: { user: typeof users.$inferSelect; subscription: typeof subscriptions.$inferSelect | null }[];

  if (params.status === "none") {
    // Users with no subscription at all
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .where(isNull(subscriptions.id));
    filteredTotal = countRow?.count ?? 0;

    const rows = await db
      .select({ user: users, subscription: subscriptions })
      .from(users)
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .where(isNull(subscriptions.id))
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset);
    filteredRows = rows;
  } else if (params.status) {
    // Filter by subscription status
    const statusFilter = params.status as "active" | "trialing" | "past_due" | "cancelled" | "expired";
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .innerJoin(subscriptions, and(eq(users.id, subscriptions.userId), eq(subscriptions.status, statusFilter)));
    filteredTotal = countRow?.count ?? 0;

    const rows = await db
      .select({ user: users, subscription: subscriptions })
      .from(users)
      .innerJoin(subscriptions, and(eq(users.id, subscriptions.userId), eq(subscriptions.status, statusFilter)))
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset);
    filteredRows = rows;
  } else {
    // All users
    filteredTotal = totalUsers;
    const rows = await db
      .select({ user: users, subscription: subscriptions })
      .from(users)
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset);
    filteredRows = rows;
  }

  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const showingFrom = filteredTotal === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + pageSize, filteredTotal);

  // Build pagination href helper
  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  }

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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
              {filteredRows.map((row) => {
                const user = row.user;
                const sub = row.subscription;
                return (
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
                      {sub?.tier?.replace(/_/g, " ") || "\u2014"}
                    </td>
                    <td className="py-3 px-6 text-center">
                      {sub ? (
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          sub.status === "active"
                            ? "bg-success/15 text-success border border-success/20"
                            : sub.status === "trialing"
                              ? "bg-primary/15 text-primary border border-primary/20"
                              : sub.status === "past_due"
                                ? "bg-warning/15 text-warning border border-warning/20"
                                : "bg-danger/15 text-danger border border-danger/20"
                        }`}>
                          {sub.status}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-center text-xs text-gray-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "\u2014"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <SubscriberActionMenu user={{ ...user, subscription: sub ? { id: sub.id, tier: sub.tier, status: sub.status, stripeSubscriptionId: sub.stripeSubscriptionId, currentPeriodEnd: sub.currentPeriodEnd } : null }} />
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
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

        {/* Pagination */}
        {filteredTotal > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-navy">{showingFrom}-{showingTo}</span> of{" "}
              <span className="font-semibold text-navy">{filteredTotal}</span> subscribers
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <a
                  href={pageHref(page - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-all"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </a>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-gray-50 border border-gray-100 cursor-not-allowed">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </span>
              )}
              <span className="text-xs text-gray-500 px-2">
                Page <span className="font-semibold text-navy">{page}</span> of{" "}
                <span className="font-semibold text-navy">{totalPages}</span>
              </span>
              {page < totalPages ? (
                <a
                  href={pageHref(page + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-all"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-gray-50 border border-gray-100 cursor-not-allowed">
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
