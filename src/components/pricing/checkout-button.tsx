"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

type Props = {
  plan: string;
  label: string;
  variant?: "primary" | "outline";
  promoCode?: string;
};

export function CheckoutButton({ plan, label, variant = "primary", promoCode }: Props) {
  const { isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (!isSignedIn) {
      window.location.href = "/sign-up";
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
