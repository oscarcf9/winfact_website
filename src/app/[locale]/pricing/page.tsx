import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/ui/page-hero";
import { AnimatedSection } from "@/components/ui/animated-section";
import { JsonLd, productJsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/constants";
import { ComparisonTable } from "@/components/pricing/comparison-table";
import { PricingSection } from "@/components/pricing/pricing-section";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });

  return {
    title: "Pricing & Plans",
    description: `${t("subtitle")}. Choose from Free, VIP Weekly, or VIP Monthly subscription options for data-driven sports betting picks.`,
    alternates: {
      canonical: "/pricing",
      languages: { en: "/en/pricing", es: "/es/pricing" },
    },
    openGraph: {
      title: "Pricing & Plans | WinFact Picks",
      description: `${t("subtitle")}. Choose your plan and start winning with data.`,
    },
    twitter: {
      card: "summary_large_image",
      title: "Pricing & Plans | WinFact Picks",
      description: `${t("subtitle")}. Choose from Free, VIP Weekly, or VIP Monthly subscription options for data-driven sports betting picks.`,
    },
  };
}


export default function PricingPage() {
  const t = useTranslations("pricing");

  return (
    <>
      <JsonLd data={productJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "Pricing", url: `${SITE_URL}/pricing` },
        ])}
      />
      <Header />

      <main>
        {/* Hero */}
        <PageHero containerSize="narrow">
          <Badge className="mb-4 bg-white/10 text-white border border-white/20">
            Plans & Pricing
          </Badge>
          <Heading as="h1" size="h1" className="text-white mb-4">
            {t("title")}
          </Heading>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            {t("subtitle")}
          </p>
          <Link href="#plans">
            <Button variant="primary" size="xl">
              View Plans
            </Button>
          </Link>
        </PageHero>

        {/* Pricing Tiers + Promo Code (client component with shared state) */}
        <PricingSection />

        {/* Feature Comparison Table */}
        <Section bg="light">
          <Container>
            <AnimatedSection direction="up">
              <div className="text-center mb-12">
                <Heading as="h2" className="text-navy mb-4">
                  {t("comparisonTitle")}
                </Heading>
                <p className="text-gray-500 text-lg">
                  See exactly what you get with each plan.
                </p>
              </div>
            </AnimatedSection>

            <ComparisonTable
              tierNames={[
                t("tiers.0.name"),
                t("tiers.1.name"),
                t("tiers.2.name"),
              ]}
            />
          </Container>
        </Section>

        {/* FAQ Link CTA */}
        <Section bg="navy">
          <Container size="narrow">
            <AnimatedSection direction="up">
              <div className="text-center">
                <Heading as="h2" size="h3" className="text-white mb-4">
                  Still Have Questions?
                </Heading>
                <p className="text-white/70 mb-8 text-lg">
                  Check out our FAQ for answers to the most common questions about
                  plans, billing, and more.
                </p>
                <Link href="/faq">
                  <Button variant="primary" size="lg">
                    Visit FAQ
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
