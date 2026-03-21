"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";

type Props = {
  plan: string;
  label: string;
  variant?: "primary" | "outline";
  promoCode?: string;
};

export function CheckoutButton({ plan, label, variant = "primary", promoCode }: Props) {
  const { isSignedIn } = useAuth();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (!isSignedIn) {
      // Save selected plan so we can redirect to checkout after sign-up
      localStorage.setItem("wf_pending_plan", plan);
      if (promoCode) localStorage.setItem("wf_pending_promo", promoCode);
      window.location.href = `/${locale}/sign-up`;
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, promoCode }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size="lg"
      className="w-full"
      onClick={handleCheckout}
      disabled={loading}
    >
      {loading ? "Loading..." : label}
    </Button>
  );
}
