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
  Layers,
  AlertCircle,
  Upload,
  Ticket,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BackgroundManager } from "@/components/admin/victory-editor/background-manager";
import { toBlob } from "html-to-image";
import dynamic from "next/dynamic";

// Existing ticket generator components — reused at FULL SIZE
import TicketCanvas from "@/components/admin/ticket-generator/ticket-canvas";
import TicketForm from "@/components/admin/ticket-generator/ticket-form";
import { INITIAL_FORM_DATA, type BetFormData } from "@/components/admin/ticket-generator/ticket-types";
import { calculateSinglePayout } from "@/components/admin/ticket-generator/payout-calculator";
import "@/components/admin/ticket-generator/ticket-fonts.css";

const VictoryCompositor = dynamic(
  () => import("@/components/admin/victory-editor/victory-compositor"),
  { ssr: false, loading: () => <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div> }
);

type Pick = {
  id: string;
  sport: string;
  matchup: string;
  pickText: string;
  odds: number | null;
  units: number | null;
  tier: string | null;
  status: string | null;
  result: string | null;
};

const SPORT_MAP: Record<string, string> = {
  MLB: "mlb", NFL: "nfl", NBA: "nba", NHL: "nhl", Soccer: "soccer", NCAA: "ncaa",
};

export default function VictoryPostEditorPage() {
  const params = useParams();
  const router = useRouter();
  const pickId = params.id as string;

  const [pick, setPick] = useState<Pick | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Ticket state
  const [formData, setFormData] = useState<BetFormData>(INITIAL_FORM_DATA);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [ticketDataUrl, setTicketDataUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [ticketCollapsed, setTicketCollapsed] = useState(false);

  // Also allow uploading a ticket PNG directly
  const [uploadMode, setUploadMode] = useState(false);

  // Background
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  // Winner
  const [winner, setWinner] = useState("");
  const teams = (pick?.matchup || "").split(/\s+(?:vs\.?|@|at|v)\s+/i).map((t) => t.trim());
  const team1 = teams[0] || "";
  const team2 = teams[1] || "";

  // Convert to Post
  const [converting, setConverting] = useState(false);
  const [postResult, setPostResult] = useState<{
    victoryPostId: string;
    imageUrl: string;
    captionEn: string;
    captionEs: string;
  } | null>(null);

  // Fetch pick
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
          team1: { acronym: (found.matchup.split(/\s+(?:vs\.?|@|at|v)\s+/i)[0] || "").substring(0, 3).toUpperCase(), score: "0" },
          team2: { acronym: (found.matchup.split(/\s+(?:vs\.?|@|at|v)\s+/i)[1] || "").substring(0, 3).toUpperCase(), score: "0" },
          pickId: found.id,
        });
      } catch {
        setError("Failed to load pick data");
      } finally {
        setLoading(false);
      }
    }
    fetchPick();
  }, [pickId]);

  // Auto-compute paid
  useEffect(() => {
    if (formData.odds && formData.wager) {
      const result = calculateSinglePayout(formData.odds, formData.wager);
      if (result) setFormData((prev) => ({ ...prev, paid: result.formatted }));
    }
  }, [formData.odds, formData.wager]);

  // Capture ticket as image (one-click, no download needed)
  const captureTicket = useCallback(async () => {
    if (!ticketRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      await document.fonts.ready;
      const blob = await toBlob(ticketRef.current, { pixelRatio: 2, quality: 1.0, cacheBust: true });
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setTicketDataUrl(reader.result as string);
          setTicketCollapsed(true); // Collapse ticket section after capture
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.error("Ticket capture error:", err);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  // Upload ticket image directly
  const handleTicketUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setTicketDataUrl(reader.result as string); setTicketCollapsed(true); };
    reader.readAsDataURL(file);
  }, []);

  // Convert to Post
  const handleConvertToPost = async (compositeDataUrl: string) => {
    if (!pick || !winner) { alert("Please select the winner team first"); return; }
    setConverting(true);
    try {
      const res = await fetch("/api/admin/victory-post/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickId: pick.id, imageBase64: compositeDataUrl, sport: pick.sport,
          matchup: pick.matchup, pickText: pick.pickText, odds: pick.odds,
          units: pick.units, tier: pick.tier || "free", winner,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create victory post");
      setPostResult(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create victory post");
    } finally { setConverting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>;
  if (error || !pick) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-gray-500">{error || "Pick not found"}</p>
        <button onClick={() => router.back()} className="mt-4 text-primary hover:underline cursor-pointer">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-3 cursor-pointer">
          <ArrowLeft className="h-3 w-3" /> Back to Pick
        </button>
        <h1 className="font-heading font-bold text-2xl tracking-tight"><span className="text-primary">Victory Post Editor</span></h1>
        <p className="text-sm text-gray-500 mt-1">{pick.sport} | {pick.matchup} | {pick.pickText} <span className="text-success font-medium">WIN</span></p>
      </div>

      {/* Winner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
        <span className="text-sm text-amber-800 font-medium">Winner:</span>
        <select value={winner} onChange={(e) => setWinner(e.target.value)} className="text-sm border border-amber-200 rounded-lg px-3 py-1.5 bg-white text-amber-800">
          <option value="">Select winner...</option>
          {team1 && <option value={team1}>{team1}</option>}
          {team2 && <option value={team2}>{team2}</option>}
        </select>
      </div>

      {/* ─── TICKET SECTION (collapsible) ─────────── */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setTicketCollapsed(!ticketCollapsed)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Ticket className="h-5 w-5 text-primary" />
            <span className="font-semibold text-gray-900">Ticket</span>
            {ticketDataUrl && <CheckCircle className="h-4 w-4 text-success" />}
            {ticketDataUrl && <span className="text-xs text-success">Captured</span>}
          </div>
          {ticketCollapsed ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
        </button>

        {!ticketCollapsed && (
          <div className="border-t border-gray-200 p-6">
            {/* Toggle: create or upload */}
            <div className="flex gap-2 mb-4">
              <button type="button" onClick={() => setUploadMode(false)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer", !uploadMode ? "bg-primary/10 text-primary" : "text-gray-500 hover:bg-gray-50")}>
                Create Ticket
              </button>
              <button type="button" onClick={() => setUploadMode(true)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer", uploadMode ? "bg-primary/10 text-primary" : "text-gray-500 hover:bg-gray-50")}>
                Upload PNG
              </button>
            </div>

            {uploadMode ? (
              <div>
                <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Drop ticket PNG here or click to upload</p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleTicketUpload} />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6">
                {/* Form (scrollable) */}
                <div className="max-h-[500px] overflow-y-auto pr-2">
                  <TicketForm data={formData} onChange={setFormData} />
                </div>

                {/* Preview at readable size */}
                <div className="flex flex-col items-center gap-4">
                  <div style={{ width: 885 * 0.55, height: 620 * 0.55, flexShrink: 0 }}>
                    <div className="shadow-lg" style={{ width: 885, height: 620, transform: "scale(0.55)", transformOrigin: "top left", borderRadius: 15, overflow: "hidden" }}>
                      <TicketCanvas ref={ticketRef} data={formData} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={captureTicket}
                    disabled={isCapturing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isCapturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {isCapturing ? "Capturing..." : "Use This Ticket"}
                  </button>
                </div>
              </div>
            )}

            {ticketDataUrl && (
              <div className="mt-4 flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-xl">
                <img src={ticketDataUrl} alt="Captured ticket" className="h-16 rounded-lg border border-gray-200" />
                <div>
                  <p className="text-sm font-medium text-success">Ticket ready</p>
                  <p className="text-xs text-gray-500">This will be placed on the background in the compositor</p>
                </div>
                <button type="button" onClick={() => { setTicketDataUrl(null); setTicketCollapsed(false); }} className="ml-auto text-xs text-gray-400 hover:text-red-500 cursor-pointer">Clear</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── BACKGROUND SECTION ─────────────────────── */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <ImageIcon className="h-5 w-5 text-primary" />
          <span className="font-semibold text-gray-900">Background</span>
          {backgroundUrl && <CheckCircle className="h-4 w-4 text-success" />}
        </div>
        <div className="p-6">
          <BackgroundManager sport={pick.sport} team={winner || team1} onSelect={setBackgroundUrl} />
          {backgroundUrl && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-xl">
              <img src={backgroundUrl} alt="Background" className="h-16 rounded-lg border border-gray-200 object-cover" />
              <p className="text-sm font-medium text-success">Background ready</p>
              <button type="button" onClick={() => setBackgroundUrl(null)} className="ml-auto text-xs text-gray-400 hover:text-red-500 cursor-pointer">Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* ─── COMPOSITOR ─────────────────────────────── */}
      {(ticketDataUrl || backgroundUrl) && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-semibold text-gray-900">Compose & Export</span>
          </div>
          <div className="p-6">
            {!winner && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> Select the winner team above before converting to post.
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
      )}

      {/* ─── RESULT ─────────────────────────────────── */}
      {postResult && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              <h2 className="font-semibold">Victory Post Created</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <img src={postResult.imageUrl} alt="Victory post" className="w-full rounded-xl border border-gray-200" />
                <a href={postResult.imageUrl} download className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Download className="h-3 w-3" /> Download
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
                      <button type="button" onClick={() => navigator.clipboard.writeText(text)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"><Copy className="h-3 w-3" /> Copy</button>
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
  );
}
