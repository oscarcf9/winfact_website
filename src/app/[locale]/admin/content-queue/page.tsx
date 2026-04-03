import { ContentQueueDashboard } from "@/components/admin/content-queue-dashboard";
import { getTranslations } from "next-intl/server";

export default async function ContentQueuePage() {
  const t = await getTranslations("admin.contentQueue");
  const tc = await getTranslations("admin.common");

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
          {" "}
          <span className="text-gray-400 text-lg font-normal ml-3">{tc("management")}</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">{t("subtitle")}</p>
      </div>
      <ContentQueueDashboard />
    </div>
  );
}
