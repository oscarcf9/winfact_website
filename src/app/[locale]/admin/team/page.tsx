import { db } from "@/db";
import { teamMembers, activityLog, users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Users, Shield, UserCheck, Activity } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AdminTeamPage() {
  const t = await getTranslations("admin.team");

  const members = await db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
  const allUsers = await db.select({ id: users.id, email: users.email, name: users.name }).from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const recentActivity = await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(30);

  const roleColors: Record<string, string> = {
    owner: "bg-accent/15 text-accent border border-accent/20",
    analyst: "bg-primary/15 text-primary border border-primary/20",
    writer: "bg-success/15 text-success border border-success/20",
    support: "bg-warning/15 text-warning border border-warning/20",
  };

  const statCards = [
    { icon: Users, value: String(members.length), label: t("teamMembers"), accent: "from-primary to-primary" },
    { icon: Shield, value: String(members.filter((m) => m.teamRole === "owner").length), label: t("owners"), accent: "from-accent to-accent" },
    { icon: UserCheck, value: String(members.filter((m) => m.isActive).length), label: t("active"), accent: "from-success to-success" },
    { icon: Activity, value: String(recentActivity.length), label: t("recentActions"), accent: "from-warning to-warning" },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">{t("subtitle")}</span>
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-5 transition-all duration-300 hover:bg-gray-100 group">
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.accent} opacity-60 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center gap-2 mb-3"><card.icon className="h-4 w-4 text-gray-400" /></div>
            <p className="font-mono text-2xl font-bold text-navy">{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Roles Legend */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("rolePermissions")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/20 mb-2">{t("ownerRole")}</span>
            <p className="text-xs text-gray-500">{t("ownerDesc")}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20 mb-2">{t("analystRole")}</span>
            <p className="text-xs text-gray-500">{t("analystDesc")}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/20 mb-2">{t("writerRole")}</span>
            <p className="text-xs text-gray-500">{t("writerDesc")}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/15 text-warning border border-warning/20 mb-2">{t("supportRole")}</span>
            <p className="text-xs text-gray-500">{t("supportDesc")}</p>
          </div>
        </div>
      </div>

      {/* Team Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-heading font-bold text-lg text-navy">{t("teamMembers")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("member")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("role")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("status")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("added")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const user = userMap.get(member.userId);
                return (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-6">
                      <p className="text-gray-800 font-medium">{user?.name || "Unknown"}</p>
                      <p className="text-gray-400 text-xs">{user?.email}</p>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors[member.teamRole] || "bg-gray-100 text-gray-500"}`}>
                        {member.teamRole}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${member.isActive ? "bg-success/15 text-success border border-success/20" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                        {member.isActive ? t("active") : t("inactive")}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center text-xs text-gray-400">
                      {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "\u2014"}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t("emptyMembers")}</p>
                    <p className="text-gray-300 text-xs mt-1">{t("emptyMembersHint")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-heading font-bold text-lg text-navy">{t("activityLog")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("user")}</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("action")}</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("resource")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("time")}</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((log) => {
                const user = userMap.get(log.userId || "");
                return (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-6 text-gray-700 text-xs">{user?.email || log.userId?.substring(0, 8)}</td>
                    <td className="py-3 px-6 text-gray-500">{log.action}</td>
                    <td className="py-3 px-6 text-gray-400 text-xs font-mono">{log.resourceType}{log.resourceId ? `:${log.resourceId.substring(0, 8)}` : ""}</td>
                    <td className="py-3 px-6 text-center text-xs text-gray-400">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "\u2014"}</td>
                  </tr>
                );
              })}
              {recentActivity.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <Activity className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t("emptyActivity")}</p>
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
