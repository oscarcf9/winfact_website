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
  MessageCircle,
  ImageIcon,
  Share2,
  X,
  Globe,
  Hash,
  Languages,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";

type QueueItem = {
  id: string;
  type: "blog" | "victory_post" | "filler";
  referenceId: string;
  title: string;
  preview: string | null;
  imageUrl: string | null;
  captionEn: string | null;
  captionEs: string | null;
  hashtags: string | null;
  platform: string | null;
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

// ─── Full Preview Modal ─────────────────────────────────────
function PreviewModal({
  item,
  onClose,
  onSendTelegram,
  onSendBuffer,
  onPostNow,
  onSchedule,
  onDelete,
  actionLoading,
}: {
  item: QueueItem;
  onClose: () => void;
  onSendTelegram: (id: string) => void;
  onSendBuffer: (id: string) => void;
  onPostNow: (id: string) => void;
  onSchedule: (id: string) => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
}) {
  const [captionLang, setCaptionLang] = useState<"en" | "es">("en");
  const caption = captionLang === "en"
    ? (item.captionEn || item.captionEs || item.preview || "")
    : (item.captionEs || item.captionEn || item.preview || "");

  const isLoading = actionLoading === item.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <TypeBadge type={item.type} t={(key) => {
              const labels: Record<string, string> = { blog: "Blog", victoryPost: "Victory Post", filler: "Filler" };
              return labels[key] || key;
            }} />
            <StatusBadge status={item.status} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image */}
          {item.imageUrl ? (
            <div className="bg-gray-950 flex items-center justify-center">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="max-w-full max-h-[400px] object-contain"
              />
            </div>
          ) : (
            <div className="bg-gray-100 flex items-center justify-center py-16">
              <div className="text-center">
                <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No image</p>
              </div>
            </div>
          )}

          <div className="p-6 space-y-5">
            {/* Title */}
            <div>
              <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
              {item.preview && item.preview !== item.title && (
                <p className="text-sm text-gray-500 mt-1">{item.preview}</p>
              )}
            </div>

            {/* Caption with language toggle */}
            {(item.captionEn || item.captionEs) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <Languages className="h-3.5 w-3.5" />
                    Caption
                  </div>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCaptionLang("en")}
                      disabled={!item.captionEn}
                      className={cn(
                        "px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                        captionLang === "en"
                          ? "bg-primary/10 text-primary"
                          : "text-gray-500 hover:bg-gray-50",
                        !item.captionEn && "opacity-30 cursor-not-allowed"
                      )}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionLang("es")}
                      disabled={!item.captionEs}
                      className={cn(
                        "px-3 py-1 text-xs font-medium transition-colors cursor-pointer border-l border-gray-200",
                        captionLang === "es"
                          ? "bg-primary/10 text-primary"
                          : "text-gray-500 hover:bg-gray-50",
                        !item.captionEs && "opacity-30 cursor-not-allowed"
                      )}
                    >
                      ES
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{caption}</p>
                </div>
              </div>
            )}

            {/* Hashtags */}
            {item.hashtags && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  <Hash className="h-3.5 w-3.5" />
                  Hashtags
                </div>
                <p className="text-sm text-blue-600">{item.hashtags}</p>
              </div>
            )}

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
              {item.platform && item.platform !== "all" && (
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Platform: <span className="font-medium text-gray-600">{item.platform}</span>
                </div>
              )}
              {item.scheduledAt && (
                <div>
                  Scheduled: <span className="font-medium text-gray-600">{new Date(item.scheduledAt).toLocaleString()}</span>
                </div>
              )}
              {item.postedAt && (
                <div>
                  Posted: <span className="font-medium text-gray-600">{new Date(item.postedAt).toLocaleString()}</span>
                </div>
              )}
              {item.createdAt && (
                <div>
                  Created: <span className="font-medium text-gray-600">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Error */}
            {item.error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{item.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 shrink-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Primary actions */}
              {(item.status === "draft" || item.status === "failed") && (
                <>
                  <button
                    type="button"
                    onClick={() => onPostNow(item.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg transition-all cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    Post Now
                  </button>
                  <button
                    type="button"
                    onClick={() => onSchedule(item.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    <CalendarClock className="h-4 w-4" />
                    Schedule
                  </button>
                </>
              )}

              {/* Channel actions */}
              <button
                type="button"
                onClick={() => onSendTelegram(item.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-all cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                Telegram
              </button>
              <button
                type="button"
                onClick={() => onSendBuffer(item.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-purple-600 text-sm font-medium hover:bg-purple-50 transition-all cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                Buffer
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Destructive */}
              <button
                type="button"
                onClick={() => { onDelete(item.id); onClose(); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-red-500 text-sm font-medium hover:bg-red-50 transition-all cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────
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
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
  const [viewMode, setViewMode] = useState<"gallery" | "table">("gallery");

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
      setPreviewItem(null);
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

  const sendToTelegram = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/content-queue/${id}/telegram`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to send to Telegram");
    } catch { alert("Failed to send to Telegram"); }
    finally { setActionLoading(null); }
  };

  const sendToBuffer = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/content-queue/${id}/buffer`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to send to Buffer");
    } catch { alert("Failed to send to Buffer"); }
    finally { setActionLoading(null); }
  };

  const handleTabChange = (newTab: StatusTab) => {
    setTab(newTab);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Preview Modal */}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onSendTelegram={sendToTelegram}
          onSendBuffer={sendToBuffer}
          onPostNow={handlePostNow}
          onSchedule={(id) => handleSchedule(id)}
          onDelete={deleteItem}
          actionLoading={actionLoading}
        />
      )}

      {/* Filter tabs + view toggle */}
      <div className="flex items-center justify-between gap-4">
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
        <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("gallery")}
            className={cn(
              "p-2 transition-colors cursor-pointer",
              viewMode === "gallery" ? "bg-primary/10 text-primary" : "text-gray-400 hover:bg-gray-50"
            )}
            title="Gallery view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "p-2 transition-colors cursor-pointer border-l border-gray-200",
              viewMode === "table" ? "bg-primary/10 text-primary" : "text-gray-400 hover:bg-gray-50"
            )}
            title="Table view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm py-16 text-center">
          <Clock className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t("noItems")}</p>
        </div>
      ) : viewMode === "table" ? (
        /* ─── Table View ─────────────────────────────── */
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-12" />
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("type")}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("title")}</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("statusLabel")}</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("scheduledFor")}</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isActioning = actionLoading === item.id;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setPreviewItem(item)}
                    >
                      <td className="py-2 px-4">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-gray-300" />
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4"><TypeBadge type={item.type} t={t} /></td>
                      <td className="py-2 px-4">
                        <div className="font-medium text-gray-800 truncate max-w-[250px]">{item.title}</div>
                        {item.preview && <div className="text-xs text-gray-400 truncate max-w-[250px]">{item.preview}</div>}
                        {item.error && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-red-500">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span className="truncate">{item.error}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center"><StatusBadge status={item.status} /></td>
                      <td className="py-2 px-4 text-center text-xs text-gray-400">
                        {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "\u2014"}
                      </td>
                      <td className="py-2 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {isActioning ? (
                            <Loader2 className="h-4 w-4 text-gray-300 animate-spin" />
                          ) : (
                            <>
                              {(item.status === "draft" || item.status === "failed") && (
                                <button type="button" onClick={() => handlePostNow(item.id)} title={t("postNow")} className="p-1 rounded-md hover:bg-success/10 text-success/60 hover:text-success transition-colors cursor-pointer"><Send className="h-3.5 w-3.5" /></button>
                              )}
                              <button type="button" onClick={() => sendToTelegram(item.id)} title={t("sendTelegram")} className="p-1 rounded-md hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors cursor-pointer"><MessageCircle className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => sendToBuffer(item.id)} title="Buffer" className="p-1 rounded-md hover:bg-purple-50 text-purple-400 hover:text-purple-600 transition-colors cursor-pointer"><Share2 className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => deleteItem(item.id)} title={t("delete")} className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
        /* ─── Gallery View ─────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isActioning = actionLoading === item.id;
            return (
              <div
                key={item.id}
                className="group rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
                onClick={() => setPreviewItem(item)}
              >
                {/* Image / Placeholder */}
                {item.imageUrl ? (
                  <div className="relative aspect-[3/4] bg-gray-950 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    {/* Overlay badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <TypeBadge type={item.type} t={t} />
                    </div>
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-gray-200" />
                    <div className="absolute top-3 left-3">
                      <TypeBadge type={item.type} t={t} />
                    </div>
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="p-4 space-y-2">
                  <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">{item.title}</h4>

                  {(item.captionEn || item.captionEs || item.preview) && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {item.captionEn || item.captionEs || item.preview}
                    </p>
                  )}

                  {item.error && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.error}</span>
                    </div>
                  )}

                  {/* Footer meta */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                    </span>

                    {/* Quick action buttons (stop propagation so clicking doesn't open modal) */}
                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      {isActioning ? (
                        <Loader2 className="h-3.5 w-3.5 text-gray-300 animate-spin" />
                      ) : (
                        <>
                          {(item.status === "draft" || item.status === "failed") && (
                            <button
                              type="button"
                              onClick={() => handlePostNow(item.id)}
                              title={t("postNow")}
                              className="p-1 rounded-md hover:bg-success/10 text-success/60 hover:text-success transition-colors cursor-pointer"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => sendToTelegram(item.id)}
                            title={t("sendTelegram")}
                            className="p-1 rounded-md hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => sendToBuffer(item.id)}
                            title="Buffer"
                            className="p-1 rounded-md hover:bg-purple-50 text-purple-400 hover:text-purple-600 transition-colors cursor-pointer"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-3">
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
  );
}
