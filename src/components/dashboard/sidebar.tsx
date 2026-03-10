"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Target, History, Settings, Gift, Home } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Today's Picks", icon: Target, exact: true },
  { href: "/dashboard/history", label: "Pick History", icon: History, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
  { href: "/dashboard/referrals", label: "Referrals", icon: Gift, exact: false },
];

interface DashboardSidebarProps {
  isVip?: boolean;
  tier?: string;
}

function TierBadge({ isVip, tier }: { isVip: boolean; tier?: string }) {
  if (isVip) {
    return (
      <span
        className={cn(
          "ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
          "bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-[length:200%_100%] text-navy",
          "animate-shimmer"
        )}
      >
        {tier || "VIP"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
        "bg-white/10 text-white/50"
      )}
    >
      FREE
    </span>
  );
}

export function DashboardSidebar({ isVip = false, tier }: DashboardSidebarProps) {
  const pathname = usePathname();
  // Strip locale prefix for matching
  const cleanPath = pathname.replace(/^\/(en|es)/, "");

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-navy text-white hidden lg:flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-heading text-xl font-bold">
              Win<span className="text-accent">Fact</span>
            </span>
            <TierBadge isVip={isVip} tier={tier} />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? cleanPath === item.href
              : cleanPath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <UserButton />
            <Link
              href="/"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              <Home className="h-4 w-4 inline mr-1" />
              Back to site
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? cleanPath === item.href
              : cleanPath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-gray-400"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate max-w-[60px]">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
