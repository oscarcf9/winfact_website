"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tag, Plus, Trash2, CheckCircle, XCircle, ChevronDown } from "lucide-react";

type PromoCode = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxRedemptions: number | null;
  currentRedemptions: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean | null;
  createdAt: string | null;
};

type Props = { codes: PromoCode[] };

const inputClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200";
const selectClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 appearance-none cursor-pointer";
const labelClass = "block text-sm font-medium text-gray-500 mb-1.5";

export function PromoManager({ codes }: Props) {
  const t = useTranslations("admin.promos");
  const tc = useTranslations("admin.common");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.get("code"),
          discountType: form.get("discountType"),
          discountValue: Number(form.get("discountValue")),
          maxRedemptions: form.get("maxRedemptions") ? Number(form.get("maxRedemptions")) : null,
          validUntil: form.get("validUntil") || null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        window.location.reload();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/admin/promos/${id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/admin/promos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    window.location.reload();
  }

  const activeCount = codes.filter((c) => c.isActive).length;
  const totalRedemptions = codes.reduce((sum, c) => sum + (c.currentRedemptions || 0), 0);

  const statCards = [
    { icon: Tag, value: String(codes.length), label: t("totalCodes"), accent: "from-primary to-primary" },
    { icon: CheckCircle, value: String(activeCount), label: t("active"), accent: "from-success to-success" },
    { icon: XCircle, value: String(codes.length - activeCount), label: t("inactive"), accent: "from-gray-400 to-gray-400" },
    { icon: Tag, value: String(totalRedemptions), label: t("totalRedemptions"), accent: "from-accent to-accent" },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">{t("subtitle")}</span>
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {t("newCode")}
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
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("newPromoCode")}</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>{t("code")}</label>
              <input name="code" required className={inputClass} placeholder="SUMMER25" />
            </div>
            <div className="relative">
              <label className={labelClass}>{t("discountType")}</label>
              <select name="discountType" className={selectClass}>
                <option value="percent">{t("percentage")}</option>
                <option value="fixed">{t("fixed")}</option>
                <option value="trial_days">{t("freeTrialDays")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <div>
              <label className={labelClass}>{t("value")}</label>
              <input name="discountValue" type="number" step="0.01" required className={`${inputClass} font-mono`} placeholder="25" />
            </div>
            <div>
              <label className={labelClass}>{t("maxRedemptions")}</label>
              <input name="maxRedemptions" type="number" className={`${inputClass} font-mono`} placeholder="Unlimited" />
            </div>
            <div>
              <label className={labelClass}>{t("validUntil")}</label>
              <input name="validUntil" type="date" className={inputClass} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex items-end gap-3">
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer">
                {loading ? tc("creating") : t("createCode")}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-100 transition-all duration-200 cursor-pointer">
                {tc("cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("codeCol")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("discount")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("redemptions")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("validUntil")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("status")}</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => (
                <tr key={code.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6 font-mono font-semibold text-navy">{code.code}</td>
                  <td className="py-3 px-6 text-center font-mono text-gray-600">
                    {code.discountType === "percent" ? `${code.discountValue}%` :
                     code.discountType === "fixed" ? `$${code.discountValue}` :
                     `${code.discountValue} days`}
                  </td>
                  <td className="py-3 px-6 text-center font-mono text-gray-500">
                    {code.currentRedemptions || 0}{code.maxRedemptions ? ` / ${code.maxRedemptions}` : ""}
                  </td>
                  <td className="py-3 px-6 text-center text-xs text-gray-400">
                    {code.validUntil ? new Date(code.validUntil).toLocaleDateString() : tc("noExpiry")}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      code.isActive
                        ? "bg-success/15 text-success border border-success/20"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                      {code.isActive ? tc("active") : tc("inactive")}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggle(code.id, !!code.isActive)}
                        className="text-xs text-accent/70 hover:text-accent transition-colors cursor-pointer"
                      >
                        {code.isActive ? t("disable") : t("enable")}
                      </button>
                      <button
                        onClick={() => handleDelete(code.id)}
                        className="text-xs text-danger/50 hover:text-danger transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Tag className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{t("empty")}</p>
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
