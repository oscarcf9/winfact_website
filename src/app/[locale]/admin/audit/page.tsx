import { db } from "@/db";
import { pickAuditLog, users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Shield, FileSearch, Clock, History } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AdminAuditPage() {
  const t = await getTranslations("admin.audit");

  const logs = await db.select().from(pickAuditLog).orderBy(desc(pickAuditLog.createdAt)).limit(200);
  const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u.email]));

  const actionColors: Record<string, string> = {
    created: "bg-primary/15 text-primary border border-primary/20",
    updated: "bg-accent/15 text-accent border border-accent/20",
    published: "bg-success/15 text-success border border-success/20",
    settled: "bg-warning/15 text-warning border border-warning/20",
    deleted: "bg-danger/15 text-danger border border-danger/20",
  };

  const statCards = [
    { icon: Shield, value: String(logs.length), label: t("totalEntries"), accent: "from-primary to-primary" },
    { icon: FileSearch, value: String(logs.filter((l) => l.action === "published").length), label: t("publishes"), accent: "from-success to-success" },
    { icon: Clock, value: String(logs.filter((l) => l.action === "settled").length), label: t("settlements"), accent: "from-warning to-warning" },
    { icon: History, value: String(logs.filter((l) => l.action === "updated").length), label: t("edits"), accent: "from-accent to-accent" },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
        <span className="text-primary">{t("title")}</span>
        <span className="text-gray-400 text-lg font-normal ml-3">{t("subtitle")}</span>
      </h1>

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

      {/* Transparency Note */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 p-5">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-navy">{t("tamperProofTitle")}</p>
            <p className="text-xs text-gray-500 mt-1">{t("tamperProofDesc")}</p>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-heading font-bold text-lg text-navy">{t("pickAuditLog")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("pickId")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("action")}</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("user")}</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("changes")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("timestamp")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6 font-mono text-xs text-gray-500">{log.pickId?.substring(0, 8)}...</td>
                  <td className="py-3 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${actionColors[log.action] || "bg-gray-100 text-gray-500"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-xs text-gray-500">{userMap.get(log.userId || "") || log.userId?.substring(0, 8)}</td>
                  <td className="py-3 px-6 text-xs text-gray-400 max-w-[300px] truncate">{log.changesSummary || "\u2014"}</td>
                  <td className="py-3 px-6 text-center text-xs text-gray-400 font-mono">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "\u2014"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Shield className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t("empty")}</p>
                    <p className="text-gray-300 text-xs mt-1">{t("emptyHint")}</p>
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
