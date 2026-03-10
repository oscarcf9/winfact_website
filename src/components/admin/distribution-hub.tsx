"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Mail,
  MessageSquare,
  Calendar,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

type DeliveryLog = {
  id: string;
  pickId: string | null;
  channel: string;
  status: string;
  recipientCount: number | null;
  error: string | null;
  sentAt: string | null;
};

type QueueItem = {
  id: string;
  pickId: string | null;
  channels: string;
  tier: string;
  status: string | null;
  scheduledFor: string | null;
  createdAt: string | null;
};

type Pick = {
  id: string;
  sport: string;
  matchup: string;
  pickText: string;
  odds: number | null;
  units: number | null;
  tier: string | null;
};

type Props = {
  recentLogs: DeliveryLog[];
  pendingQueue: QueueItem[];
  recentPicks: Pick[];
  stats: {
    totalSent: number;
    sentToday: number;
    pendingCount: number;
    totalFailed: number;
  };
};

const CHANNELS = [
  { id: "telegram_free", icon: MessageSquare },
  { id: "telegram_vip", icon: MessageSquare },
  { id: "email", icon: Mail },
];

export function DistributionHub({ recentLogs, pendingQueue, recentPicks, stats }: Props) {
  const t = useTranslations("admin.distribution");
  const tc = useTranslations("admin.common");

  const [selectedPick, setSelectedPick] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["telegram_free", "email"]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const channelLabels: Record<string, string> = {
    telegram_free: t("telegramFree"),
    telegram_vip: t("telegramVip"),
    email: t("email"),
  };

  function toggleChannel(ch: string) {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  async function handleSendNow() {
    if (!selectedPick || selectedChannels.length === 0) {
      setMessage({ type: "error", text: t("selectPickAndChannel") });
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/distribution/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickId: selectedPick, channels: selectedChannels, sendNow: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: t("pickSentSuccess") });
        setSelectedPick("");
      } else {
        setMessage({ type: "error", text: data.error || t("failedToSend") });
      }
    } catch {
      setMessage({ type: "error", text: tc("networkError") });
    } finally {
      setSending(false);
    }
  }

  async function handleSchedule() {
    if (!selectedPick || selectedChannels.length === 0 || !scheduledFor) {
      setMessage({ type: "error", text: t("selectPickChannelTime") });
      return;
    }
    setScheduling(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/distribution/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickId: selectedPick, channels: selectedChannels, scheduledFor }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Scheduled for ${new Date(scheduledFor).toLocaleString()}` });
        setSelectedPick("");
        setScheduledFor("");
      } else {
        setMessage({ type: "error", text: data.error || t("failedToSchedule") });
      }
    } catch {
      setMessage({ type: "error", text: tc("networkError") });
    } finally {
      setScheduling(false);
    }
  }

  async function handleCancelQueue(queueId: string) {
    try {
      await fetch(`/api/admin/distribution/queue/${queueId}`, { method: "DELETE" });
      window.location.reload();
    } catch {
      // ignore
    }
  }

  const statCards = [
    { icon: Send, value: String(stats.totalSent), label: t("totalSent"), accent: "from-primary to-primary" },
    { icon: Zap, value: String(stats.sentToday), label: t("sentToday"), accent: "from-accent to-accent" },
    { icon: Clock, value: String(stats.pendingCount), label: t("pending"), accent: "from-warning to-warning" },
    { icon: XCircle, value: String(stats.totalFailed), label: t("failed"), accent: "from-danger to-danger" },
  ];

  const inputClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200";

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">{t("subtitle")}</span>
        </h1>
      </div>

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

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
          message.type === "success"
            ? "bg-success/10 border border-success/20 text-success"
            : "bg-danger/10 border border-danger/20 text-danger"
        }`}>
          {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Send / Schedule Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Now Card */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" />
            <h2 className="font-heading font-bold text-lg text-navy">{t("sendNow")}</h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Pick Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">{t("selectPick")}</label>
              <select
                value={selectedPick}
                onChange={(e) => setSelectedPick(e.target.value)}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="">{t("selectPickPlaceholder")}</option>
                {recentPicks.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sport}] {p.matchup} — {p.pickText}{p.odds != null ? ` (${p.odds > 0 ? "+" : ""}${p.odds})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Channels */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">{t("channels")}</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                      selectedChannels.includes(ch.id)
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <ch.icon className="h-3.5 w-3.5" />
                    {channelLabels[ch.id]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSendNow}
              disabled={sending || !selectedPick}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="h-4 w-4" />
              {sending ? t("sending") : t("sendNow")}
            </button>
          </div>
        </div>

        {/* Schedule Card */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-warning" />
            <h2 className="font-heading font-bold text-lg text-navy">{t("scheduleDelivery")}</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">{t("selectPick")}</label>
              <select
                value={selectedPick}
                onChange={(e) => setSelectedPick(e.target.value)}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="">{t("selectPickPlaceholder")}</option>
                {recentPicks.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sport}] {p.matchup} — {p.pickText}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">{t("scheduledTimeEt")}</label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">{t("channels")}</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                      selectedChannels.includes(ch.id)
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <ch.icon className="h-3.5 w-3.5" />
                    {channelLabels[ch.id]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSchedule}
              disabled={scheduling || !selectedPick || !scheduledFor}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-warning/90 to-warning text-white text-sm font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Clock className="h-4 w-4" />
              {scheduling ? t("scheduling") : t("schedule")}
            </button>
          </div>
        </div>
      </div>

      {/* Pending Queue */}
      {pendingQueue.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            <h2 className="font-heading font-bold text-lg text-navy">{t("pendingQueue")}</h2>
            <span className="ml-auto text-xs bg-warning/10 text-warning border border-warning/20 px-2.5 py-1 rounded-full font-semibold">
              {pendingQueue.length} {t("pending").toLowerCase()}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("pickCol")}</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("channelsCol")}</th>
                  <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("scheduledCol")}</th>
                  <th className="text-right py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{tc("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pendingQueue.map((item) => {
                  const channels: string[] = JSON.parse(item.channels || "[]");
                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-6 text-gray-700 font-mono text-xs">{item.pickId?.substring(0, 8)}...</td>
                      <td className="py-3 px-6">
                        <div className="flex gap-1">
                          {channels.map((ch) => (
                            <span key={ch} className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                              {ch.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-6 text-center text-xs text-gray-400">
                        {item.scheduledFor ? new Date(item.scheduledFor).toLocaleString() : "ASAP"}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          onClick={() => handleCancelQueue(item.id)}
                          className="text-danger/60 hover:text-danger text-xs transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 inline" /> {tc("cancel")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delivery Log */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <h2 className="font-heading font-bold text-lg text-navy">{t("deliveryLog")}</h2>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> {tc("refresh")}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("channel")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("status")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("recipients")}</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("error")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("sentAt")}</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6">
                    <span className="inline-flex items-center gap-1.5 text-gray-700">
                      {log.channel?.includes("telegram") ? (
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Mail className="h-3.5 w-3.5 text-accent" />
                      )}
                      {log.channel?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      log.status === "sent" || log.status === "delivered"
                        ? "bg-success/15 text-success border border-success/20"
                        : "bg-danger/15 text-danger border border-danger/20"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center font-mono text-gray-500">
                    {log.recipientCount || "\u2014"}
                  </td>
                  <td className="py-3 px-6 text-xs text-danger/70 max-w-[200px] truncate">
                    {log.error || "\u2014"}
                  </td>
                  <td className="py-3 px-6 text-center text-xs text-gray-400">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString() : "\u2014"}
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Send className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t("noDeliveries")}</p>
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
