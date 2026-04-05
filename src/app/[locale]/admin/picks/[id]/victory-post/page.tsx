"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Copy,
  Download,
  Image as ImageIcon,
  Ticket,
  Layers,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BackgroundManager } from "@/components/admin/victory-editor/background-manager";
import dynamic from "next/dynamic";
import { toBlob } from "html-to-image";

// Existing ticket generator components (reuse the same ones from /admin/ticket-generator)
import TicketCanvas from "@/components/admin/ticket-generator/ticket-canvas";
import TicketForm from "@/components/admin/ticket-generator/ticket-form";
import { INITIAL_FORM_DATA, type BetFormData } from "@/components/admin/ticket-generator/ticket-types";
import { calculateSinglePayout } from "@/components/admin/ticket-generator/payout-calculator";
import "@/components/admin/ticket-generator/ticket-fonts.css";

// Konva must be loaded client-side only (uses window)
const VictoryCompositor = dynamic(
  () => import("@/components/admin/victory-editor/victory-compositor"),
  { ssr: false, loading: () => <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div> }
);

type Pick = {
  id: string;
  sport: string;
  league?: string | null;
  matchup: string;
  pickText: string;
  odds: number | null;
  units: number | null;
  tier: string | null;
  status: string | null;
  result: string | null;
};

type Step = "ticket" | "background" | "compose";

// Map pick sport to ticket form sport
const SPORT_MAP: Record<string, string> = {
  MLB: "mlb", NFL: "nfl", NBA: "nba", NHL: "nhl", Soccer: "soccer", NCAA: "ncaa",
  mlb: "mlb", nfl: "nfl", nba: "nba", nhl: "nhl", soccer: "soccer", ncaa: "ncaa",
};

