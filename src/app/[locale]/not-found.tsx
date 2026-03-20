import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFoundPage() {
  const t = await getTranslations("errors");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="font-heading font-bold text-6xl text-primary mb-4">404</h1>
        <h2 className="font-heading font-bold text-xl text-navy mb-3">
          {t("notFound")}
        </h2>
        <p className="text-gray-500 mb-8">
          {t("notFoundDescription")}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-primary text-white font-semibold px-6 py-3 hover:bg-primary/90 transition-colors"
        >
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}
