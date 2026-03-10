import { PickForm } from "@/components/admin/pick-form";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

type Props = {
  searchParams: Promise<{ sport?: string; matchup?: string }>;
};

export default async function NewPickPage({ searchParams }: Props) {
  const t = await getTranslations("admin.picks");
  const params = await searchParams;

  // Build default values from URL params (e.g. from Intelligence quick pick)
  const defaults = params.sport || params.matchup
    ? {
        sport: params.sport || "MLB",
        matchup: params.matchup || "",
      }
    : undefined;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Link
          href="/admin/picks"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          {t("backToPicks")}
        </Link>
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("create")}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">{t("newPickSubtitle")}</span>
        </h1>
      </div>
      <PickForm defaults={defaults} />
    </div>
  );
}
