import { PostForm } from "@/components/admin/post-form";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function NewPostPage() {
  const t = await getTranslations("admin.blog");

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          {t("backToBlog")}
        </Link>
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("create")}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">{t("newPostSubtitle")}</span>
        </h1>
      </div>
      <PostForm />
    </div>
  );
}
