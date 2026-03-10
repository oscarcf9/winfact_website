"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  UserCheck,
  DollarSign,
  CreditCard,
  Plus,
  Copy,
  ChevronDown,
} from "lucide-react";

type Affiliate = {
  id: string;
  name: string;
  email: string;
  trackingCode: string;
  commissionRate: number | null;
  commissionType: string | null;
  tier: string | null;
  totalReferrals: number | null;
  totalConversions: number | null;
  totalEarned: number | null;
  totalPaid: number | null;
  isActive: boolean | null;
  createdAt: string | null;
};

type Payout = {
  id: string;
  affiliateId: string | null;
  amount: number;
  status: string | null;
  paymentMethod: string | null;
  createdAt: string | null;
  paidAt: string | null;
};

type Props = { affiliates: Affiliate[]; payouts: Payout[] };

const inputClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200";
const selectClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 appearance-none cursor-pointer";
const labelClass = "block text-sm font-medium text-gray-500 mb-1.5";

export function AffiliateManager({ affiliates, payouts }: Props) {
  const t = useTranslations("admin.affiliates");
  const tc = useTranslations("admin.common");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");

  const totalEarned = affiliates.reduce((sum, a) => sum + (a.totalEarned || 0), 0);
  const totalPaid = affiliates.reduce((sum, a) => sum + (a.totalPaid || 0), 0);
  const activeCount = affiliates.filter((a) => a.isActive).length;

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          commissionRate: Number(form.get("commissionRate")) || 10,
          commissionType: form.get("commissionType"),
          tier: form.get("tier"),
          paymentMethod: form.get("paymentMethod") || null,
          paymentEmail: form.get("paymentEmail") || null,
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

  function copyCode(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${code}`);
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  }

  const statCards = [
    { icon: Users, value: String(affiliates.length), label: t("totalAffiliates"), accent: "from-primary to-primary" },
    { icon: UserCheck, value: String(activeCount), label: t("active"), accent: "from-success to-success" },
    { icon: DollarSign, value: `$${totalEarned.toFixed(0)}`, label: t("totalEarned"), accent: "from-accent to-accent" },
    { icon: CreditCard, value: `$${totalPaid.toFixed(0)}`, label: t("totalPaid"), accent: "from-warning to-warning" },
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
          {t("newAffiliate")}
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
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("newAffiliate")}</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className={labelClass}>{t("name")}</label><input name="name" required className={inputClass} placeholder="John Smith" /></div>
            <div><label className={labelClass}>{t("email")}</label><input name="email" type="email" required className={inputClass} placeholder="john@example.com" /></div>
            <div><label className={labelClass}>{t("commissionRate")}</label><input name="commissionRate" type="number" step="0.5" defaultValue="10" className={`${inputClass} font-mono`} /></div>
            <div className="relative"><label className={labelClass}>{t("commissionType")}</label><select name="commissionType" className={selectClass}><option value="percentage">{t("percentage")}</option><option value="fixed">{t("fixedType")}</option></select><ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" /></div>
            <div className="relative"><label className={labelClass}>{t("tier")}</label><select name="tier" className={selectClass}><option value="standard">{t("standard")}</option><option value="premium">{t("premium")}</option><option value="partner">{t("partner")}</option></select><ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" /></div>
            <div className="relative"><label className={labelClass}>{t("paymentMethod")}</label><select name="paymentMethod" className={selectClass}><option value="">{tc("select")}</option><option value="paypal">{t("paypal")}</option><option value="stripe">{t("stripe")}</option><option value="venmo">{t("venmo")}</option></select><ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" /></div>
            <div><label className={labelClass}>{t("paymentEmail")}</label><input name="paymentEmail" type="email" className={inputClass} placeholder="pay@example.com" /></div>
            <div className="sm:col-span-2 flex items-end gap-3">
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer">{loading ? tc("creating") : t("createAffiliate")}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-100 transition-all duration-200 cursor-pointer">{tc("cancel")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Affiliates Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="font-heading font-bold text-lg text-navy">{t("affiliatesTitle")}</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("nameCol")}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("trackingCode")}</th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("commission")}</th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("referralsCol")}</th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("conversions")}</th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("earned")}</th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("status")}</th>
            </tr></thead>
            <tbody>
              {affiliates.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6"><p className="text-gray-800 font-medium">{a.name}</p><p className="text-gray-400 text-xs">{a.email}</p></td>
                  <td className="py-3 px-6"><div className="flex items-center gap-2"><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{a.trackingCode}</span><button onClick={() => copyCode(a.trackingCode)} className="text-gray-300 hover:text-primary transition-colors cursor-pointer"><Copy className="h-3.5 w-3.5" /></button>{copied === a.trackingCode && <span className="text-xs text-success">{tc("copied")}</span>}</div></td>
                  <td className="py-3 px-6 text-center font-mono text-gray-600">{a.commissionRate}%</td>
                  <td className="py-3 px-6 text-center font-mono text-gray-500">{a.totalReferrals || 0}</td>
                  <td className="py-3 px-6 text-center font-mono text-gray-500">{a.totalConversions || 0}</td>
                  <td className="py-3 px-6 text-center font-mono font-semibold text-success">${(a.totalEarned || 0).toFixed(0)}</td>
                  <td className="py-3 px-6 text-center"><span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${a.isActive ? "bg-success/15 text-success border border-success/20" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>{a.isActive ? tc("active") : tc("inactive")}</span></td>
                </tr>
              ))}
              {affiliates.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center"><Users className="h-10 w-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">{t("empty")}</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payouts Table */}
      {payouts.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200"><h2 className="font-heading font-bold text-lg text-navy">{t("recentPayouts")}</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("affiliate")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("amount")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("status")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("method")}</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{tc("date")}</th>
              </tr></thead>
              <tbody>
                {payouts.map((p) => {
                  const affiliate = affiliates.find((a) => a.id === p.affiliateId);
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-6 text-gray-700">{affiliate?.name || "\u2014"}</td>
                      <td className="py-3 px-6 text-center font-mono font-semibold text-navy">${p.amount.toFixed(2)}</td>
                      <td className="py-3 px-6 text-center"><span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === "paid" ? "bg-success/15 text-success border border-success/20" : p.status === "approved" ? "bg-primary/15 text-primary border border-primary/20" : p.status === "rejected" ? "bg-danger/15 text-danger border border-danger/20" : "bg-warning/15 text-warning border border-warning/20"}`}>{p.status}</span></td>
                      <td className="py-3 px-6 text-center text-xs text-gray-400">{p.paymentMethod || "\u2014"}</td>
                      <td className="py-3 px-6 text-center text-xs text-gray-400">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "\u2014"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
