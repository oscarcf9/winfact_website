import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/home/hero";
import { SportsMarquee } from "@/components/home/sports-marquee";
import { HowItWorks } from "@/components/home/how-it-works";
import { FeaturesGrid } from "@/components/home/features-grid";
import { Testimonials } from "@/components/home/testimonials";
import { PricingPreview } from "@/components/home/pricing-preview";
import { FaqSection } from "@/components/home/faq-section";
import { CtaSection } from "@/components/home/cta-section";
import { JsonLd, organizationJsonLd } from "@/components/seo/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  return {
    title: "WinFact Picks — Smart Betting Starts With Data",
    description: t("subheadline"),
    alternates: {
      canonical: "/",
      languages: { en: "/en", es: "/es" },
    },
  };
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <Header />
      <main>
        <Hero />
        <SportsMarquee />
        <HowItWorks />
        <FeaturesGrid />
        <Testimonials />
        <PricingPreview />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
