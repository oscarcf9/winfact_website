"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PlanData = {
  id: string;
  key: string;
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  price: number;
  interval: string;
  ctaEn: string;
  ctaEs: string;
  featuresEn: string[];
  featuresEs: string[];
  isPopular: boolean;
  badgeEn: string | null;
  badgeEs: string | null;
  isFree: boolean;
};

const intervalLabels: Record<string, Record<string, string>> = {
  en: { forever: "forever", week: "/week", month: "/month", year: "/year" },
  es: { forever: "siempre", week: "/semana", month: "/mes", year: "/año" },
};

export function PricingPreview() {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
        } else {
          setUseFallback(true);
        }
      })
      .catch(() => setUseFallback(true));
  }, []);

  const isEs = locale === "es";

  // Render from DB data
  const renderPlans = () => {
    if (!useFallback && plans.length > 0) {
      return plans.map((plan) => {
        const features = isEs ? plan.featuresEs : plan.featuresEn;
        return (
          <Card
            key={plan.id}
            className={`flex flex-col relative ${
              plan.isPopular ? "border-2 border-primary shadow-lg scale-[1.02]" : ""
            }`}
          >
            {plan.isPopular && (plan.badgeEn || plan.badgeEs) && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1">
                {isEs ? plan.badgeEs : plan.badgeEn}
              </Badge>
            )}

            <div className="mb-6">
              <h3 className="font-heading font-bold text-xl text-navy">
                {isEs ? plan.nameEs : plan.nameEn}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                {isEs ? plan.descriptionEs : plan.descriptionEn}
              </p>
            </div>

            <div className="mb-6">
              <span className="font-mono text-4xl font-bold text-navy">${plan.price}</span>
              <span className="text-gray-400 text-sm">
                {intervalLabels[locale]?.[plan.interval] || `/${plan.interval}`}
              </span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {features.map((feature: string, j: number) => (
                <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link href="/pricing">
              <Button variant={plan.isPopular ? "primary" : "outline"} className="w-full">
                {isEs ? plan.ctaEs : plan.ctaEn}
              </Button>
            </Link>
          </Card>
        );
      });
    }

    // Fallback to translations
    return [0, 1, 2].map((i) => {
      const isPopular = i === 2;
      return (
        <Card
          key={i}
          className={`flex flex-col relative ${
            isPopular ? "border-2 border-primary shadow-lg scale-[1.02]" : ""
          }`}
        >
          {isPopular && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1">
              {t(`tiers.${i}.badge`)}
            </Badge>
          )}

          <div className="mb-6">
            <h3 className="font-heading font-bold text-xl text-navy">{t(`tiers.${i}.name`)}</h3>
            <p className="text-gray-500 text-sm mt-1">{t(`tiers.${i}.description`)}</p>
          </div>

          <div className="mb-6">
            <span className="font-mono text-4xl font-bold text-navy">{t(`tiers.${i}.price`)}</span>
            <span className="text-gray-400 text-sm">{t(`tiers.${i}.period`)}</span>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {(t.raw(`tiers.${i}.features`) as string[]).map((feature: string, j: number) => (
              <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <Link href="/pricing">
            <Button variant={isPopular ? "primary" : "outline"} className="w-full">
              {t(`tiers.${i}.cta`)}
            </Button>
          </Link>
        </Card>
      );
    });
  };

  return (
    <Section bg="light">
      <Container>
        <div className="text-center mb-12">
          <Heading as="h2" className="text-navy mb-4">{t("title")}</Heading>
          <p className="text-gray-500 text-lg">{t("subtitle")}</p>
        </div>

        <div className={`grid gap-6 max-w-5xl mx-auto ${
          plans.length === 1 ? "md:grid-cols-1 max-w-md" :
          plans.length === 2 ? "md:grid-cols-2 max-w-3xl" :
          "md:grid-cols-3"
        }`}>
          {renderPlans()}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">{t("guarantee")}</p>
      </Container>
    </Section>
  );
}
