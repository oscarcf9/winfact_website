"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * After sign-up, if the user had selected a VIP plan on the pricing page,
 * this component automatically triggers the Stripe checkout flow.
 */
export function PendingCheckout() {
  const { isSignedIn } = useAuth();
  const triggered = useRef(false);

  useEffect(() => {
    if (!isSignedIn || triggered.current) return;

    const pendingPlan = localStorage.getItem("wf_pending_plan");
    if (!pendingPlan) return;

    triggered.current = true;
    const pendingPromo = localStorage.getItem("wf_pending_promo");

    // Clear immediately to prevent double-trigger
    localStorage.removeItem("wf_pending_plan");
    localStorage.removeItem("wf_pending_promo");

    // Trigger checkout
    fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: pendingPlan,
        ...(pendingPromo ? { promoCode: pendingPromo } : {}),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          window.location.href = data.url;
        }
      })
      .catch((err) => {
        console.error("Pending checkout failed:", err);
      });
  }, [isSignedIn]);

  return null;
}
