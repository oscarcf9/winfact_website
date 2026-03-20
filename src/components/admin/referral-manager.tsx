"use client";

import { useState, useEffect } from "react";
import {
  Gift,
  UserCheck,
  Award,
  Percent,
  Loader2,
  RefreshCw,
  DollarSign,
  Crown,
  Tag,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";

type Milestone = {
  threshold: number;
  reward: string;
  label: string;
};

type ReferralRecord = {
  id: string;
  referrerId: string | null;
  referredEmail: string;
  status: string | null;
  rewardApplied: boolean | null;
  rewardType: string | null;
  rewardAppliedAt: string | null;
  createdAt: string | null;
  convertedAt: string | null;
};

type Referrer = {
  userId: string;
  email: string;
  name: string | null;
  stripeCustomerId: string | null;
  total: number;
  converted: number;
  rewardsApplied: string[];
  referrals: ReferralRecord[];
  nextMilestone: Milestone | null;
  pendingRewards: Milestone[];
  nextTarget: { threshold: number; label: string; progress: number } | null;
};

type Stats = {
  total: number;
  converted: number;
  rewarded: number;
  conversionRate: string;
};

type RewardModalData = {
  referrer: Referrer;
  milestone: Milestone;
};

const REWARD_ICONS: Record<string, typeof DollarSign> = {
  credit_10: DollarSign,
  free_month: Crown,
  vip_discount: Tag,
};

const REWARD_COLORS: Record<string, string> = {
  credit_10: "from-green-500 to-emerald-500",
  free_month: "from-amber-400 to-yellow-500",
  vip_discount: "from-purple-500 to-indigo-500",
};

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ApplyRewardModal({
  data,
  onClose,
  onApplied,
}: {
  data: RewardModalData;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const Icon = REWARD_ICONS[data.milestone.reward] || Gift;
  const gradient = REWARD_COLORS[data.milestone.reward] || "from-primary to-accent";

  async function handleApply() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/referrals/apply-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.referrer.userId,
          rewardType: data.milestone.reward,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to apply reward");
        return;
      }
      setSuccess(json.details || "Reward applied successfully");
      setTimeout(() => {
        onApplied();
        onClose();
      }, 1500);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-[#0B1F3B]/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-up">
        {/* Header */}
        <div className={`px-6 py-5 bg-gradient-to-r ${gradient}`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Apply Reward</h3>
              <p className="text-white/70 text-sm">{data.milestone.label}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Referrer</span>
              <span className="font-medium text-[#0B1F3B]">
                {data.referrer.name || data.referrer.email}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-600">{data.referrer.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Converted Referrals</span>
              <span className="font-mono font-bold text-[#0B1F3B]">{data.referrer.converted}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Milestone</span>
              <span className="font-semibold text-[#0B1F3B]">
                {data.milestone.threshold} referral{data.milestone.threshold !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-700">
                {data.milestone.reward === "credit_10" && (
                  <p>This will add a <strong>$10.00 credit</strong> to the user&apos;s Stripe balance.</p>
                )}
                {data.milestone.reward === "free_month" && (
                  <p>This will extend the user&apos;s subscription by <strong>30 days</strong>, or create a complimentary VIP subscription if they&apos;re on the free tier.</p>
                )}
                {data.milestone.reward === "vip_discount" && (
                  <p>This will create a <strong>permanent 15% discount</strong> coupon and apply it to the user&apos;s Stripe account.</p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <Check className="h-4 w-4" />
              {success}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || !!success}
              className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all cursor-pointer disabled:opacity-50 bg-gradient-to-r ${gradient} hover:shadow-lg`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : success ? (
                <Check className="h-4 w-4 mx-auto" />
              ) : (
                "Apply Reward"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReferralManager() {
  const [data, setData] = useState<{
    stats: Stats;
    referrers: Referrer[];
    milestones: Milestone[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rewardModal, setRewardModal] = useState<RewardModalData | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/referrals");
      if (res.ok) setData(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function toggleRow(userId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#1168D9]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-400">Failed to load referral data</div>
    );
  }

  const { stats, referrers, milestones } = data;

  const statCards = [
    { icon: Gift, value: String(stats.total), label: "Total Referrals", accent: "from-primary to-primary" },
    { icon: UserCheck, value: String(stats.converted), label: "Converted", accent: "from-green-500 to-green-500" },
    { icon: Award, value: String(stats.rewarded), label: "Rewards Applied", accent: "from-accent to-accent" },
    { icon: Percent, value: `${stats.conversionRate}%`, label: "Conversion Rate", accent: "from-amber-500 to-amber-500" },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
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
            <p className="font-mono text-2xl font-bold text-[#0B1F3B]">{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Reward Milestones Legend */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Reward Milestones
        </h3>
        <div className="flex flex-wrap gap-4">
          {milestones.map((m) => {
            const Icon = REWARD_ICONS[m.reward] || Gift;
            return (
              <div key={m.reward} className="flex items-center gap-2 text-sm">
                <div className={`flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br ${REWARD_COLORS[m.reward]} text-white`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-medium text-[#0B1F3B]">{m.threshold} referral{m.threshold !== 1 ? "s" : ""}</span>
                  <span className="text-gray-400 mx-1">&rarr;</span>
                  <span className="text-gray-600">{m.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referrers Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-base text-[#0B1F3B]">Referrers</h3>
          <button
            type="button"
            onClick={fetchData}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {referrers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Gift className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No referrals yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {referrers.map((ref) => {
              const expanded = expandedRows.has(ref.userId);
              return (
                <div key={ref.userId}>
                  {/* Main row */}
                  <div className="px-6 py-4 flex items-center gap-4">
                    {/* Expand toggle */}
                    <button
                      type="button"
                      onClick={() => toggleRow(ref.userId)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 cursor-pointer shrink-0"
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0B1F3B] truncate">
                        {ref.name || ref.email}
                      </p>
                      {ref.name && (
                        <p className="text-xs text-gray-400 truncate">{ref.email}</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <p className="font-mono text-sm font-bold text-[#0B1F3B]">{ref.total}</p>
                        <p className="text-[10px] text-gray-400">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="font-mono text-sm font-bold text-green-600">{ref.converted}</p>
                        <p className="text-[10px] text-gray-400">Converted</p>
                      </div>

                      {/* Progress toward next milestone */}
                      {ref.nextTarget && (
                        <div className="w-24">
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                            <span>{ref.nextTarget.progress}/{ref.nextTarget.threshold}</span>
                            <span>{ref.nextTarget.label}</span>
                          </div>
                          <ProgressBar current={ref.nextTarget.progress} target={ref.nextTarget.threshold} />
                        </div>
                      )}

                      {/* Pending rewards */}
                      {ref.pendingRewards.length > 0 && (
                        <div className="flex items-center gap-1">
                          {ref.pendingRewards.map((pr) => (
                            <button
                              key={pr.reward}
                              type="button"
                              onClick={() => setRewardModal({ referrer: ref, milestone: pr })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer animate-pulse"
                            >
                              <Award className="h-3 w-3" />
                              {pr.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Applied rewards badges */}
                      {ref.rewardsApplied.length > 0 && (
                        <div className="flex items-center gap-1">
                          {ref.rewardsApplied.map((rw, i) => {
                            const Icon = REWARD_ICONS[rw] || Gift;
                            return (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${REWARD_COLORS[rw]}`}
                              >
                                <Icon className="h-2.5 w-2.5" />
                                <Check className="h-2.5 w-2.5" />
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded referral detail rows */}
                  {expanded && (
                    <div className="bg-gray-50/70 px-6 pb-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 text-gray-400 font-medium">Referred Email</th>
                            <th className="text-center py-2 text-gray-400 font-medium">Status</th>
                            <th className="text-center py-2 text-gray-400 font-medium">Reward</th>
                            <th className="text-right py-2 text-gray-400 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {ref.referrals.map((r) => (
                            <tr key={r.id}>
                              <td className="py-2 text-gray-600">{r.referredEmail}</td>
                              <td className="py-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  r.status === "converted"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-2 text-center">
                                {r.rewardApplied ? (
                                  <span className="text-green-600 font-semibold">{r.rewardType || "Applied"}</span>
                                ) : (
                                  <span className="text-gray-300">&mdash;</span>
                                )}
                              </td>
                              <td className="py-2 text-right text-gray-400">
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "&mdash;"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reward Modal */}
      {rewardModal && (
        <ApplyRewardModal
          data={rewardModal}
          onClose={() => setRewardModal(null)}
          onApplied={fetchData}
        />
      )}
    </div>
  );
}