export default function VictoryPostEditorPage() {
  const params = useParams();
  const router = useRouter();
  const pickId = params.id as string;

  const [pick, setPick] = useState<Pick | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("ticket");

  // Ticket state — uses the SAME form data type as the existing ticket generator
  const [formData, setFormData] = useState<BetFormData>(INITIAL_FORM_DATA);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [ticketDataUrl, setTicketDataUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Winner (required for caption generation)
  const [winner, setWinner] = useState("");

  // Background state
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  // Convert to Post state
  const [converting, setConverting] = useState(false);
  const [postResult, setPostResult] = useState<{
    victoryPostId: string;
    imageUrl: string;
    captionEn: string;
    captionEs: string;
  } | null>(null);

  // Teams from matchup
  const teams = (pick?.matchup || "").split(/\s+(?:vs\.?|@|at|v)\s+/i).map((t) => t.trim());
  const team1 = teams[0] || "";
  const team2 = teams[1] || "";

  // Fetch pick data and populate ticket form
  useEffect(() => {
    async function fetchPick() {
      try {
        const res = await fetch(`/api/admin/picks?tab=all`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const allPicks = Array.isArray(data) ? data : data.picks || [];
        const found = allPicks.find((p: Pick) => p.id === pickId);
        if (!found) { setError("Pick not found"); return; }
        if (found.result !== "win") { setError("Victory posts can only be created for winning picks"); return; }
        setPick(found);

        // Pre-populate ticket form from pick data
        const wagerAmount = String((found.units || 1) * 100);
        const oddsStr = found.odds != null ? String(found.odds) : "";
        let paid = "$0.00";
        if (oddsStr && wagerAmount) {
          const result = calculateSinglePayout(oddsStr, wagerAmount);
          paid = result?.formatted ?? "$0.00";
        }

        setFormData({
          ...INITIAL_FORM_DATA,
          sport: (SPORT_MAP[found.sport] || "nba") as BetFormData["sport"],
          betDescription: found.pickText,
          matchup: found.matchup,
          odds: oddsStr,
          wager: wagerAmount,
          paid,
          team1: { acronym: teams[0]?.substring(0, 3).toUpperCase() || "", score: "0" },
          team2: { acronym: teams[1]?.substring(0, 3).toUpperCase() || "", score: "0" },
          pickId: found.id,
        });
      } catch {
        setError("Failed to load pick data");
      } finally {
        setLoading(false);
      }
    }
    fetchPick();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickId]);

  // Auto-compute paid when odds/wager change
  useEffect(() => {
    if (formData.odds && formData.wager) {
      const result = calculateSinglePayout(formData.odds, formData.wager);
      if (result) {
        setFormData((prev) => ({ ...prev, paid: result.formatted }));
      }
    }
  }, [formData.odds, formData.wager]);

  // Export ticket as PNG data URL using html-to-image (same as existing ticket generator)
  const exportTicketToDataUrl = useCallback(async () => {
    if (!ticketRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await document.fonts.ready;
      const blob = await toBlob(ticketRef.current, {
        pixelRatio: 2,
        quality: 1.0,
        cacheBust: true,
      });
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setTicketDataUrl(reader.result as string);
          setStep("background"); // Auto-advance to next step
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.error("Ticket export error:", err);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  // Convert to Post
  const handleConvertToPost = async (compositeDataUrl: string) => {
    if (!pick || !winner) return;
    setConverting(true);
    try {
      const res = await fetch("/api/admin/victory-post/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickId: pick.id,
          imageBase64: compositeDataUrl,
          sport: pick.sport,
          matchup: pick.matchup,
          pickText: pick.pickText,
          odds: pick.odds,
          units: pick.units,
          tier: pick.tier || "free",
          winner,
          team1Score: formData.team1.score !== "0" ? parseInt(formData.team1.score) : undefined,
          team2Score: formData.team2.score !== "0" ? parseInt(formData.team2.score) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create victory post");
      setPostResult(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create victory post");
    } finally {
      setConverting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (error || !pick) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-gray-500">{error || "Pick not found"}</p>
        <button onClick={() => router.back()} className="mt-4 text-primary hover:underline cursor-pointer">Go back</button>
      </div>
    );
  }

  const steps: { key: Step; icon: typeof Ticket; label: string }[] = [
    { key: "ticket", icon: Ticket, label: "Ticket" },
    { key: "background", icon: ImageIcon, label: "Background" },
    { key: "compose", icon: Layers, label: "Compose" },
  ];

  return (
    <div className="space-y-6 animate-fade-up max-w-6xl">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-3 cursor-pointer">
          <ArrowLeft className="h-3 w-3" /> Back to Pick
        </button>
        <h1 className="font-heading font-bold text-2xl tracking-tight">
          <span className="text-primary">Victory Post Editor</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {pick.sport} | {pick.matchup} | {pick.pickText} <span className="text-success font-medium">WIN</span>
        </p>
      </div>

      {/* Winner selector (always visible) */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
        <span className="text-sm text-amber-800 font-medium">Winner:</span>
        <select
          value={winner}
          onChange={(e) => setWinner(e.target.value)}
          className="text-sm border border-amber-200 rounded-lg px-3 py-1.5 bg-white text-amber-800 focus:outline-none focus:border-amber-400"
        >
          <option value="">Select winner...</option>
          {team1 && <option value={team1}>{team1}</option>}
          {team2 && <option value={team2}>{team2}</option>}
        </select>
        {!winner && <span className="text-xs text-amber-600">Required for caption generation</span>}
      </div>

      {/* Step navigation */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStep(s.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer",
              step === s.key
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-gray-500 hover:bg-gray-50 border border-transparent"
            )}
          >
            <s.icon className="h-4 w-4" />
            {s.label}
            {s.key === "ticket" && ticketDataUrl && <CheckCircle className="h-3.5 w-3.5 text-success" />}
            {s.key === "background" && backgroundUrl && <CheckCircle className="h-3.5 w-3.5 text-success" />}
          </button>
        ))}
      </div>

      {/* ─── STEP 1: TICKET (existing ticket generator) ─── */}
      {step === "ticket" && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Create Ticket — <span className="text-gray-400 text-sm font-normal">Using the same ticket generator</span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ticket Form */}
              <div className="max-h-[600px] overflow-y-auto pr-2">
                <TicketForm data={formData} onChange={setFormData} />
              </div>

              {/* Ticket Preview (existing component) */}
              <div className="flex flex-col items-center">
                <div style={{ width: 885 * 0.5, height: 620 * 0.5, flexShrink: 0 }}>
                  <div
                    className="shadow-lg"
                    style={{ width: 885, height: 620, transform: "scale(0.5)", transformOrigin: "top left", borderRadius: 15, overflow: "hidden" }}
                  >
                    <TicketCanvas ref={ticketRef} data={formData} />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={exportTicketToDataUrl}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isExporting ? "Exporting..." : "Use This Ticket →"}
                  </button>
                </div>

                {ticketDataUrl && (
                  <p className="text-xs text-success mt-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Ticket captured
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2: BACKGROUND ─────────────────────── */}
      {step === "background" && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Background Image
            </h2>

            {!ticketDataUrl && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Go back to Step 1 and click "Use This Ticket" first
              </div>
            )}

            <BackgroundManager
              sport={pick.sport}
              team={winner || team1}
              onSelect={(url) => {
                setBackgroundUrl(url);
                setStep("compose");
              }}
            />
          </div>
        </div>
      )}

      {/* ─── STEP 3: COMPOSE ────────────────────────── */}
      {step === "compose" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Compose Victory Post
              </h2>

              {!winner && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Select the winner team above before converting to post.
                </div>
              )}

              {!ticketDataUrl && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Go back to Step 1 and create a ticket first.
                </div>
              )}

              <VictoryCompositor
                backgroundUrl={backgroundUrl}
                ticketDataUrl={ticketDataUrl}
                sport={pick.sport}
                tier={(pick.tier as "free" | "vip") || "free"}
                onExport={handleConvertToPost}
              />

              {converting && (
                <div className="mt-4 flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-primary">Creating victory post...</p>
                    <p className="text-xs text-gray-500">Uploading, generating captions, sending to Telegram</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── CAPTIONS RESULT ──────────────────────── */}
          {postResult && (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-5 w-5" />
                  <h2 className="font-semibold">Victory Post Created</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Image</p>
                    <img src={postResult.imageUrl} alt="Victory post" className="w-full rounded-xl border border-gray-200" />
                    <a href={postResult.imageUrl} download className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <Download className="h-3 w-3" /> Download full size
                    </a>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: "English Caption", text: postResult.captionEn },
                      { label: "Spanish Caption", text: postResult.captionEs },
                    ].map(({ label, text }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
                          <button type="button" onClick={() => copyToClipboard(text)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                            <Copy className="h-3 w-3" /> Copy
                          </button>
                        </div>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-col gap-1 text-xs text-gray-400 pt-2 border-t border-gray-100">
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" /> Uploaded to R2</span>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" /> Sent to Telegram</span>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" /> Saved as draft in content queue</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
