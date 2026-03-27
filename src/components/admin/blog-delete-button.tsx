"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

type Props = {
  postId: string;
  postTitle: string;
  isPublished: boolean;
};

export function BlogDeleteButton({ postId, postTitle, isPublished }: Props) {
  const router = useRouter();
  const tc = useTranslations("admin.common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmOpen(false);
        router.refresh();
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
        title={tc("delete")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setConfirmOpen(false); }}
        >
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-navy mb-1">{tc("deletePost")}</h3>
              <p className="text-sm text-gray-500 mb-1">
                <span className="font-medium text-navy">{postTitle}</span>
              </p>
              <p className="text-xs text-gray-400 mb-3">{tc("tagsRemoved")}</p>
              {isPublished && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 text-left">
                    {tc("publishedWarning")}
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-400">{tc("deleteConfirmTitle")}</p>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/50 flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {tc("delete")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-100 cursor-pointer disabled:opacity-50"
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Full-width delete button for the blog edit page sidebar.
 * On success, redirects to /admin/blog.
 */
export function BlogDeleteButtonFull({ postId, postTitle, isPublished }: Props) {
  const router = useRouter();
  const tc = useTranslations("admin.common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${postId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/blog");
        router.refresh();
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-all duration-200 cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
        {tc("deletePost")}
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setConfirmOpen(false); }}
        >
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-navy mb-1">{tc("deletePost")}</h3>
              <p className="text-sm text-gray-500 mb-1">
                <span className="font-medium text-navy">{postTitle}</span>
              </p>
              <p className="text-xs text-gray-400 mb-3">{tc("tagsRemoved")}</p>
              {isPublished && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 text-left">
                    {tc("publishedWarning")}
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-400">{tc("deleteConfirmTitle")}</p>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/50 flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {tc("delete")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-100 cursor-pointer disabled:opacity-50"
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
