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
  const t = await getTranslations({
    locale,
    namespace: "responsibleGambling",
  });

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: `/${locale}/responsible-gambling`,
      languages: {
        en: "/en/responsible-gambling",
        es: "/es/responsible-gambling",
      },
    },
    openGraph: {
      title: "Responsible Gambling | WinFact Picks",
      description: t("subtitle"),
    },
    twitter: {
      card: "summary_large_image",
      title: "Responsible Gambling | WinFact Picks",
      description: t("subtitle"),
    },
  };
}

export default function ResponsibleGamblingPage() {
  const t = useTranslations("responsibleGambling");

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          {
            name: "Responsible Gambling",
            url: `${SITE_URL}/responsible-gambling`,
          },
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
              <div className="prose prose-gray max-w-none">
                {/* Our Commitment */}
                <div className="mb-10">
                  <Heading as="h2" size="h4" className="text-navy mb-3">
                    {t("sections.commitment.title")}
                  </Heading>
                  <p className="text-gray-600 leading-relaxed">
                    {t("sections.commitment.content")}
                  </p>
                </div>

                {/* Warning Signs */}
                <div className="mb-10">
                  <Heading as="h2" size="h4" className="text-navy mb-3">
                    {t("sections.warningSigns.title")}
                  </Heading>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {t("sections.warningSigns.content")}
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-danger mt-1">&#9679;</span>
                        <span>{t(`sections.warningSigns.signs.${i}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Self-Assessment */}
                <div className="mb-10">
                  <Heading as="h2" size="h4" className="text-navy mb-3">
                    {t("sections.selfAssessment.title")}
                  </Heading>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {t("sections.selfAssessment.content")}
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-warning mt-1">&#9679;</span>
                        <span>
                          {t(`sections.selfAssessment.questions.${i}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Resources & Helplines */}
                <div className="mb-10">
                  <Heading as="h2" size="h4" className="text-navy mb-3">
                    {t("sections.resources.title")}
                  </Heading>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {t("sections.resources.content")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-5"
                      >
                        <h3 className="font-heading font-bold text-navy mb-1">
                          {t(`sections.resources.helplines.${i}.name`)}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {t(`sections.resources.helplines.${i}.description`)}
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          {t(`sections.resources.helplines.${i}.contact`)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div className="mb-10">
                  <Heading as="h2" size="h4" className="text-navy mb-3">
                    {t("sections.tips.title")}
                  </Heading>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {t("sections.tips.content")}
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-success mt-1">&#9679;</span>
                        <span>{t(`sections.tips.items.${i}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Our Safeguards */}
                <div className="mb-10">
                  <Heading as="h2" size="h4" className="text-navy mb-3">
                    {t("sections.safeguards.title")}
                  </Heading>
                  <p className="text-gray-600 leading-relaxed">
                    {t("sections.safeguards.content")}
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
