import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export function FaqSection() {
  const t = useTranslations("faq");

  return (
    <Section bg="white">
      <Container size="narrow">
        <div className="text-center mb-12">
          <Heading as="h2" className="text-navy mb-4">
            {t("title")}
          </Heading>
          <p className="text-gray-500 text-lg">{t("subtitle")}</p>
        </div>

        <Accordion>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <AccordionItem
              key={i}
              question={t(`items.${i}.question`)}
              answer={t(`items.${i}.answer`)}
            />
          ))}
        </Accordion>

        <div className="text-center mt-8">
          <Link href="/faq">
            <Button variant="ghost">{t("viewAll")}</Button>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
