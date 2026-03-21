"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Link } from "@/i18n/navigation";
import { NAV_LINKS } from "@/lib/constants";
import { LanguageSwitcher } from "./language-switcher";
import { Button } from "@/components/ui/button";

type MobileNavProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const t = useTranslations("nav");
  const { isSignedIn } = useAuth();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[85vw] shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="flex items-center justify-between border-b p-4">
          <span className="font-heading text-lg font-bold text-navy">Menu</span>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col p-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="rounded-lg px-4 py-3 text-base font-medium text-foreground hover:bg-gray-50 hover:text-primary transition-colors"
            >
              {t(link.labelKey.replace("nav.", ""))}
            </Link>
          ))}
          <Link
            href="/faq"
            onClick={onClose}
            className="rounded-lg px-4 py-3 text-base font-medium text-foreground hover:bg-gray-50 hover:text-primary transition-colors"
          >
            {t("faq")}
          </Link>
          <Link
            href="/about"
            onClick={onClose}
            className="rounded-lg px-4 py-3 text-base font-medium text-foreground hover:bg-gray-50 hover:text-primary transition-colors"
          >
            {t("about")}
          </Link>
          <Link
            href="/contact"
            onClick={onClose}
            className="rounded-lg px-4 py-3 text-base font-medium text-foreground hover:bg-gray-50 hover:text-primary transition-colors"
          >
            {t("contact")}
          </Link>
        </nav>

        <div className="border-t p-4 space-y-3">
          <LanguageSwitcher className="w-full justify-center" />
          {isSignedIn ? (
            <div className="space-y-3">
              <Link href="/dashboard" onClick={onClose} className="block">
                <Button variant="primary" size="md" className="w-full">
                  {t("dashboard")}
                </Button>
              </Link>
              <Link href="/dashboard/settings" onClick={onClose} className="block">
                <Button variant="outline" size="md" className="w-full">
                  {t("settings")}
                </Button>
              </Link>
              <div className="flex items-center justify-center pt-1">
                <UserButton />
              </div>
            </div>
          ) : (
            <>
              <Link href="/sign-in" onClick={onClose} className="block">
                <Button variant="outline" size="md" className="w-full">
                  {t("login")}
                </Button>
              </Link>
              <Link href="/sign-up" onClick={onClose} className="block">
                <Button variant="primary" size="md" className="w-full">
                  {t("getStarted")}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
