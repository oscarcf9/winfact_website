"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="font-heading font-bold text-6xl text-primary mb-4">500</h1>
        <h2 className="font-heading font-bold text-xl text-navy mb-3">
          {t("serverError")}
        </h2>
        <p className="text-gray-500 mb-8">
          {t("serverErrorDescription")}
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-xl bg-primary text-white font-semibold px-6 py-3 hover:bg-primary/90 transition-colors"
        >
          {t("tryAgain")}
        </button>
      </div>
    </div>
  );
}
