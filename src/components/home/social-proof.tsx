import { getTranslations } from "next-intl/server";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { CountUp } from "@/components/ui/count-up";
import { AnimatedSection } from "@/components/ui/animated-section";

const STATS = [
  { key: "picks", end: 10, suffix: "K+", decimals: 0 },
  { key: "clv", end: 89, suffix: "%", decimals: 0 },
  { key: "profit", end: 47, prefix: "+", suffix: "u", decimals: 0 },
  { key: "years", end: 6, suffix: "+", decimals: 0 },
] as const;

export async function SocialProof() {
  const t = await getTranslations("socialProof");

  return (
    <Section bg="white" spacing="tight" className="relative">
      <div className="section-divider-gradient absolute top-0 left-0 right-0" />
      <Container>
        <AnimatedSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.key} className="text-center">
                <div className="font-mono text-3xl md:text-4xl font-bold text-navy">
                  <CountUp
                    end={stat.end}
                    prefix={stat.key === "profit" ? "+" : ""}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {t(`${stat.key}Label`)}
                </p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </Container>
    </Section>
  );
}
