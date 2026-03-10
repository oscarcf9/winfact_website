import { db } from "@/db";
import { siteContent } from "@/db/schema";
import { ContentEditor } from "@/components/admin/content-editor";
import { getTranslations } from "next-intl/server";

export default async function AdminContentPage() {
  const t = await getTranslations("admin.siteContent");
  const allContent = await db.select().from(siteContent);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
        </h1>
        <p className="text-gray-400 text-sm mt-2">
          {t("subtitle")}
        </p>
      </div>

      <ContentEditor initialContent={allContent} />
    </div>
  );
}
