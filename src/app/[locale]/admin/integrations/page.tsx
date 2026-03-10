import { db } from "@/db";
import { apiIntegrations, webhookLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Plug, Wifi, WifiOff, AlertCircle, Activity, Globe, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AdminIntegrationsPage() {
  const t = await getTranslations("admin.integrations");

  const integrations = await db.select().from(apiIntegrations);
  const recentWebhooks = await db.select().from(webhookLogs).orderBy(desc(webhookLogs.createdAt)).limit(50);

  const connected = integrations.filter((i) => i.status === "connected").length;
  const errored = integrations.filter((i) => i.status === "error").length;

  const statusColors: Record<string, string> = {
    connected: "bg-success/15 text-success border border-success/20",
    disconnected: "bg-gray-100 text-gray-500 border border-gray-200",
    error: "bg-danger/15 text-danger border border-danger/20",
    rate_limited: "bg-warning/15 text-warning border border-warning/20",
  };

  const statusIcons: Record<string, typeof Wifi> = {
    connected: Wifi,
    disconnected: WifiOff,
    error: AlertCircle,
    rate_limited: AlertCircle,
  };

  const defaultIntegrations = [
    { name: t("theOddsApi"), type: "odds", description: t("theOddsApiDesc") },
    { name: t("telegramBot"), type: "telegram", description: t("telegramBotDesc") },
    { name: t("mailerLite"), type: "email", description: t("mailerLiteDesc") },
    { name: t("stripeService"), type: "analytics", description: t("stripeServiceDesc") },
    { name: t("clerk"), type: "analytics", description: t("clerkDesc") },
    { name: t("claudeAi"), type: "ai", description: t("claudeAiDesc") },
  ];

  const intMap = new Map(integrations.map((i) => [i.name, i]));

  const statCards = [
    { icon: Plug, value: String(defaultIntegrations.length), label: t("totalIntegrations"), accent: "from-primary to-primary" },
    { icon: Wifi, value: String(connected), label: t("connected"), accent: "from-success to-success" },
    { icon: AlertCircle, value: String(errored), label: t("errors"), accent: "from-danger to-danger" },
    { icon: Activity, value: String(recentWebhooks.length), label: t("recentWebhooks"), accent: "from-accent to-accent" },
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

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {defaultIntegrations.map((def) => {
          const integration = intMap.get(def.name);
          const status = integration?.status || "disconnected";
          const StatusIcon = statusIcons[status] || WifiOff;

          return (
            <div key={def.name} className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 transition-all duration-300 hover:shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-gray-400" />
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
                  <StatusIcon className="h-3 w-3" />
                  {status.replace(/_/g, " ")}
                </span>
              </div>
              <h3 className="font-heading font-bold text-navy text-base mb-1">{def.name}</h3>
              <p className="text-xs text-gray-400 mb-3">{def.description}</p>
              {integration?.requestsToday != null && integration.requestsToday > 0 && (
                <p className="text-xs text-gray-400">
                  <span className="font-mono">{integration.requestsToday}</span>
                  {integration.requestLimit ? ` / ${integration.requestLimit}` : ""} {t("requestsToday")}
                </p>
              )}
              {integration?.lastError && (
                <p className="text-xs text-danger/70 mt-2 truncate">{integration.lastError}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Webhook Log */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-heading font-bold text-lg text-navy">{t("webhookLog")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("direction")}</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("source")}</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("endpoint")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("status")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("duration")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("time")}</th>
              </tr>
            </thead>
            <tbody>
              {recentWebhooks.map((wh) => (
                <tr key={wh.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6">
                    {wh.direction === "incoming" ? (
                      <span className="flex items-center gap-1 text-primary text-xs"><ArrowDownLeft className="h-3 w-3" /> {t("in")}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-accent text-xs"><ArrowUpRight className="h-3 w-3" /> {t("out")}</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-gray-700">{wh.source}</td>
                  <td className="py-3 px-6 text-xs text-gray-400 font-mono truncate max-w-[200px]">{wh.endpoint}</td>
                  <td className="py-3 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      wh.statusCode && wh.statusCode < 300
                        ? "bg-success/15 text-success border border-success/20"
                        : wh.statusCode && wh.statusCode >= 400
                          ? "bg-danger/15 text-danger border border-danger/20"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                      {wh.statusCode || "\u2014"}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center text-xs text-gray-400 font-mono">{wh.duration ? `${wh.duration}ms` : "\u2014"}</td>
                  <td className="py-3 px-6 text-center text-xs text-gray-400">{wh.createdAt ? new Date(wh.createdAt).toLocaleString() : "\u2014"}</td>
                </tr>
              ))}
              {recentWebhooks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Activity className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t("noWebhooks")}</p>
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
