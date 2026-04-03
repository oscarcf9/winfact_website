"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  Trash2,
  Send,
  CalendarClock,
  FileText,
  Trophy,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type QueueItem = {
  id: string;
  type: "blog" | "victory_post" | "filler";
  referenceId: string;
  title: string;
  preview: string | null;
  imageUrl: string | null;
  status: "draft" | "scheduled" | "posted" | "failed";
  scheduledAt: string | null;
  postedAt: string | null;
  error: string | null;
  createdAt: string | null;
};

const PAGE_SIZE = 25;

const STATUS_TABS = ["all", "draft", "scheduled", "posted", "failed"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function TypeBadge({ type, t }: { type: QueueItem["type"]; t: (key: string) => string }) {
  const config = {
    blog: { icon: FileText, label: t("blog"), className: "bg-blue-50 text-blue-600 border-blue-200" },
    victory_post: { icon: Trophy, label: t("victoryPost"), className: "bg-amber-50 text-amber-600 border-amber-200" },
    filler: { icon: Newspaper, label: t("filler"), className: "bg-purple-50 text-purple-600 border-purple-200" },
  };
  const c = config[type];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border", c.className)}>
      <c.icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: QueueItem["status"] }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-500 border-gray-200",
    scheduled: "bg-primary/15 text-primary border-primary/20",
    posted: "bg-success/15 text-success border-success/20",
    failed: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span className={cn("inline-block px-2.5 py-1 rounded-full text-xs font-semibold border", styles[status])}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function ContentQueueDashboard() {
  const t = useTranslations("admin.contentQueue");

  const [items, setItems] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<StatusTab>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (tab !== "all") params.set("status", tab);
      const res = await fetch(`/api/admin/content-queue?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error("Fetch content queue error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, tab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const updateItem = async (id: string, body: Record<string, string>) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/content-queue/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      await fetchItems();
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteItem = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/content-queue/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchItems();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSchedule = (id: string) => {
    if (schedulingId === id) {
      // Submit the schedule
      if (scheduleDate) {
        updateItem(id, {
          status: "scheduled",
          scheduledAt: new Date(scheduleDate).toISOString(),
        });
      }
      setSchedulingId(null);
      setScheduleDate("");
    } else {
      setSchedulingId(id);
      setScheduleDate("");
    }
  };

  const handlePostNow = (id: string) => {
    updateItem(id, {
      status: "scheduled",
      scheduledAt: new Date().toISOString(),
    });
  };

  const handleTabChange = (newTab: StatusTab) => {
    setTab(newTab);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => handleTabChange(s)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer",
              tab === s
                ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700"
            )}
          >
            {t(s)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t("type")}
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t("title")}
                </th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t("statusLabel")}
                </th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t("scheduledFor")}
                </th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t("createdAt")}
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 text-gray-300 mx-auto animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Clock className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t("noItems")}</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isActioning = actionLoading === item.id;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-6">
                        <TypeBadge type={item.type} t={t} />
                      </td>
                      <td className="py-3 px-6 font-medium text-gray-800 max-w-[250px]">
                        <div className="truncate">{item.title}</div>
                        {item.error && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span className="truncate">{item.error}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-6 text-center text-xs text-gray-400">
                        {item.scheduledAt
                          ? new Date(item.scheduledAt).toLocaleString()
                          : "\u2014"}
                      </td>
                      <td className="py-3 px-6 text-center text-xs text-gray-400">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : "\u2014"}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isActioning ? (
                            <Loader2 className="h-4 w-4 text-gray-300 animate-spin" />
                          ) : (
                            <>
                              {(item.status === "draft" || item.status === "failed") && (
                                <>
                                  {schedulingId === item.id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="datetime-local"
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                        className="text-xs border border-gray-200 rounded px-1.5 py-1"
                                      />
                                      <button
                                        onClick={() => handleSchedule(item.id)}
                                        disabled={!scheduleDate}
                                        className="text-primary hover:text-primary/80 text-xs font-medium disabled:opacity-40 cursor-pointer"
                                      >
                                        OK
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSchedulingId(null);
                                          setScheduleDate("");
                                        }}
                                        className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                                      >
                                        &times;
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleSchedule(item.id)}
                                      title={t("schedule")}
                                      className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/70 hover:text-primary transition-colors cursor-pointer"
                                    >
                                      <CalendarClock className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handlePostNow(item.id)}
                                    title={t("postNow")}
                                    className="p-1.5 rounded-lg hover:bg-success/10 text-success/70 hover:text-success transition-colors cursor-pointer"
                                  >
                                    <Send className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => deleteItem(item.id)}
                                title={t("delete")}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("previous")}
            </button>
            <span className="text-xs text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {t("next")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
