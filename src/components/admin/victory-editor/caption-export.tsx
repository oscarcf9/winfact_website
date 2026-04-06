"use client";

import { useState, useCallback } from "react";
import {
  Loader2,
  Download,
  Send,
  Copy,
  CheckCircle,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface CaptionExportProps {
  pick: {
    sport: string;
    matchup: string;
    pickText: string;
    odds: number | null;
    units: number | null;
    tier: string | null;
  };
  winner: string;
  /** Called to render offscreen canvas and get data URL */
  getExportDataUrl: () => string | null;
  /** Called when "Convert to Post" completes */
  onConvertToPost: (dataUrl: string) => Promise<void>;
  /** Result from successful convert */
  postResult: {
    victoryPostId: string;
    imageUrl: string;
    captionEn: string;
    captionEs: string;
  } | null;
  converting: boolean;
}

export function CaptionExport({
  pick,
  winner,
  getExportDataUrl,
  onConvertToPost,
  postResult,
  converting,
}: CaptionExportProps) {
  const [captionEn, setCaptionEn] = useState("");
  const [captionEs, setCaptionEs] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState<"en" | "es" | null>(null);

  const generateCaptions = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/victory-post/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: pick.sport,
          matchup: pick.matchup,
          pickText: pick.pickText,
          odds: pick.odds,
          units: pick.units,
          tier: pick.tier,
          winner,
        }),
      });
      if (!res.ok) {
        const fallbackEn = `${winner} gets the WIN! Another successful pick from WinFact Picks.\n\n${pick.sport} | ${pick.matchup}\n\n#WinFactPicks #Winner #${pick.sport} #SportsBetting`;
        const fallbackEs = `${winner} se lleva la VICTORIA! Otra seleccion exitosa de WinFact Picks.\n\n${pick.sport} | ${pick.matchup}\n\n#WinFactPicks #Winner #${pick.sport} #SportsBetting`;
        setCaptionEn(fallbackEn);
        setCaptionEs(fallbackEs);
        setGenerated(true);
        return;
      }
      const data = await res.json();
      setCaptionEn(data.captionEn || "");
      setCaptionEs(data.captionEs || "");
      setGenerated(true);
    } catch {
      // Fallback captions
      setCaptionEn(`${winner} WIN! ${pick.pickText} hits for WinFact Picks.\n\n#WinFactPicks #Winner #${pick.sport}`);
      setCaptionEs(`VICTORIA ${winner}! ${pick.pickText} acierta con WinFact Picks.\n\n#WinFactPicks #Winner #${pick.sport}`);
      setGenerated(true);
    } finally {
      setGenerating(false);
    }
  }, [pick, winner]);

  const handleDownload = useCallback(() => {
    const dataUrl = getExportDataUrl();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `victory-post-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [getExportDataUrl]);

  const handleConvert = useCallback(async () => {
    const dataUrl = getExportDataUrl();
    if (!dataUrl) {
      alert("Could not render the canvas. Make sure you have a background or ticket.");
      return;
    }
    await onConvertToPost(dataUrl);
  }, [getExportDataUrl, onConvertToPost]);

  const copyText = useCallback((text: string, lang: "en" | "es") => {
    navigator.clipboard.writeText(text);
    setCopied(lang);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Caption Generator */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Instagram Captions</h3>
          <button
            type="button"
            onClick={generateCaptions}
            disabled={generating || !winner}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            ) : generated ? (
              <><RefreshCw className="h-4 w-4" /> Regenerate</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate Captions</>
            )}
          </button>
        </div>

        {!winner && (
          <p className="text-sm text-amber-600">Select a winner team in the Setup tab first.</p>
        )}

        {generated && (
          <div className="space-y-4">
            {/* English */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium uppercase tracking-wider text-gray-500">English</label>
                <button
                  type="button"
                  onClick={() => copyText(captionEn, "en")}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  {copied === "en" ? <><CheckCircle className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                </button>
              </div>
              <textarea
                value={captionEn}
                onChange={e => setCaptionEn(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Spanish */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Espanol</label>
                <button
                  type="button"
                  onClick={() => copyText(captionEs, "es")}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  {copied === "es" ? <><CheckCircle className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                </button>
              </div>
              <textarea
                value={captionEs}
                onChange={e => setCaptionEs(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* Export Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-800">Export</h3>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-blue-600 px-4 py-3 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-600 hover:text-white"
          >
            <Download className="h-4 w-4" /> Download PNG
          </button>
          <button
            type="button"
            onClick={handleConvert}
            disabled={converting || !winner}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
          >
            {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {converting ? "Creating Post..." : "Convert to Post →"}
          </button>
        </div>

        {converting && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-700">Creating victory post...</p>
              <p className="text-xs text-gray-500">Uploading, generating captions, sending to Telegram</p>
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      {postResult && (
        <div className="rounded-xl border border-green-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <h3 className="font-semibold">Victory Post Created</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <img src={postResult.imageUrl} alt="Victory post" className="w-full rounded-xl border border-gray-200" />
              <a href={postResult.imageUrl} download className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                <Download className="h-3 w-3" /> Download full resolution
              </a>
            </div>
            <div className="space-y-3">
              {[
                { label: "English Caption", text: postResult.captionEn },
                { label: "Spanish Caption", text: postResult.captionEs },
              ].map(({ label, text }) => (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
                    <button type="button" onClick={() => navigator.clipboard.writeText(text)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{text}</p>
                  </div>
                </div>
              ))}
              <div className="flex flex-col gap-1 border-t border-gray-100 pt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Uploaded to R2</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Sent to Telegram</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Saved as draft in content queue</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
