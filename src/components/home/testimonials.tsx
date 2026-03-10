import { getTranslations } from "next-intl/server";
import { Star, Quote } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Card } from "@/components/ui/card";
import { AnimatedSection } from "@/components/ui/animated-section";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientText } from "@/components/ui/gradient-text";

export async function Testimonials() {
  const t = await getTranslations("testimonials");

  return (
    <Section bg="white" className="relative">
      <Container>
        <AnimatedSection className="text-center mb-14">
          <Heading as="h2" className="text-navy mb-4">
            {t("title")}
          </Heading>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </AnimatedSection>

        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <AnimatedCard key={i} index={i} hoverGlow>
              <Card className="flex flex-col relative overflow-hidden group">
                {/* Decorative quote icon */}
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/5 group-hover:text-primary/10 transition-colors" />

                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>

                <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6 relative z-10">
                  &ldquo;{t(`items.${i}.text`)}&rdquo;
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  {/* Gradient avatar ring */}
                  <div className="p-0.5 rounded-full bg-gradient-to-br from-primary to-accent">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {t(`items.${i}.name`).charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-navy">
                      {t(`items.${i}.name`)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t(`items.${i}.role`)} &middot;{" "}
                      <GradientText variant="accent" className="text-xs font-medium">
                        {t(`items.${i}.duration`)}
                      </GradientText>
                    </p>
                  </div>
                </div>
              </Card>
            </AnimatedCard>
          ))}
        </div>
      </Container>
    </Section>
  );
}
