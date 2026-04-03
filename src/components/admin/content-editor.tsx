"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Save, Plus, Check, Megaphone, Type, ChevronDown, ChevronUp, Sparkles, Bot, Trophy, FileText, Clock, Settings } from "lucide-react";

type ContentItem = { key: string; value: string; updatedAt: string | null };

type AutomationStatus = {
  lastBlog: string | null;
  lastVictoryPost: string | null;
  lastCommentary: string | null;
};

type Props = { initialContent: ContentItem[] };

const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200";

const ANNOUNCEMENT_KEYS = [
  { key: "announcement_bar_enabled", label: "Enabled", type: "toggle", default: "true" },
  { key: "announcement_bar_text_en", label: "Message (English)", type: "text", default: "Use code PICK80 for 80% off your first month!" },
  { key: "announcement_bar_text_es", label: "Message (Spanish)", type: "text", default: "\u00a1Usa el c\u00f3digo PICK80 para 80% de descuento en tu primer mes!" },
  { key: "announcement_bar_cta_en", label: "CTA Button (English)", type: "text", default: "Claim Offer" },
  { key: "announcement_bar_cta_es", label: "CTA Button (Spanish)", type: "text", default: "Reclamar Oferta" },
  { key: "announcement_bar_link", label: "Link URL", type: "text", default: "/pricing" },
  { key: "announcement_bar_promo_code", label: "Promo Code", type: "text", default: "PICK80" },
  { key: "announcement_bar_expires_at", label: "Expires At", type: "date", default: "" },
  { key: "announcement_bar_style", label: "Style", type: "select", default: "default", options: ["default", "urgent", "success"] },
];

type FeatureConfig = {
  key: string;
  label: string;
  description: string;
  type: "toggle";
  default: string;
  icon: typeof Bot;
  disabled?: boolean;
};

const FEATURE_KEYS: FeatureConfig[] = [
  { key: "blog_auto_generator", label: "Blog Auto-Generator", description: "Auto-generate blog posts when picks are published", type: "toggle", default: "false", icon: FileText },
  { key: "victory_posts_enabled", label: "Victory Post Generator", description: "Generate celebration graphics when picks win", type: "toggle", default: "false", icon: Trophy },
  { key: "live_commentary_enabled", label: "Live Commentary Bot", description: "Post live game commentary to Telegram", type: "toggle", default: "false", icon: Bot },
  { key: "filler_content_enabled", label: "Filler Content Bot", description: "Daily matchup graphics for social media", type: "toggle", default: "false", icon: Sparkles },
];

