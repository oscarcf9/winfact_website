"use client";

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import { Upload, Loader2, ImageIcon, Sparkles, Check } from "lucide-react";

interface BackgroundManagerProps {
  sport: string;
  team: string;
  onSelect: (url: string) => void;
}

const AI_STYLES = [
  { id: "arena_lights", label: "Arena Lights" },
  { id: "city_skyline", label: "City Skyline" },
  { id: "dramatic_sky", label: "Dramatic Sky" },
  { id: "smoke_flames", label: "Smoke & Flames" },
  { id: "neon_night", label: "Neon Night" },
] as const;

type AiStyleId = (typeof AI_STYLES)[number]["id"];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function BackgroundManager({ sport, team, onSelect }: BackgroundManagerProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "generate">("upload");

  // Upload state
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI generate state
  const [selectedStyle, setSelectedStyle] = useState<AiStyleId>("arena-lights");
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Upload handlers ──────────────────────────────────────────────────

  const processFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Please upload a JPG, PNG, or WebP image.");
        return;
      }
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setUploadPreview(dataUrl);
        onSelect(dataUrl);
      };
      reader.onerror = () => {
        setError("Failed to read the file. Please try again.");
      };
      reader.readAsDataURL(file);
    },
    [onSelect],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  // ── AI generate handlers ─────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!team) {
      setError("Please select a winner team first (at the top of the page)");
      return;
    }
    setGenerating(true);
    setError(null);
    setGeneratedUrl(null);

    try {
      const res = await fetch("/api/admin/victory-post/generate-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport, team, style: selectedStyle }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Generation failed (${res.status})`);
      }

      const data = await res.json();
      setGeneratedUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Background generation failed.");
    } finally {
      setGenerating(false);
    }
  }, [sport, team, selectedStyle]);

  const handleUseGenerated = useCallback(() => {
    if (generatedUrl) {
      onSelect(generatedUrl);
    }
  }, [generatedUrl, onSelect]);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "upload"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("generate")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "generate"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          AI Generate
        </button>
      </div>

      {/* Upload tab */}
      {activeTab === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              isDragOver
                ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
                : "border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-gray-500"
            }`}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              id="bg-upload"
              onChange={handleFileChange}
            />
            <Upload className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Drop image here or click to upload
            </p>
            <p className="mt-1 text-xs text-gray-400">JPG, PNG, or WebP</p>
          </div>

          {uploadPreview && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Preview
              </p>
              <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <img
                  src={uploadPreview}
                  alt="Upload preview"
                  className="h-48 w-full object-cover"
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white">
                  <Check className="h-3 w-3" />
                  Selected
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Generate tab */}
      {activeTab === "generate" && (
        <div className="space-y-4">
          {/* Style selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Style
            </p>
            <div className="flex flex-wrap gap-2">
              {AI_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedStyle(style.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedStyle === style.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Background
              </>
            )}
          </button>

          {generating && (
            <p className="text-center text-xs text-gray-400">
              This may take 10-30 seconds
            </p>
          )}

          {/* Generated preview */}
          {generatedUrl && !generating && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Generated Background
              </p>
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <img
                  src={generatedUrl}
                  alt={`AI-generated ${selectedStyle} background for ${team}`}
                  className="h-48 w-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={handleUseGenerated}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
              >
                <ImageIcon className="h-4 w-4" />
                Use This Background
              </button>
            </div>
          )}

          {/* Empty state for generate tab */}
          {!generatedUrl && !generating && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-10 dark:border-gray-600">
              <ImageIcon className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Select a style and generate
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
