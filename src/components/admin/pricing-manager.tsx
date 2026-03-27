"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  GripVertical,
  Star,
  Eye,
  EyeOff,
  Loader2,
  Crown,
  Zap,
} from "lucide-react";

type Plan = {
  id: string;
  key: string;
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  price: number;
  currency: string;
  interval: string;
  ctaEn: string;
  ctaEs: string;
  featuresEn: string | string[];
  featuresEs: string | string[];
  stripePriceId: string | null;
  trialDays: number;
  isPopular: boolean;
  badgeEn: string | null;
  badgeEs: string | null;
  isActive: boolean;
  isFree: boolean;
  displayOrder: number;
};

type EditingPlan = Omit<Plan, "featuresEn" | "featuresEs"> & {
  featuresEn: string[];
  featuresEs: string[];
};

const emptyPlan: EditingPlan = {
  id: "",
  key: "",
  nameEn: "",
  nameEs: "",
  descriptionEn: "",
  descriptionEs: "",
  price: 0,
  currency: "USD",
  interval: "month",
  ctaEn: "Get Started",
  ctaEs: "Comenzar",
  featuresEn: [""],
  featuresEs: [""],
  stripePriceId: "",
  trialDays: 0,
  isPopular: false,
  badgeEn: "",
  badgeEs: "",
  isActive: true,
  isFree: false,
  displayOrder: 0,
};

function parseFeatures(f: string | string[]): string[] {
  if (Array.isArray(f)) return f;
  try {
    return JSON.parse(f);
  } catch {
    return [];
  }
}

