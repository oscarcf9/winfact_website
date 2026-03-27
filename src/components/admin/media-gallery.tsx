"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Upload,
  Loader2,
  Trash2,
  Copy,
  Check,
  Image as ImageIcon,
  X,
  Search,
  Grid,
  List,
} from "lucide-react";

type MediaItem = {
  id: string;
  filename: string;
  url: string;
  sizeBytes?: number | null;
  mimeType?: string | null;
  altText?: string | null;
  uploadedAt?: string | null;
};

function formatBytes(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaGallery() {
  const t = useTranslations("admin.media");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/media");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("altText", file.name.replace(/\.[^.]+$/, ""));

      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          console.error("Upload failed for", file.name);
        }
      } catch {
        console.error("Upload error for", file.name);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetchMedia();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (preview?.id === id) setPreview(null);
      }
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = search
    ? items.filter(
        (item) =>
          item.filename.toLowerCase().includes(search.toLowerCase()) ||
          item.altText?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} {t("files")}
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? t("uploading") : t("upload")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-gray-200 hover:border-primary/30"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-xl bg-gray-100">
            <Upload className="h-6 w-6 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">
              {t("dragAndDrop")}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t("uploadFormats")}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchFiles")}
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setView("grid")}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              view === "grid" ? "bg-white shadow-sm text-primary" : "text-gray-400"
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              view === "list" ? "bg-white shadow-sm text-primary" : "text-gray-400"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Gallery */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-12 text-center">
          <ImageIcon className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {search ? t("noSearchResults") : t("noMedia")}
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-all duration-200"
            >
              <button
                onClick={() => setPreview(item)}
                className="w-full aspect-square cursor-pointer"
              >
                <img
                  src={item.url}
                  alt={item.altText || item.filename}
                  className="w-full h-full object-cover"
                />
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                <p className="text-xs text-white truncate flex-1 mr-2">
                  {item.filename}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyUrl(item.url)}
                    className="p-1.5 rounded-md bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
                    title={t("copyUrl")}
                  >
                    {copied === item.url ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                    className="p-1.5 rounded-md bg-white/20 text-white hover:bg-danger/80 transition-colors cursor-pointer disabled:opacity-50"
                    title={t("delete")}
                  >
                    {deleting === item.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <button
                onClick={() => setPreview(item)}
                className="shrink-0 cursor-pointer"
              >
                <img
                  src={item.url}
                  alt={item.altText || item.filename}
                  className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy truncate">
                  {item.filename}
                </p>
                <p className="text-xs text-gray-400">
                  {formatBytes(item.sizeBytes)}
                  {item.mimeType ? ` · ${item.mimeType}` : ""}
                  {item.uploadedAt
                    ? ` · ${new Date(item.uploadedAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copyUrl(item.url)}
                  className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  {copied === item.url ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  className="p-2 rounded-lg text-gray-400 hover:text-danger hover:bg-danger/5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleting === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy truncate">
                  {preview.filename}
                </p>
                <p className="text-xs text-gray-400">
                  {formatBytes(preview.sizeBytes)}
                  {preview.mimeType ? ` · ${preview.mimeType}` : ""}
                </p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 bg-gray-50">
              <img
                src={preview.url}
                alt={preview.altText || preview.filename}
                className="w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
            <div className="px-5 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-xs text-gray-400 font-mono truncate flex-1 mr-3">
                {preview.url}
              </div>
              <button
                onClick={() => copyUrl(preview.url)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 transition-colors cursor-pointer"
              >
                {copied === preview.url ? (
                  <>
                    <Check className="h-3 w-3" /> {t("copied")}
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> {t("copyUrl")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
