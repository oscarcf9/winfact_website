"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Plus,
  Lightbulb,
  FileEdit,
  Clock,
  CheckCircle,
  ChevronDown,
  Trash2,
} from "lucide-react";

type CalendarItem = {
  id: string;
  title: string;
  type: string;
  stage: string | null;
  scheduledDate: string | null;
  assignedTo: string | null;
  template: string | null;
  notes: string | null;
  sport: string | null;
  createdAt: string | null;
};

type Props = { items: CalendarItem[] };

const STAGES = ["All", "idea", "draft", "review", "scheduled", "published"];
const TYPES = ["blog_post", "free_pick", "social", "email", "telegram"];
const TEMPLATES = ["game_preview", "free_pick_of_day", "model_breakdown", "sharp_money_report", "weekly_recap", "custom"];
const SPORTS = ["MLB", "NFL", "NBA", "NHL", "Soccer", "NCAA"];

const inputClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200";
const selectClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 appearance-none cursor-pointer";
const labelClass = "block text-sm font-medium text-gray-500 mb-1.5";

const stageColors: Record<string, string> = {
  idea: "bg-gray-100 text-gray-500 border border-gray-200",
  draft: "bg-primary/15 text-primary border border-primary/20",
  review: "bg-warning/15 text-warning border border-warning/20",
  scheduled: "bg-accent/15 text-accent border border-accent/20",
  published: "bg-success/15 text-success border border-success/20",
};

const stageIcons: Record<string, React.ElementType> = {
  idea: Lightbulb,
  draft: FileEdit,
  review: Clock,
  scheduled: Calendar,
  published: CheckCircle,
};

export function ContentCalendar({ items }: Props) {
  const t = useTranslations("admin.calendar");
  const tc = useTranslations("admin.common");
  const [selectedStage, setSelectedStage] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const filtered = selectedStage === "All" ? items : items.filter((i) => i.stage === selectedStage);

  const stageLabels: Record<string, string> = {
    All: tc("all"),
    idea: t("idea"),
    draft: t("draft"),
    review: t("review"),
    scheduled: t("scheduled"),
    published: t("published"),
  };

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          type: form.get("type"),
          stage: form.get("stage"),
          scheduledDate: form.get("scheduledDate") || null,
          template: form.get("template") || null,
          sport: form.get("sport") || null,
          notes: form.get("notes") || null,
        }),
      });
      if (res.ok) { setShowForm(false); window.location.reload(); }
    } catch {} finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/admin/calendar/${id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function handleStageChange(id: string, newStage: string) {
    await fetch(`/api/admin/calendar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    window.location.reload();
  }

  const stageCounts = STAGES.slice(1).map((s) => ({ stage: s, count: items.filter((i) => i.stage === s).length }));

  const statCards = [
    { icon: Calendar, value: String(items.length), label: t("totalItems"), accent: "from-primary to-primary" },
    { icon: Lightbulb, value: String(stageCounts.find((s) => s.stage === "idea")?.count || 0), label: t("ideas"), accent: "from-gray-400 to-gray-400" },
    { icon: Clock, value: String(stageCounts.find((s) => s.stage === "scheduled")?.count || 0), label: t("scheduled"), accent: "from-accent to-accent" },
    { icon: CheckCircle, value: String(stageCounts.find((s) => s.stage === "published")?.count || 0), label: t("publishedStat"), accent: "from-success to-success" },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">{t("subtitle")}</span>
        </h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 cursor-pointer">
          <Plus className="h-4 w-4" />
          {t("newItem")}
        </button>
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

      {/* Create Form */}
      {showForm && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("newCalendarItem")}</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-3"><label className={labelClass}>{t("titleField")}</label><input name="title" required className={inputClass} placeholder="Game Preview: Lakers vs Celtics" /></div>
            <div className="relative"><label className={labelClass}>{t("type")}</label><select name="type" className={selectClass}>{TYPES.map((tp) => <option key={tp} value={tp}>{tp.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>)}</select><ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" /></div>
            <div className="relative"><label className={labelClass}>{t("stage")}</label><select name="stage" className={selectClass}>{STAGES.slice(1).map((s) => <option key={s} value={s}>{stageLabels[s]}</option>)}</select><ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" /></div>
            <div><label className={labelClass}>{t("scheduledDate")}</label><input name="scheduledDate" type="date" className={inputClass} /></div>
            <div className="relative"><label className={labelClass}>{t("template")}</label><select name="template" className={selectClass}><option value="">None</option>{TEMPLATES.map((tp) => <option key={tp} value={tp}>{tp.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>)}</select><ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" /></div>
            <div className="relative"><label className={labelClass}>{t("sport")}</label><select name="sport" className={selectClass}><option value="">{t("allNone")}</option>{SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}</select><ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" /></div>
            <div><label className={labelClass}>{t("notes")}</label><input name="notes" className={inputClass} placeholder={t("additionalNotes")} /></div>
            <div className="sm:col-span-2 lg:col-span-3 flex items-end gap-3">
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer">{loading ? tc("creating") : t("createItem")}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-100 transition-all duration-200 cursor-pointer">{tc("cancel")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Stage Filters */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <button key={s} onClick={() => setSelectedStage(s)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${selectedStage === s ? "bg-primary/10 text-primary border border-primary/20 font-semibold" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700"}`}>
            {stageLabels[s]}
            {s !== "All" && <span className="ml-1 text-xs text-gray-400">({stageCounts.find((sc) => sc.stage === s)?.count || 0})</span>}
          </button>
        ))}
      </div>

      {/* Calendar Items */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const StageIcon = stageIcons[item.stage || "idea"] || Lightbulb;
          return (
            <div key={item.id} className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <StageIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-navy truncate">{item.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{item.type?.replace(/_/g, " ")}</span>
                  {item.sport && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{item.sport}</span>}
                  {item.template && <span className="text-xs text-gray-400 italic">{item.template.replace(/_/g, " ")}</span>}
                  {item.scheduledDate && <span className="text-xs text-gray-400">{new Date(item.scheduledDate).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${stageColors[item.stage || "idea"]}`}>
                  {item.stage}
                </span>
                <select
                  value={item.stage || "idea"}
                  onChange={(e) => handleStageChange(item.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 cursor-pointer focus:outline-none focus:border-primary/50"
                >
                  {STAGES.slice(1).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-danger transition-colors cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-12 text-center">
            <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{t("noItems")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