export function PricingManager() {
  const t = useTranslations("admin.pricingManager");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingPlan | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pricing");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const seedDefaults = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/pricing/seed", { method: "POST" });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (plan: Plan) => {
    setEditing({
      ...plan,
      stripePriceId: plan.stripePriceId || "",
      badgeEn: plan.badgeEn || "",
      badgeEs: plan.badgeEs || "",
      featuresEn: parseFeatures(plan.featuresEn),
      featuresEs: parseFeatures(plan.featuresEs),
    });
    setIsNew(false);
  };

  const startNew = () => {
    setEditing({
      ...emptyPlan,
      displayOrder: plans.length,
    });
    setIsNew(true);
  };

  const cancel = () => {
    setEditing(null);
    setIsNew(false);
  };

  const savePlan = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        ...editing,
        stripePriceId: editing.stripePriceId || null,
        badgeEn: editing.badgeEn || null,
        badgeEs: editing.badgeEs || null,
        featuresEn: editing.featuresEn.filter((f) => f.trim()),
        featuresEs: editing.featuresEs.filter((f) => f.trim()),
      };

      if (isNew) {
        await fetch("/api/admin/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/admin/pricing/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      await load();
      setEditing(null);
      setIsNew(false);
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/pricing/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (plan: Plan) => {
    await fetch(`/api/admin/pricing/${plan.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    await load();
  };

  const togglePopular = async (plan: Plan) => {
    await fetch(`/api/admin/pricing/${plan.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPopular: !plan.isPopular }),
    });
    await load();
  };

  const updateFeature = (lang: "En" | "Es", index: number, value: string) => {
    if (!editing) return;
    const key = `features${lang}` as "featuresEn" | "featuresEs";
    const updated = [...editing[key]];
    updated[index] = value;
    setEditing({ ...editing, [key]: updated });
  };

  const addFeature = (lang: "En" | "Es") => {
    if (!editing) return;
    const key = `features${lang}` as "featuresEn" | "featuresEs";
    setEditing({ ...editing, [key]: [...editing[key], ""] });
  };

  const removeFeature = (lang: "En" | "Es", index: number) => {
    if (!editing) return;
    const key = `features${lang}` as "featuresEn" | "featuresEs";
    setEditing({ ...editing, [key]: editing[key].filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state — offer to seed defaults
  if (plans.length === 0 && !editing) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <Crown className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="font-heading font-bold text-lg text-navy mb-2">{t("noPlansYet")}</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          {t("seedDescription")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={seedDefaults}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {t("seedDefaults")}
          </button>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("createCustom")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Cards */}
      {!editing && (
        <>
          <div className="flex items-center justify-end">
            <button
              onClick={startNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t("addPlan")}
            </button>
          </div>

          <div className="grid gap-4">
            {plans.map((plan) => {
              const features = parseFeatures(plan.featuresEn);
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl border shadow-sm p-5 ${
                    plan.isActive ? "border-gray-100" : "border-gray-200 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-gray-300 mt-1">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-bold text-navy">
                          {plan.nameEn}
                        </h3>
                        {plan.isPopular && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            <Star className="h-3 w-3" />
                            {t("popular")}
                          </span>
                        )}
                        {!plan.isActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                            <EyeOff className="h-3 w-3" />
                            {t("hidden")}
                          </span>
                        )}
                        {plan.isFree && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">
                            {t("free")}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-500 mb-2">{plan.descriptionEn}</p>

                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-2xl font-bold text-navy">
                          ${plan.price}
                        </span>
                        <span className="text-sm text-gray-400">
                          /{plan.interval === "forever" ? "" : plan.interval}
                        </span>
                        {plan.trialDays > 0 && (
                          <span className="ml-2 text-xs text-accent font-medium">
                            {t("dayTrial", { days: plan.trialDays })}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {features.slice(0, 4).map((f, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-gray-50 text-xs text-gray-600">
                            {f}
                          </span>
                        ))}
                        {features.length > 4 && (
                          <span className="px-2 py-0.5 rounded bg-gray-50 text-xs text-gray-400">
                            {t("moreFeatures", { count: features.length - 4 })}
                          </span>
                        )}
                      </div>

                      {plan.stripePriceId && (
                        <p className="text-xs text-gray-400 mt-2 font-mono">
                          Stripe: {plan.stripePriceId}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleActive(plan)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title={plan.isActive ? t("hidePlan") : t("showPlan")}
                      >
                        {plan.isActive ? (
                          <Eye className="h-4 w-4 text-gray-400" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => togglePopular(plan)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title={plan.isPopular ? t("removePopular") : t("markPopular")}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            plan.isPopular ? "text-primary fill-primary" : "text-gray-400"
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => startEdit(plan)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        disabled={deleting === plan.id}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {deleting === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Edit / Create Form */}
      {editing && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-heading font-bold text-navy">
              {isNew ? t("newPlan") : `${t("edit")}: ${editing.nameEn}`}
            </h2>
            <button onClick={cancel} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Row: Key + Interval */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("planKey")} <span className="text-xs text-gray-400">{t("planKeyHint")}</span>
                </label>
                <input
                  type="text"
                  value={editing.key}
                  onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="vip_monthly"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("billingInterval")}</label>
                <select
                  value={editing.interval}
                  onChange={(e) => setEditing({ ...editing, interval: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="forever">{t("freeForever")}</option>
                  <option value="week">{t("weekly")}</option>
                  <option value="month">{t("monthly")}</option>
                  <option value="year">{t("yearly")}</option>
                </select>
              </div>
            </div>

            {/* Row: Name EN + ES */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("nameEn")}</label>
                <input
                  type="text"
                  value={editing.nameEn}
                  onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="VIP Monthly"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("nameEs")}</label>
                <input
                  type="text"
                  value={editing.nameEs}
                  onChange={(e) => setEditing({ ...editing, nameEs: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="VIP Mensual"
                />
              </div>
            </div>

            {/* Row: Description EN + ES */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("descriptionEn")}</label>
                <input
                  type="text"
                  value={editing.descriptionEn}
                  onChange={(e) => setEditing({ ...editing, descriptionEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("descriptionEs")}</label>
                <input
                  type="text"
                  value={editing.descriptionEs}
                  onChange={(e) => setEditing({ ...editing, descriptionEs: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>

            {/* Row: Price + Trial + Stripe */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("price")}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("trialDays")}</label>
                <input
                  type="number"
                  min="0"
                  value={editing.trialDays}
                  onChange={(e) => setEditing({ ...editing, trialDays: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("stripePriceId")}
                </label>
                <input
                  type="text"
                  value={editing.stripePriceId || ""}
                  onChange={(e) => setEditing({ ...editing, stripePriceId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="price_xxx"
                />
              </div>
            </div>

            {/* Row: CTA EN + ES */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("ctaEn")}</label>
                <input
                  type="text"
                  value={editing.ctaEn}
                  onChange={(e) => setEditing({ ...editing, ctaEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Start Free Trial"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("ctaEs")}</label>
                <input
                  type="text"
                  value={editing.ctaEs}
                  onChange={(e) => setEditing({ ...editing, ctaEs: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Comenzar Prueba Gratis"
                />
              </div>
            </div>

            {/* Badge */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("badgeEn")} <span className="text-xs text-gray-400">{t("optional")}</span>
                </label>
                <input
                  type="text"
                  value={editing.badgeEn || ""}
                  onChange={(e) => setEditing({ ...editing, badgeEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Most Popular"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("badgeEs")} <span className="text-xs text-gray-400">{t("optional")}</span>
                </label>
                <input
                  type="text"
                  value={editing.badgeEs || ""}
                  onChange={(e) => setEditing({ ...editing, badgeEs: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Más Popular"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.isFree}
                  onChange={(e) => setEditing({ ...editing, isFree: e.target.checked, price: e.target.checked ? 0 : editing.price })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                {t("freeTier")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.isPopular}
                  onChange={(e) => setEditing({ ...editing, isPopular: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                {t("markAsPopular")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                {t("activeVisible")}
              </label>
              <div className="flex items-center gap-2 text-sm">
                <label className="text-gray-700">{t("order")}:</label>
                <input
                  type="number"
                  min="0"
                  value={editing.displayOrder}
                  onChange={(e) => setEditing({ ...editing, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 rounded border border-gray-200 text-sm text-center focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* Features EN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("featuresEn")}</label>
              <div className="space-y-2">
                {editing.featuresEn.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={f}
                      onChange={(e) => updateFeature("En", i, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder={`Feature ${i + 1}`}
                    />
                    <button
                      onClick={() => removeFeature("En", i)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addFeature("En")}
                  className="text-sm text-primary hover:text-secondary font-medium"
                >
                  {t("addFeature")}
                </button>
              </div>
            </div>

            {/* Features ES */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("featuresEs")}</label>
              <div className="space-y-2">
                {editing.featuresEs.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={f}
                      onChange={(e) => updateFeature("Es", i, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder={`Característica ${i + 1}`}
                    />
                    <button
                      onClick={() => removeFeature("Es", i)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addFeature("Es")}
                  className="text-sm text-primary hover:text-secondary font-medium"
                >
                  {t("addFeature")}
                </button>
              </div>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              onClick={cancel}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {t("cancel")}
            </button>
            <button
              onClick={savePlan}
              disabled={saving || !editing.key || !editing.nameEn}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isNew ? t("createPlan") : t("saveChanges")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
