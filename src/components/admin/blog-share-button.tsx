"use client";

import { useState } from "react";
import { Share2, Loader2, Check, AlertCircle } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";

type Props = {
  postId: string;
  slug: string;
  excerpt: string;
  imageUrl?: string;
};

export function BlogShareButton({ postId, slug, excerpt, imageUrl }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleShare() {
    if (status === "loading") return;
    setStatus("loading");
    setError("");

    try {
      const blogUrl = `${SITE_URL}/en/blog/${slug}`;
      const caption = excerpt
        ? `${excerpt}\n\n${blogUrl}`
        : blogUrl;

      const res = await fetch("/api/admin/blog/share-buffer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          caption,
          imageUrl: imageUrl || null,
          blogUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to share");

      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={status === "loading"}
      title={status === "success" ? "Shared!" : status === "error" ? error : "Share to Facebook via Buffer"}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
        status === "success"
          ? "bg-green-50 text-green-600 border border-green-200"
          : status === "error"
          ? "bg-red-50 text-red-500 border border-red-200"
          : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 cursor-pointer"
      }`}
    >
      {status === "loading" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "success" && <Check className="h-3 w-3" />}
      {status === "error" && <AlertCircle className="h-3 w-3" />}
      {status === "idle" && <Share2 className="h-3 w-3" />}
      {status === "success" ? "Sent" : status === "error" ? "Failed" : "Share"}
    </button>
  );
}
