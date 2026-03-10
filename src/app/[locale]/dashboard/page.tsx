import { auth } from "@clerk/nextjs/server";
import { getTodayPicks } from "@/db/queries/picks";
import { getActiveSubscription } from "@/db/queries/subscriptions";
import { PickCard } from "@/components/dashboard/pick-card";
import { Target, Crown, CalendarClock } from "lucide-react";
import { getLocale } from "next-intl/server";

export default async function DashboardPage() {
  const { userId } = await auth();
  const locale = await getLocale();
  const [picks, subscription] = await Promise.all([
    getTodayPicks(),
    userId ? getActiveSubscription(userId) : null,
  ]);

  const isVip = subscription?.tier === "vip_weekly" || subscription?.tier === "vip_monthly";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        {isVip && (
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-[#0B1F3B] via-[#1168D9] to-[#0BC4D9] p-[1px]">
            <div className="flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-2.5 backdrop-blur-sm">
              <Crown className="h-4 w-4 text-[#F59E0B]" />
              <span className="text-sm font-semibold text-[#0B1F3B]">VIP Member</span>
              <span className="ml-1 text-xs text-gray-500">All picks unlocked</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1168D9]/10">
              <Target className="h-5 w-5 text-[#1168D9]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0B1F3B]">
                Today&apos;s Picks
              </h1>
              <p className="text-sm text-gray-500">
                {picks.length === 0
                  ? "No picks posted yet"
                  : `${picks.length} pick${picks.length !== 1 ? "s" : ""} available`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {picks.length === 0 ? (
        <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                <CalendarClock className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-[#0B1F3B]">
                No picks available yet today
              </h3>
              <p className="max-w-sm text-sm text-gray-400">
                Check back later for today&apos;s picks.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {picks.map((pick, i) => (
            <div
              key={pick.id}
              className="animate-fade-up"
              style={{ animationDelay: `${(i + 1) * 75}ms` }}
            >
              <PickCard pick={pick} locale={locale} isVipMember={isVip} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
