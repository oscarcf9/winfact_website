import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Heading } from "@/components/ui/heading";
import { Card, CardContent } from "@/components/ui/card";
import { ReferralLinkCopy } from "@/components/dashboard/referral-link-copy";
import { db } from "@/db";
import { users, referrals } from "@/db/schema";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  Users,
  UserCheck,
  Gift,
  Share2,
  Sparkles,
  Crown,
  DollarSign,
  Tag,
  Check,
} from "lucide-react";

const MILESTONES = [
  { threshold: 1, reward: "credit_10", label: "$10 Credit", icon: DollarSign, gradient: "from-green-500 to-emerald-500" },
  { threshold: 5, reward: "free_month", label: "1 Free Month VIP", icon: Crown, gradient: "from-amber-400 to-yellow-500" },
  { threshold: 10, reward: "vip_discount", label: "Permanent VIP Discount", icon: Tag, gradient: "from-purple-500 to-indigo-500" },
];

export default async function ReferralsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userReferrals = user
    ? await db
        .select()
        .from(referrals)
        .where(eq(referrals.referrerId, userId))
    : [];

  // Check if user has a VIP subscription
  const [subscription] = user
    ? await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1)
    : [null];

  const isVip =
    subscription &&
    subscription.tier &&
    subscription.tier !== "free" &&
    subscription.status === "active";

  const totalReferred = userReferrals.length;
  const converted = userReferrals.filter((r) => r.status === "converted").length;
  const rewardsEarned = userReferrals.filter((r) => r.rewardApplied).length;
  const appliedRewardTypes = userReferrals
    .filter((r) => r.rewardApplied && r.rewardType)
    .map((r) => r.rewardType!);
  const referralCode = user?.referralCode || "---";
  const referralLink = `https://winfactpicks.com/sign-up?ref=${referralCode}`;

  // Determine next milestone
  const nextMilestone = MILESTONES.find((m) => converted < m.threshold);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Heading as="h1" size="h4" className="text-navy">
              Refer &amp; Earn
            </Heading>
            <p className="text-sm text-gray-500 mt-0.5">
              Invite friends and earn rewards together
            </p>
          </div>
        </div>
        {isVip && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400/10 to-amber-500/10 border border-amber-300/30">
            <Crown className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700">VIP Member</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Referred</p>
                <p className="font-mono text-3xl font-bold text-navy tracking-tight">
                  {totalReferred}
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success to-emerald-400" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Converted</p>
                <p className="font-mono text-3xl font-bold text-navy tracking-tight">
                  {converted}
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-success/10">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-cyan-400" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Rewards Earned</p>
                <p className="font-mono text-3xl font-bold text-navy tracking-tight">
                  {rewardsEarned}
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
                <Gift className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reward Progress */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-heading font-bold text-lg text-navy mb-5">
            Reward Milestones
          </h2>
          <div className="space-y-4">
            {MILESTONES.map((m, i) => {
              const earned = appliedRewardTypes.includes(m.reward);
              const reachedThreshold = converted >= m.threshold;
              const isNext = nextMilestone?.reward === m.reward;
              const progress = Math.min(converted / m.threshold, 1);
              const Icon = m.icon;

              return (
                <div
                  key={m.reward}
                  className={`relative rounded-xl border p-4 transition-all ${
                    earned
                      ? "border-green-200 bg-green-50/50"
                      : isNext
                        ? "border-primary/30 bg-primary/[0.02]"
                        : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`flex items-center justify-center h-10 w-10 rounded-xl shrink-0 ${
                      earned
                        ? "bg-green-500 text-white"
                        : `bg-gradient-to-br ${m.gradient} text-white opacity-${reachedThreshold ? "100" : "40"}`
                    }`}>
                      {earned ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-navy">{m.label}</span>
                          {earned && (
                            <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              EARNED
                            </span>
                          )}
                          {reachedThreshold && !earned && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                              PENDING APPROVAL
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {converted}/{m.threshold} referral{m.threshold !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            earned
                              ? "bg-green-500"
                              : `bg-gradient-to-r ${m.gradient}`
                          }`}
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Referral Link */}
      <Card className={isVip ? "ring-1 ring-amber-300/40" : ""}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-lg text-navy">
              Your Referral Link
            </h2>
            {isVip && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <Sparkles className="h-3 w-3" />
                VIP Bonus Active
              </span>
            )}
          </div>
          <ReferralLinkCopy referralLink={referralLink} />
          <p className="text-xs text-gray-400 mt-3">
            Share this link with friends. When they subscribe, you both earn rewards!
          </p>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-heading font-bold text-lg text-navy mb-6">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Share Your Link",
                desc: "Send your unique referral link to friends who bet on sports.",
                icon: Share2,
                gradient: "from-primary to-secondary",
              },
              {
                step: "2",
                title: "Friend Subscribes",
                desc: "When they sign up for any VIP plan, the referral is tracked automatically.",
                icon: UserCheck,
                gradient: "from-success to-emerald-400",
              },
              {
                step: "3",
                title: "Earn Rewards",
                desc: "Hit milestones to earn credits, free months, and permanent discounts.",
                icon: Gift,
                gradient: "from-accent to-cyan-400",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="animate-fade-up flex flex-col items-center text-center p-4 rounded-xl bg-bg-light/50"
                style={{
                  animationDelay: `${Number(item.step) * 0.1}s`,
                }}
              >
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${item.gradient} text-white font-bold text-lg mb-4 shadow-sm`}
                >
                  {item.step}
                </div>
                <h3 className="font-semibold text-navy text-sm mb-1">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      {userReferrals.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading font-bold text-lg text-navy mb-4">
              Referral History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Reward
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userReferrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-bg-light/50 transition-colors">
                      <td className="py-2.5 px-3 text-navy font-medium">
                        {ref.referredEmail}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500">
                        {ref.createdAt
                          ? new Date(ref.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "---"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            ref.status === "converted"
                              ? "bg-success/10 text-success"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ref.status === "converted"
                                ? "bg-success"
                                : "bg-gray-400"
                            }`}
                          />
                          {ref.status === "converted" ? "Converted" : "Pending"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {ref.rewardApplied ? (
                          <span className="text-xs font-semibold text-accent">
                            {ref.rewardType === "credit_10" ? "$10 Credit" :
                             ref.rewardType === "free_month" ? "Free Month" :
                             ref.rewardType === "vip_discount" ? "VIP Discount" :
                             "Applied"}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">---</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state when no referrals */}
      {userReferrals.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-heading font-semibold text-navy text-lg mb-1">
              No referrals yet
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Share your referral link above to start inviting friends and earning
              rewards together.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
