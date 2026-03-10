import { notFound } from "next/navigation";
import { PickForm } from "@/components/admin/pick-form";
import { db } from "@/db";
import { picks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPickPage({ params }: Props) {
  const t = await getTranslations("admin.picks");
  const { id } = await params;
  const [pick] = await db.select().from(picks).where(eq(picks.id, id)).limit(1);

  if (!pick) notFound();

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
          <span className="text-primary">{t("editTitle")}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">{t("pickSubtitle")}</span>
        </h1>
      </div>
      <PickForm pick={pick} />
    </div>
  );
}
