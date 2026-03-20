"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * Captures ?ref= from any URL and stores in localStorage.
 * First-touch attribution: only stores if no existing code is saved.
 * Render this in the root layout so it runs on every page.
 */
export function ReferralUrlCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && ref.trim()) {
      // First-touch: don't overwrite existing referral code
      if (!localStorage.getItem("wf_referral_code")) {
        localStorage.setItem("wf_referral_code", ref.trim());
      }
    }
  }, [searchParams]);

  return null;
}

/**
 * Post-signup fallback: processes referral from localStorage or cookie
 * after the user is authenticated. Runs once per session.
 * Render this in the dashboard layout.
 */
export function ReferralPostSignup() {
  const { isSignedIn } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (!isSignedIn || attempted.current) return;
    attempted.current = true;

    // Check localStorage first, then cookie
    const refCode =
      localStorage.getItem("wf_referral_code") ||
      document.cookie
        .split("; ")
        .find((c) => c.startsWith("wf_ref="))
        ?.split("=")[1];

    if (!refCode) return;

    fetch("/api/user/set-referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode: refCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok || data.alreadyReferred) {
          // Referral processed — clean up
          localStorage.removeItem("wf_referral_code");
          // Clear cookie by setting expired
          document.cookie = "wf_ref=; path=/; max-age=0";
        }
      })
      .catch(() => {
        // Best-effort — will retry on next dashboard visit
      });
  }, [isSignedIn]);

  return null;
}
