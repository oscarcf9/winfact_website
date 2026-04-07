"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Save,
  X,
  ChevronDown,
  Sparkles,
  Upload,
  ImageIcon,
  Loader2,
  FileText,
  Settings2,
  Search,
  Tag,
  Eye,
  Calendar,
} from "lucide-react";

const CATEGORIES = ["free_pick", "game_preview", "strategy", "model_breakdown", "news"];
const SPORTS = ["MLB", "NFL", "NBA", "NHL", "Soccer", "NCAA"];

const CATEGORY_KEYS: Record<string, string> = {
  free_pick: "catFreePick",
  game_preview: "catGamePreview",
  strategy: "catStrategy",
  model_breakdown: "catModelBreakdown",
  news: "catNews",
};

type Post = {
  id: string;
  slug: string;
  titleEn: string;
  titleEs?: string | null;
  bodyEn: string;
  bodyEs?: string | null;
  category?: string | null;
  featuredImage?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  status?: string | null;
  publishedAt?: string | null;
  author?: string | null;
};

type Props = {
  post?: Post;
  tags?: string[];
  deleteButton?: React.ReactNode;
};

const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-200";

const labelClass = "block text-sm font-medium text-gray-600 mb-1.5";

export function PostForm({ post, tags = [], deleteButton }: Props) {
  const t = useTranslations("admin.postForm");
  const router = useRouter();
  const isEdit = !!post;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);
  const [imagePreview, setImagePreview] = useState<string | null>(post?.featuredImage || null);
  const [uploading, setUploading] = useState(false);
  const [showSeo, setShowSeo] = useState(!!(post?.seoTitle || post?.seoDescription));
  const [contentLang, setContentLang] = useState<"en" | "es">("en");
  const [postStatus, setPostStatus] = useState(post?.status || "draft");
  const [scheduledAt, setScheduledAt] = useState(
    post?.status === "scheduled" && post?.publishedAt
      ? post.publishedAt.slice(0, 16) // "YYYY-MM-DDTHH:mm" for datetime-local
      : ""
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState(post?.featuredImage || "");
  const [generatingAiImage, setGeneratingAiImage] = useState(false);

  function toggleTag(sport: string) {
    setSelectedTags((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setFeaturedImageUrl(data.url);
      } else {
        setError(t("uploadFailed"));
        setImagePreview(null);
      }
    } catch {
      setError(t("uploadFailed"));
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    setImagePreview(null);
    setFeaturedImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerateAiImage() {
    if (!isEdit || !post) return;
    setGeneratingAiImage(true);
    setError("");
    try {
      const titleInput = document.querySelector<HTMLInputElement>('input[name="titleEn"]');
      const matchup = titleInput?.value || post.titleEn || "";
      const res = await fetch(`/api/admin/blog/${post.id}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchup, sport: "Sports" }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeaturedImageUrl(data.url);
        setImagePreview(data.url);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to generate AI image");
      }
    } catch {
      setError("Failed to generate AI image");
    } finally {
      setGeneratingAiImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const status = postStatus;
    const data: Record<string, unknown> = {
      titleEn: form.get("titleEn"),
      titleEs: form.get("titleEs") || null,
      slug: form.get("slug"),
      bodyEn: form.get("bodyEn"),
      bodyEs: form.get("bodyEs") || null,
      category: form.get("category") || null,
      featuredImage: featuredImageUrl || null,
      seoTitle: form.get("seoTitle") || null,
      seoDescription: form.get("seoDescription") || null,
      status,
      author: form.get("author") || "WinFact",
      tags: selectedTags,
    };

    // Include publishedAt for scheduled posts
    if (status === "scheduled" && scheduledAt) {
      data.publishedAt = new Date(scheduledAt).toISOString();
    }

    try {
      const url = isEdit ? `/api/admin/blog/${post.id}` : "/api/admin/blog";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || t("failedToSave"));
        return;
      }
      router.push("/admin/blog");
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  function generateSlug() {
    const titleInput = document.querySelector<HTMLInputElement>('input[name="titleEn"]');
    const slugInput = document.querySelector<HTMLInputElement>('input[name="slug"]');
    if (titleInput && slugInput) {
      slugInput.value = titleInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-up">
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl flex items-center gap-2">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ───── Left Column: Main Content ───── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-navy">{t("titleAndContent")}</h3>
            </div>

            <div className="space-y-4">
              {/* Language tabs */}
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                <button type="button" onClick={() => setContentLang("en")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${contentLang === "en" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  English
                </button>
                <button type="button" onClick={() => setContentLang("es")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${contentLang === "es" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  Español {!post?.titleEs && <span className="text-gray-400">(optional)</span>}
                </button>
              </div>

              {/* English content */}
              <div className={contentLang === "en" ? "" : "hidden"}>
                <div>
                  <label className={labelClass}>{t("titleSection")}</label>
                  <input
                    name="titleEn"
                    required
                    defaultValue={post?.titleEn || ""}
                    className={`${inputClass} text-base font-medium`}
                    placeholder={t("titlePlaceholder")}
                  />
                </div>
                <div className="mt-4">
                  <label className={labelClass}>{t("content")}</label>
                  <textarea
                    name="bodyEn"
                    required
                    rows={16}
                    defaultValue={post?.bodyEn || ""}
                    className={`${inputClass} font-mono text-[13px] leading-relaxed min-h-[300px] resize-y`}
                    placeholder={t("contentPlaceholder")}
                  />
                </div>
              </div>

              {/* Spanish content */}
              <div className={contentLang === "es" ? "" : "hidden"}>
                <div>
                  <label className={labelClass}>Título (ES)</label>
                  <input
                    name="titleEs"
                    defaultValue={post?.titleEs || ""}
                    className={`${inputClass} text-base font-medium`}
                    placeholder="Título del artículo en español..."
                  />
                </div>
                <div className="mt-4">
                  <label className={labelClass}>Contenido (ES)</label>
                  <textarea
                    name="bodyEs"
                    rows={16}
                    defaultValue={post?.bodyEs || ""}
                    className={`${inputClass} font-mono text-[13px] leading-relaxed min-h-[300px] resize-y`}
                    placeholder="Contenido del artículo en español..."
                  />
                </div>
              </div>

              {/* Slug */}
              <div>
                <label className={labelClass}>{t("urlSlug")}</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200">
                    <span className="pl-4 text-xs text-gray-400 select-none whitespace-nowrap">/blog/</span>
                    <input
                      name="slug"
                      required
                      defaultValue={post?.slug || ""}
                      className="flex-1 bg-transparent px-1 py-2.5 text-sm text-navy font-mono placeholder:text-gray-300 focus:outline-none"
                      placeholder={t("slugPlaceholder")}
                    />
                  </div>
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={generateSlug}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/15 text-primary text-sm hover:bg-primary/10 transition-all duration-200 cursor-pointer shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {t("auto")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-navy">{t("featuredImageSection")}</h3>
            </div>

            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
                {(uploading || generatingAiImage) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      {generatingAiImage && <span className="text-xs text-primary font-medium">Generating AI image...</span>}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="p-3 rounded-xl bg-gray-100 group-hover:bg-primary/10 transition-colors">
                    <Upload className="h-6 w-6 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">{t("clickToUpload")}</p>
                    <p className="text-xs text-gray-400 mt-1">{t("uploadFormats")}</p>
                  </div>
                </button>
                {isEdit && (
                  <button
                    type="button"
                    onClick={handleGenerateAiImage}
                    disabled={generatingAiImage}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-primary text-sm font-medium hover:from-primary/15 hover:to-accent/15 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {generatingAiImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating AI Image...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate AI Image
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* SEO (collapsible) */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSeo(!showSeo)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-navy">{t("seoSettings")}</h3>
                <span className="text-xs text-gray-400">{t("optional")}</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showSeo ? "rotate-180" : ""}`}
              />
            </button>
            {showSeo && (
              <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                <div>
                  <label className={labelClass}>{t("seoTitle")}</label>
                  <input
                    name="seoTitle"
                    defaultValue={post?.seoTitle || ""}
                    className={inputClass}
                    placeholder={t("seoTitlePlaceholder")}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t("seoDescription")}</label>
                  <textarea
                    name="seoDescription"
                    rows={2}
                    defaultValue={post?.seoDescription || ""}
                    className={`${inputClass} resize-none`}
                    placeholder={t("seoDescriptionPlaceholder")}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ───── Right Column: Sidebar ───── */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-navy">{t("publish")}</h3>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className={labelClass}>{t("status")}</label>
                <div className="relative">
                  <select
                    name="status"
                    value={postStatus}
                    onChange={(e) => setPostStatus(e.target.value)}
                    className={`${inputClass} appearance-none cursor-pointer pr-10`}
                  >
                    <option value="draft">{t("draft")}</option>
                    <option value="published">{t("published")}</option>
                    <option value="scheduled">{t("scheduled")}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Schedule Date — shown only when status is "scheduled" */}
              {postStatus === "scheduled" && (
                <div>
                  <label className={labelClass}>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      {t("publishDateTime")}
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    required
                    className={`${inputClass} font-mono text-sm`}
                  />
                  {scheduledAt && new Date(scheduledAt) <= new Date() && (
                    <p className="text-xs text-amber-600 mt-1">
                      {t("pastTimeWarning")}
                    </p>
                  )}
                </div>
              )}

              {/* Category */}
              <div>
                <label className={labelClass}>{t("category")}</label>
                <div className="relative">
                  <select
                    name="category"
                    defaultValue={post?.category || ""}
                    className={`${inputClass} appearance-none cursor-pointer pr-10`}
                  >
                    <option value="">{t("selectCategory")}</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_KEYS[c] ? t(CATEGORY_KEYS[c]) : c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Author */}
              <div>
                <label className={labelClass}>{t("author")}</label>
                <input
                  name="author"
                  defaultValue={post?.author || "WinFact"}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
              <button
                type="submit"
                disabled={loading || uploading}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {loading ? t("saving") : isEdit ? t("updatePost") : t("createPost")}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full px-5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 cursor-pointer"
              >
                {t("cancel")}
              </button>
              {isEdit && (
                <a
                  href={`/admin/blog/${post!.id}/preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-primary/20 text-primary text-sm font-medium hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  {t("preview")}
                </a>
              )}
              {deleteButton}
            </div>
          </div>

          {/* Sport Tags */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-navy">{t("sportTags")}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => toggleTag(sport)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                    selectedTags.includes(sport)
                      ? "bg-primary/10 text-primary border border-primary/30 font-semibold shadow-sm"
                      : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-700"
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
