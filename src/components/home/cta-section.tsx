import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  const t = useTranslations("cta");

  return (
    <Section bg="gradient">
      <Container size="narrow" className="text-center">
        <Heading as="h2" size="h2" className="text-white mb-4">
          {t("title")}
        </Heading>
        <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
          {t("subtitle")}
        </p>
        <Link href="/pricing">
          <Button variant="primary" size="xl">
            {t("button")}
          </Button>
        </Link>
      </Container>
    </Section>
  );
}
