import { type ReactNode } from "react";
import { Section } from "./section";
import { Container } from "./container";
import { GradientOrb } from "./background-patterns";
import { InteractiveGrid } from "./interactive-grid";

type PageHeroProps = {
  children: ReactNode;
  containerSize?: "default" | "narrow" | "wide";
  className?: string;
};

export function PageHero({ children, containerSize = "narrow", className }: PageHeroProps) {
  return (
    <Section bg="gradient" spacing="page-hero" className="relative overflow-hidden">
      <InteractiveGrid />
      <GradientOrb color="primary" size="lg" className="top-[-10%] left-[-10%]" />
      <GradientOrb color="accent" size="md" className="bottom-[10%] right-[-5%]" />

      <Container size={containerSize} className={`relative z-10 text-center ${className ?? ""}`}>
        {children}
      </Container>
    </Section>
  );
}