const COMMENTARY_SETTINGS_KEYS = [
  { key: "commentary_cooldown_minutes", label: "Cooldown (minutes)", type: "number", default: "45" },
  { key: "commentary_weekday_start_hour", label: "Weekday Start (ET)", type: "hour", default: "12" },
  { key: "commentary_weekday_end_hour", label: "Weekday End (ET)", type: "hour", default: "1" },
  { key: "commentary_weekend_start_hour", label: "Weekend Start (ET)", type: "hour", default: "10" },
  { key: "commentary_weekend_end_hour", label: "Weekend End (ET)", type: "hour", default: "1" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${i === 0 ? "12" : i > 12 ? String(i - 12) : String(i)}${i < 12 ? " AM" : " PM"} (${i}:00)`,
}));

const HERO_KEYS = [
  { key: "hero_headline_en", label: "Headline (English)", type: "text", default: "" },
  { key: "hero_headline_es", label: "Headline (Spanish)", type: "text", default: "" },
  { key: "hero_subheadline_en", label: "Subheadline (English)", type: "text", default: "" },
  { key: "hero_subheadline_es", label: "Subheadline (Spanish)", type: "text", default: "" },
  { key: "hero_cta_text_en", label: "CTA Button (English)", type: "text", default: "" },
  { key: "hero_cta_text_es", label: "CTA Button (Spanish)", type: "text", default: "" },
  { key: "social_proof_picks_count", label: "Social Proof: Picks Count", type: "text", default: "" },
  { key: "social_proof_win_rate", label: "Social Proof: Win Rate", type: "text", default: "" },
];

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function ContentEditor({ initialContent }: Props) {
  const t = useTranslations("admin.contentEditor");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const [items, setItems] = useState<ContentItem[]>(initialContent);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [showCommentarySettings, setShowCommentarySettings] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showHero, setShowHero] = useState(false);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);

  useEffect(() => {
    fetch("/api/admin/content/automation-status")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setAutomationStatus(data); })
      .catch(() => {});
  }, []);

  const contentMap = new Map(items.map((i) => [i.key, i]));

  // Separate structured keys from "other" generic keys
  const announcementKeySet = new Set(ANNOUNCEMENT_KEYS.map((k) => k.key));
  const heroKeySet = new Set(HERO_KEYS.map((k) => k.key));
  const featureKeySet = new Set(FEATURE_KEYS.map((k) => k.key));
  const commentarySettingsKeySet = new Set(COMMENTARY_SETTINGS_KEYS.map((k) => k.key));
  const genericItems = items.filter((i) => !announcementKeySet.has(i.key) && !heroKeySet.has(i.key) && !featureKeySet.has(i.key) && !commentarySettingsKeySet.has(i.key));

  async function saveItem(key: string, value: string) {
    setSaving(key);
    try {
      await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      // Update local state
      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) => i.key === key ? { ...i, value, updatedAt: new Date().toISOString() } : i);
        }
        return [...prev, { key, value, updatedAt: new Date().toISOString() }];
      });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
      router.refresh();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(null);
    }
  }

  async function addItem() {
    if (!newKey.trim()) return;
    setSaving("new");
    try {
      await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey, value: newValue }),
      });
      setItems([...items, { key: newKey, value: newValue, updatedAt: new Date().toISOString() }]);
      setNewKey("");
      setNewValue("");
      router.refresh();
    } catch (err) {
      console.error("Failed to add:", err);
    } finally {
      setSaving(null);
    }
  }

  function renderField(cfg: typeof ANNOUNCEMENT_KEYS[0]) {
    const current = contentMap.get(cfg.key);
    const value = current?.value ?? cfg.default;

    if (cfg.type === "toggle") {
      const isOn = value === "true";
      return (
        <div key={cfg.key} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-navy">{cfg.label}</p>
            <p className="text-[10px] text-gray-300">
              {current?.updatedAt ? `${t("updated")} ${new Date(current.updatedAt).toLocaleDateString()}` : ""}
            </p>
          </div>
          <button
            onClick={() => saveItem(cfg.key, isOn ? "false" : "true")}
            disabled={saving === cfg.key}
            className="flex items-center gap-2 cursor-pointer"
          >
            {saving === cfg.key ? (
              <span className="text-xs text-gray-400">{tc("saving")}</span>
            ) : saved === cfg.key ? (
              <Check className="h-4 w-4 text-success" />
            ) : null}
            <div className={`relative w-11 h-6 rounded-full transition-colors ${isOn ? "bg-success" : "bg-gray-300"}`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isOn ? "translate-x-5" : ""}`} />
            </div>
          </button>
        </div>
      );
    }

    if (cfg.type === "select") {
      return (
        <div key={cfg.key} className="py-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-navy">{cfg.label}</label>
            {saved === cfg.key && <Check className="h-3.5 w-3.5 text-success" />}
          </div>
          <div className="relative">
            <select
              defaultValue={value}
              onChange={(e) => saveItem(cfg.key, e.target.value)}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              {cfg.options?.map((opt) => (
                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      );
    }

    if (cfg.type === "date") {
      return (
        <div key={cfg.key} className="py-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-navy">{cfg.label}</label>
            {saved === cfg.key && <Check className="h-3.5 w-3.5 text-success" />}
          </div>
          <input
            type="date"
            defaultValue={value}
            className={inputClass}
            onBlur={(e) => {
              if (e.target.value !== value) saveItem(cfg.key, e.target.value);
            }}
          />
          <p className="text-[10px] text-gray-300 mt-1">{t("leaveEmptyNoExpiration")}</p>
        </div>
      );
    }

    // Default: text input
    return (
      <div key={cfg.key} className="py-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-navy">{cfg.label}</label>
          {saved === cfg.key && <Check className="h-3.5 w-3.5 text-success" />}
        </div>
        <input
          defaultValue={value}
          className={inputClass}
          placeholder={cfg.default || cfg.label}
          onBlur={(e) => {
            if (e.target.value !== value) saveItem(cfg.key, e.target.value);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1: Automation Controls — Always visible at top */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-success" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-navy">{t("automationControls")}</h2>
            <p className="text-xs text-gray-400">{t("automationControlsDesc")}</p>
          </div>
        </div>
        <div className="px-6 py-4 space-y-1">
          {FEATURE_KEYS.map((cfg) => {
            const current = contentMap.get(cfg.key);
            const value = current?.value ?? cfg.default;
            const isOn = value === "true";
            const Icon = cfg.icon;

            return (
              <div key={cfg.key} className={`flex items-center justify-between py-3 ${cfg.disabled ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isOn && !cfg.disabled ? "bg-success/10" : "bg-gray-100"}`}>
                    <Icon className={`h-4 w-4 ${isOn && !cfg.disabled ? "text-success" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">
                      {cfg.label}
                      {cfg.disabled && <span className="ml-2 text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-normal">Coming Soon</span>}
                    </p>
                    <p className="text-xs text-gray-400">{cfg.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {saving === cfg.key ? (
                    <span className="text-xs text-gray-400">{tc("saving")}</span>
                  ) : saved === cfg.key ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : null}
                  <button
                    onClick={() => { if (!cfg.disabled) saveItem(cfg.key, isOn ? "false" : "true"); }}
                    disabled={saving === cfg.key || cfg.disabled}
                    className="cursor-pointer disabled:cursor-not-allowed"
                  >
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${isOn && !cfg.disabled ? "bg-success" : "bg-gray-300"}`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isOn && !cfg.disabled ? "translate-x-5" : ""}`} />
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Last Activity Status */}
        {automationStatus && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-1 mb-2">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t("lastActivity")}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              <span>Blog: <strong className="text-navy">{formatTimeAgo(automationStatus.lastBlog)}</strong></span>
              <span>Victory Post: <strong className="text-navy">{formatTimeAgo(automationStatus.lastVictoryPost)}</strong></span>
              <span>Commentary: <strong className="text-navy">{formatTimeAgo(automationStatus.lastCommentary)}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Commentary Settings — Collapsible, only when commentary enabled */}
      {(contentMap.get("live_commentary_enabled")?.value === "true") && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowCommentarySettings(!showCommentarySettings)}
            className="w-full px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <h2 className="font-heading font-bold text-lg text-navy">{t("commentarySettings")}</h2>
                <p className="text-xs text-gray-400">{t("commentarySettingsDesc")}</p>
              </div>
            </div>
            {showCommentarySettings ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
          {showCommentarySettings && (
            <div className="px-6 py-4 border-t border-gray-200 space-y-4">
              {COMMENTARY_SETTINGS_KEYS.map((cfg) => {
                const current = contentMap.get(cfg.key);
                const value = current?.value ?? cfg.default;

                if (cfg.type === "number") {
                  return (
                    <div key={cfg.key} className="flex items-center justify-between">
                      <label className="text-sm font-medium text-navy">{cfg.label}</label>
                      <div className="flex items-center gap-2">
                        {saved === cfg.key && <Check className="h-3.5 w-3.5 text-success" />}
                        <input
                          type="number"
                          defaultValue={value}
                          min={5}
                          max={120}
                          className="w-20 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-navy text-center focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                          onBlur={(e) => {
                            if (e.target.value !== value) saveItem(cfg.key, e.target.value);
                          }}
                        />
                      </div>
                    </div>
                  );
                }

                // Hour dropdown
                return (
                  <div key={cfg.key} className="flex items-center justify-between">
                    <label className="text-sm font-medium text-navy">{cfg.label}</label>
                    <div className="flex items-center gap-2">
                      {saved === cfg.key && <Check className="h-3.5 w-3.5 text-success" />}
                      <select
                        defaultValue={value}
                        onChange={(e) => saveItem(cfg.key, e.target.value)}
                        className="w-36 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-navy focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer"
                      >
                        {HOUR_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Announcement Bar — Collapsible */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowAnnouncement(!showAnnouncement)}
          className="w-full px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-accent" />
            </div>
            <div className="text-left">
              <h2 className="font-heading font-bold text-lg text-navy">{t("announcementBar")}</h2>
              <p className="text-xs text-gray-400">{t("announcementBarDesc")}</p>
            </div>
          </div>
          {showAnnouncement ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {showAnnouncement && (
          <div className="px-6 py-2 border-t border-gray-200 divide-y divide-gray-100">
            {ANNOUNCEMENT_KEYS.map(renderField)}
          </div>
        )}
      </div>

      {/* SECTION 3: Hero Section — Collapsible */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowHero(!showHero)}
          className="w-full px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Type className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <h2 className="font-heading font-bold text-lg text-navy">{t("homepageHero")}</h2>
              <p className="text-xs text-gray-400">{t("homepageHeroDesc")}</p>
            </div>
          </div>
          {showHero ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {showHero && (
          <div className="px-6 py-2 border-t border-gray-200 divide-y divide-gray-100">
            {HERO_KEYS.map(renderField)}
          </div>
        )}
      </div>

      {/* Generic Content Blocks */}
      <div>
        <h2 className="font-heading font-bold text-lg text-navy mb-4">{t("customContentBlocks")}</h2>
        {genericItems.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 mb-4 transition-all duration-300 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between mb-3">
              <code className="text-sm font-mono font-semibold text-accent/80">{item.key}</code>
              <span className="text-[10px] text-gray-300">
                {item.updatedAt ? `${t("updated")} ${new Date(item.updatedAt).toLocaleDateString()}` : ""}
              </span>
            </div>
            <textarea
              defaultValue={item.value}
              rows={3}
              className={`${inputClass} font-mono min-h-[72px] resize-y mb-3`}
              onBlur={(e) => {
                if (e.target.value !== item.value) {
                  saveItem(item.key, e.target.value);
                }
              }}
            />
            <button
              disabled={saving === item.key}
              onClick={(e) => {
                const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                if (textarea) saveItem(item.key, textarea.value);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {saved === item.key ? (
                <>
                  <Check className="h-3 w-3 text-success" />
                  <span className="text-success">{t("saved")}</span>
                </>
              ) : saving === item.key ? (
                tc("saving")
              ) : (
                <>
                  <Save className="h-3 w-3" />
                  {t("save")}
                </>
              )}
            </button>
          </div>
        ))}

        {/* Add new content block */}
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 transition-all duration-300 hover:border-gray-300 hover:bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("addNewBlock")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder={t("contentKey")}
              className={`${inputClass} font-mono`}
            />
            <textarea
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={t("contentValue")}
              rows={2}
              className={`${inputClass} min-h-[60px] resize-y`}
            />
          </div>
          <button
            onClick={addItem}
            disabled={saving === "new" || !newKey.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            {saving === "new" ? t("adding") : t("addBlock")}
          </button>
        </div>
      </div>
    </div>
  );
}
