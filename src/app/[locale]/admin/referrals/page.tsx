import { getTranslations } from "next-intl/server";
import { ReferralManager } from "@/components/admin/referral-manager";

export default async function AdminReferralsPage() {
  const t = await getTranslations("admin.referrals");
  const tc = await getTranslations("admin.common");

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
        <span className="text-primary">{t("title")}</span>
        <span className="text-gray-400 text-lg font-normal ml-3">{tc("management")}</span>
      </h1>

      <ReferralManager />
    </div>
  );
}
