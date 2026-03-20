import { NextResponse } from "next/server";
import { getSiteContent } from "@/db/queries/site-content";

export async function GET() {
  try {
    const [enabled, textEn, textEs, ctaEn, ctaEs, link, expiresAt, style, promoCode] = await Promise.all([
      getSiteContent("announcement_bar_enabled"),
      getSiteContent("announcement_bar_text_en"),
      getSiteContent("announcement_bar_text_es"),
      getSiteContent("announcement_bar_cta_en"),
      getSiteContent("announcement_bar_cta_es"),
      getSiteContent("announcement_bar_link"),
      getSiteContent("announcement_bar_expires_at"),
      getSiteContent("announcement_bar_style"),
      getSiteContent("announcement_bar_promo_code"),
    ]);

    // Check if explicitly disabled
    if (enabled === "false") {
      return NextResponse.json({ visible: false });
    }

    // Check expiration
    if (expiresAt && expiresAt.trim() !== "") {
      const expDate = new Date(expiresAt);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        return NextResponse.json({ visible: false });
      }
    }

    // If no DB content exists, return null so client falls back to i18n
    const hasContent = !!textEn;

    return NextResponse.json({
      visible: true,
      hasContent,
      textEn: textEn || null,
      textEs: textEs || null,
      ctaEn: ctaEn || null,
      ctaEs: ctaEs || null,
      link: link || "/pricing",
      style: style || "default",
      promoCode: promoCode || null,
    });
  } catch {
    return NextResponse.json({ visible: true, hasContent: false });
  }
}
