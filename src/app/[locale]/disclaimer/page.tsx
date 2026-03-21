import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { PageHero } from "@/components/ui/page-hero";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "disclaimer" });

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: "/disclaimer",
      languages: { en: "/en/disclaimer", es: "/es/disclaimer" },
    },
    openGraph: {
      title: "Disclaimer | WinFact Picks",
      description: t("subtitle"),
    },
    twitter: {
      card: "summary_large_image",
      title: "Disclaimer | WinFact Picks",
      description: t("subtitle"),
    },
  };
}

export default function DisclaimerPage() {
  const t = useTranslations("disclaimer");

  const sections = [
    "general",
    "noFinancialAdvice",
    "noGamblingServices",
    "accuracyOfInformation",
    "externalLinks",
    "limitationOfLiability",
  ] as const;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "Disclaimer", url: `${SITE_URL}/disclaimer` },
        ])}
      />
      <Header />

      <main>
        <PageHero containerSize="narrow">
          <Badge className="mb-4 bg-white/10 text-white border border-white/20">
            {t("badge")}
          </Badge>
          <Heading as="h1" size="h1" className="text-white mb-4">
            {t("title")}
          </Heading>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </PageHero>

        <Section bg="white">
          <Container size="narrow">
            <AnimatedSection direction="up">
              <p className="text-gray-500 text-sm mb-8">
                {t("lastUpdated")}
              </p>

              <div className="prose prose-gray max-w-none">
                {sections.map((section) => (
                  <div key={section} className="mb-10">
                    <Heading as="h2" size="h4" className="text-navy mb-3">
                      {t(`sections.${section}.title`)}
                    </Heading>
                    <p className="text-gray-600 leading-relaxed">
                      {t(`sections.${section}.content`)}
                    </p>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
