"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { UserButton } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Target,
  FileText,
  Image,
  Settings,
  Users,
  BarChart3,
  Gift,
  Home,
  Menu,
  X,
  Send,
  Activity,
  DollarSign,
  Tag,
  UserCheck,
  Calendar,
  Brain,
  Shield,
  Plug,
  Users2,
  ChevronDown,
  Globe,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { AdminThemeToggle } from "./dark-mode-provider";


const NAV_SECTIONS = [
  {
    key: "content",
    items: [
      { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/picks", labelKey: "picks", icon: Target, exact: false },
      { href: "/admin/blog", labelKey: "blog", icon: FileText, exact: false },
      { href: "/admin/media", labelKey: "media", icon: Image, exact: false },
      { href: "/admin/content", labelKey: "siteContent", icon: Settings, exact: false },
      { href: "/admin/calendar", labelKey: "calendar", icon: Calendar, exact: false },
      { href: "/admin/imports", labelKey: "importData", icon: Upload, exact: false },
    ],
  },
  {
    key: "operations",
    items: [
      { href: "/admin/distribution", labelKey: "distribution", icon: Send, exact: false },
      { href: "/admin/intelligence", labelKey: "intelligence", icon: Activity, exact: false },
      { href: "/admin/ai", labelKey: "aiAssistant", icon: Brain, exact: false },
    ],
  },
  {
    key: "analytics",
    items: [
      { href: "/admin/subscribers", labelKey: "subscribers", icon: Users, exact: false },
      { href: "/admin/performance", labelKey: "performance", icon: BarChart3, exact: false },
      { href: "/admin/revenue", labelKey: "revenue", icon: DollarSign, exact: false },
      { href: "/admin/referrals", labelKey: "referrals", icon: Gift, exact: false },
    ],
  },
  {
    key: "business",
    items: [
      { href: "/admin/pricing", labelKey: "pricing", icon: DollarSign, exact: false },
      { href: "/admin/promos", labelKey: "promotions", icon: Tag, exact: false },
      { href: "/admin/affiliates", labelKey: "affiliates", icon: UserCheck, exact: false },
      { href: "/admin/audit", labelKey: "auditTrail", icon: Shield, exact: false },
    ],
  },
  {
    key: "system",
    items: [
      { href: "/admin/team", labelKey: "team", icon: Users2, exact: false },
      { href: "/admin/integrations", labelKey: "integrations", icon: Plug, exact: false },
    ],
  },
];

function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = useCallback(
    (newLocale: "en" | "es") => {
      router.replace(pathname, { locale: newLocale });
    },
    [router, pathname]
  );

  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
      <button
        onClick={() => switchLocale("en")}
        className={cn(
          "px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer",
          locale === "en"
            ? "bg-white text-primary shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        )}
      >
        EN
      </button>
      <button
        onClick={() => switchLocale("es")}
        className={cn(
          "px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer",
          locale === "es"
            ? "bg-white text-primary shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        )}
      >
        ES
      </button>
    </div>
  );
}

function AccordionSection({
  sectionKey,
  items,
  cleanPath,
  defaultOpen,
  onNavigate,
}: {
  sectionKey: string;
  items: typeof NAV_SECTIONS[number]["items"];
  cleanPath: string;
  defaultOpen: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const t = useTranslations("admin.sidebar");

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 mb-1 group cursor-pointer"
      >
        <span className="text-[10px] font-semibold tracking-[0.15em] text-gray-400 uppercase group-hover:text-gray-500 transition-colors">
          {t(`sections.${sectionKey}`)}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-gray-300 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pb-2">
            {items.map((item) => {
              const isActive = item.exact
                ? cleanPath === item.href
                : cleanPath.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-l-2 border-transparent"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                      isActive ? "text-primary" : "text-gray-400"
                    )}
                  />
                  {t(`items.${item.labelKey}`)}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const cleanPath = pathname.replace(/^\/(en|es)/, "");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Determine which section has an active item to default-open it
  const activeSectionKeys = NAV_SECTIONS.filter((section) =>
    section.items.some((item) =>
      item.exact ? cleanPath === item.href : cleanPath.startsWith(item.href)
    )
  ).map((s) => s.key);

  const navContent = (onNavigate?: () => void) => (
    <div className="space-y-3">
      {NAV_SECTIONS.map((section) => (
        <AccordionSection
          key={section.key}
          sectionKey={section.key}
          items={section.items}
          cleanPath={cleanPath}
          defaultOpen={activeSectionKeys.includes(section.key) || section.key === "content"}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 w-64 border-r border-gray-200 hidden lg:flex flex-col admin-sidebar">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-heading font-bold text-lg">
              <span className="text-primary">Win</span>
              <span className="text-navy">Fact</span>
              <span className="text-gray-400 text-xs font-normal ml-1.5">Admin</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navContent()}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <AdminThemeToggle />
            <LocaleToggle />
          </div>
          <div className="flex items-center justify-between">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <Home className="h-3.5 w-3.5" />
              View Site
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 border-b border-gray-200 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#ffffff" }}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-xs">W</span>
          </div>
          <span className="font-heading font-bold text-base">
            <span className="text-primary">Win</span>
            <span className="text-navy">Fact</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LocaleToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5 text-gray-500" /> : <Menu className="h-5 w-5 text-gray-500" />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-0 left-0 z-40 w-72 h-full border-r border-gray-200 lg:hidden flex flex-col shadow-xl" style={{ backgroundColor: "#ffffff" }}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-white font-bold text-xs">W</span>
                </div>
                <span className="font-heading font-bold text-base text-navy">Admin</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <nav className="flex-1 py-4 overflow-y-auto">
              {navContent(() => setMobileOpen(false))}
            </nav>
            <div className="p-4 border-t border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <AdminThemeToggle />
                <LocaleToggle />
              </div>
              <div className="flex items-center justify-between">
                <UserButton />
                <Link
                  href="/"
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Home className="h-3.5 w-3.5" />
                  View Site
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
