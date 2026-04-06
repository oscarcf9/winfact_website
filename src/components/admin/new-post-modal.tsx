"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, FileText, X } from "lucide-react";

export function NewPostButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-blue-600/20"
      >
        <Plus className="h-4 w-4" />
        New Post
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="mb-1 text-lg font-bold text-gray-900">Create New Post</h2>
            <p className="mb-6 text-sm text-gray-500">Choose how you want to create your blog post</p>

            <div className="grid grid-cols-2 gap-4">
              {/* AI Option */}
              <button
                type="button"
                onClick={() => { setOpen(false); router.push("/admin/blog/ai-create"); }}
                className="group flex flex-col items-center gap-3 rounded-xl border-2 border-blue-100 bg-blue-50/50 p-6 text-center transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
              >
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-3 text-white shadow-md transition group-hover:scale-105">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Create with AI</p>
                  <p className="mt-1 text-xs text-gray-500">Select a game, AI writes the blog + generates an image</p>
                </div>
              </button>

              {/* Manual Option */}
              <button
                type="button"
                onClick={() => { setOpen(false); router.push("/admin/blog/new"); }}
                className="group flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 bg-gray-50/50 p-6 text-center transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md"
              >
                <div className="rounded-xl bg-gray-700 p-3 text-white shadow-md transition group-hover:scale-105">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Write Manually</p>
                  <p className="mt-1 text-xs text-gray-500">Start from scratch with the standard editor</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
