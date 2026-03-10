import type { Metadata } from "next";
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
import { JsonLd, faqPageJsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/constants";
import { FaqContent } from "./faq-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });

  return {
    title: "FAQ",
    description: `${t("subtitle")}. Find answers about our picks, billing, plans, and technical details.`,
    alternates: {
      canonical: "/faq",
      languages: { en: "/en/faq", es: "/es/faq" },
    },
    openGraph: {
      title: "Frequently Asked Questions | WinFact Picks",
      description: t("subtitle"),
    },
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });

  // Build FAQ items for JSON-LD structured data
  const faqItems: { question: string; answer: string; category: string }[] = [];
  for (let i = 0; i < 10; i++) {
    faqItems.push({
      question: t(`items.${i}.question`),
      answer: t(`items.${i}.answer`),
      category: t(`items.${i}.category`),
    });
  }

  const jsonLdItems = faqItems.map(({ question, answer }) => ({
    question,
    answer,
  }));

  // Gather categories for the filter
  const categories = {
    general: t("categories.general"),
    picks: t("categories.picks"),
    billing: t("categories.billing"),
    technical: t("categories.technical"),
  };

  return (
    <>
      <JsonLd data={faqPageJsonLd(jsonLdItems)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "FAQ", url: `${SITE_URL}/faq` },
        ])}
      />
      <Header />

      <main>
        {/* Hero */}
        <PageHero>
          <Badge className="mb-4 bg-white/10 text-white border border-white/20">
            FAQ
          </Badge>
          <Heading as="h1" size="h1" className="text-white mb-4">
            {t("title")}
          </Heading>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </PageHero>

        {/* FAQ Content with Category Filter */}
        <Section bg="white">
          <Container size="narrow">
            <AnimatedSection direction="up">
              <FaqContent items={faqItems} categories={categories} />
            </AnimatedSection>
          </Container>
        </Section>

        {/* CTA */}
        <Section bg="navy">
          <Container size="narrow">
            <div className="text-center">
              <Heading as="h2" size="h3" className="text-white mb-4">
                Didn&apos;t Find Your Answer?
              </Heading>
              <p className="text-white/70 mb-8 text-lg">
                Reach out to our support team and we&apos;ll get back to you
                within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/contact">
                  <Button variant="primary" size="lg">
                    Contact Support
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="text-white hover:text-accent hover:bg-white/10"
                  >
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
