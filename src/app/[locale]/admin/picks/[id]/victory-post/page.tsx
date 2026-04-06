"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  Ticket,
  ImageIcon,
  Layers,
  MessageSquare,
  Settings,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BackgroundManager } from "@/components/admin/victory-editor/background-manager";
import { CaptionExport } from "@/components/admin/victory-editor/caption-export";
import { toBlob } from "html-to-image";
import dynamic from "next/dynamic";

import TicketCanvas from "@/components/admin/ticket-generator/ticket-canvas";
import TicketForm from "@/components/admin/ticket-generator/ticket-form";
import { INITIAL_FORM_DATA, type BetFormData } from "@/components/admin/ticket-generator/ticket-types";
import { calculateSinglePayout } from "@/components/admin/ticket-generator/payout-calculator";
import "@/components/admin/ticket-generator/ticket-fonts.css";

const VictoryCompositor = dynamic(
  () => import("@/components/admin/victory-editor/victory-compositor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    ),
  }
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

type AdditionalImage = {
  id: string;
  dataUrl: string;
  name: string;
};

const SPORT_MAP: Record<string, string> = {
  MLB: "mlb", NFL: "nfl", NBA: "nba", NHL: "nhl", Soccer: "soccer", NCAA: "ncaa",
};

type TabId = "setup" | "editor" | "caption";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "setup", label: "Setup", icon: Settings },
  { id: "editor", label: "Editor", icon: Layers },
  { id: "caption", label: "Caption & Export", icon: MessageSquare },
];

export default function VictoryPostEditorPage() {
  const params = useParams();
  const router = useRouter();
  const pickId = params.id as string;

  const [pick, setPick] = useState<Pick | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("setup");

  // Ticket state
  const [formData, setFormData] = useState<BetFormData>(INITIAL_FORM_DATA);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [ticketDataUrl, setTicketDataUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);

  // Background
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  // Additional images
  const [additionalImages, setAdditionalImages] = useState<AdditionalImage[]>([]);

  // Winner — detect bet type from pickText
  const [winner, setWinner] = useState("");
  const teams = (pick?.matchup || "").split(/\s+(?:vs\.?|@|at|v)\s+/i).map((t) => t.trim());
  const team1 = teams[0] || "";
  const team2 = teams[1] || "";

  const pickText = pick?.pickText || "";
  const isTotalBet = /\b(over|under|o\/u|total)\b/i.test(pickText);
  const isPropBet = /\b(1st\s*inning|1H|corners|props?)\b/i.test(pickText);

  // Auto-select winner for totals/props based on pickText
  useEffect(() => {
    if (!pick || winner) return;
    if (isTotalBet || isPropBet) {
      // Extract the bet outcome from pickText (e.g., "Under 0.5 (1inning)" → "Under")
      const overMatch = pickText.match(/\b(over)\b/i);
      const underMatch = pickText.match(/\b(under)\b/i);
      if (overMatch) setWinner("Over");
      else if (underMatch) setWinner("Under");
    }
  }, [pick, winner, isTotalBet, isPropBet, pickText]);

  // Export state
  const [converting, setConverting] = useState(false);
  const [postResult, setPostResult] = useState<{
    victoryPostId: string;
    imageUrl: string;
    captionEn: string;
    captionEs: string;
  } | null>(null);

  // Compositor export ref — connected via onRegisterExport callback
  const compositorExportRef = useRef<(() => string | null) | null>(null);
  const handleRegisterExport = useCallback((fn: () => string | null) => {
    compositorExportRef.current = fn;
  }, []);

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

  // Capture ticket
  const captureTicket = useCallback(async () => {
    if (!ticketRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      await document.fonts.ready;
      const blob = await toBlob(ticketRef.current, { pixelRatio: 2, quality: 1.0, cacheBust: true });
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => setTicketDataUrl(reader.result as string);
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.error("Ticket capture error:", err);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  // Upload ticket
  const handleTicketUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setTicketDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Upload additional image
  const handleAdditionalImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdditionalImages(prev => [...prev, {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dataUrl: reader.result as string,
          name: file.name,
        }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }, []);

  const removeAdditionalImage = useCallback((id: string) => {
    setAdditionalImages(prev => prev.filter(img => img.id !== id));
  }, []);

  // Convert to Post
  const handleConvertToPost = useCallback(async (compositeDataUrl: string) => {
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
  }, [pick, winner]);

  // Get export data URL from compositor
  const getExportDataUrl = useCallback((): string | null => {
    return compositorExportRef.current ? compositorExportRef.current() : null;
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>;
  if (error || !pick) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <p className="text-gray-500">{error || "Pick not found"}</p>
        <button onClick={() => router.back()} className="mt-4 cursor-pointer text-blue-600 hover:underline">Go back</button>
      </div>
    );
  }

  // Setup readiness indicators
  const hasTicket = !!ticketDataUrl;
  const hasBackground = !!backgroundUrl;
  const hasWinner = !!winner;
  const setupReady = hasTicket || hasBackground;

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-3">
        <button onClick={() => router.back()} className="mb-1 inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-blue-600">
          <ArrowLeft className="h-3 w-3" /> Back to Pick
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-blue-600">Victory Post Editor</span>
            </h1>
            <p className="text-xs text-gray-500">
              {pick.sport} | {pick.matchup} | {pick.pickText} <span className="font-medium text-green-600">WIN</span>
            </p>
          </div>
          {/* Status badges */}
          <div className="flex items-center gap-2">
            {hasTicket && <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"><CheckCircle className="h-3 w-3" /> Ticket</span>}
            {hasBackground && <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"><CheckCircle className="h-3 w-3" /> Background</span>}
            {hasWinner && <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Winner: {winner}</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const disabled = tab.id === "editor" && !setupReady;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => !disabled && setActiveTab(tab.id)}
                disabled={disabled}
                className={cn(
                  "flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-b-2 border-blue-600 bg-blue-50 text-blue-700"
                    : disabled
                    ? "cursor-not-allowed text-gray-300"
                    : "cursor-pointer text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === "editor" && !setupReady && (
                  <span className="text-[10px] text-gray-400">(add ticket or background)</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {/* ═══ TAB 1: SETUP ═══ */}
        <div className={activeTab === "setup" ? "mx-auto max-w-4xl space-y-6 p-6" : "hidden"}>
            {/* Winner */}
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="text-sm font-medium text-amber-800">
                {isTotalBet || isPropBet ? "Outcome:" : "Winner:"}
              </span>
              <select value={winner} onChange={(e) => setWinner(e.target.value)} className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm text-amber-800">
                <option value="">Select{isTotalBet || isPropBet ? " outcome" : " winner"}...</option>
                {isTotalBet || isPropBet ? (
                  <>
                    <option value="Over">Over ✅</option>
                    <option value="Under">Under ✅</option>
                  </>
                ) : (
                  <>
                    {team1 && <option value={team1}>{team1}</option>}
                    {team2 && <option value={team2}>{team2}</option>}
                  </>
                )}
              </select>
              {(isTotalBet || isPropBet) && (
                <span className="text-xs text-amber-600">({pickText})</span>
              )}
            </div>

            {/* Ticket Section */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
                <Ticket className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">Ticket</span>
                {hasTicket && <CheckCircle className="h-4 w-4 text-green-500" />}
              </div>
              <div className="p-5">
                {/* Toggle: create or upload */}
                <div className="mb-4 flex gap-2">
                  <button type="button" onClick={() => setUploadMode(false)} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", !uploadMode ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50")}>
                    Create Ticket
                  </button>
                  <button type="button" onClick={() => setUploadMode(true)} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", uploadMode ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50")}>
                    Upload PNG
                  </button>
                </div>

                {uploadMode ? (
                  <label className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition-all hover:border-blue-400 hover:bg-blue-50/30">
                    <Upload className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">Drop ticket PNG here or click to upload</p>
                    <input type="file" accept="image/*" className="hidden" onChange={handleTicketUpload} />
                  </label>
                ) : (
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_auto]">
                    <div className="max-h-[500px] overflow-y-auto pr-2">
                      <TicketForm data={formData} onChange={setFormData} />
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <div style={{ width: 885 * 0.5, height: 620 * 0.5, flexShrink: 0 }}>
                        <div className="shadow-lg" style={{ width: 885, height: 620, transform: "scale(0.5)", transformOrigin: "top left", borderRadius: 15, overflow: "hidden" }}>
                          <TicketCanvas ref={ticketRef} data={formData} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={captureTicket}
                        disabled={isCapturing}
                        className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50"
                      >
                        {isCapturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        {isCapturing ? "Capturing..." : "Use This Ticket"}
                      </button>
                    </div>
                  </div>
                )}

                {hasTicket && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
                    <img src={ticketDataUrl!} alt="Captured ticket" className="h-16 rounded-lg border border-gray-200" />
                    <div>
                      <p className="text-sm font-medium text-green-700">Ticket ready</p>
                      <p className="text-xs text-gray-500">Available as a layer in the editor</p>
                    </div>
                    <button type="button" onClick={() => setTicketDataUrl(null)} className="ml-auto cursor-pointer text-xs text-gray-400 hover:text-red-500">Clear</button>
                  </div>
                )}
              </div>
            </div>

            {/* Background Section */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
                <ImageIcon className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">Background</span>
                {hasBackground && <CheckCircle className="h-4 w-4 text-green-500" />}
              </div>
              <div className="p-5">
                <BackgroundManager sport={pick.sport} team={winner || team1} onSelect={setBackgroundUrl} />
                {hasBackground && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
                    <img src={backgroundUrl!} alt="Background" className="h-16 rounded-lg border border-gray-200 object-cover" />
                    <p className="text-sm font-medium text-green-700">Background ready</p>
                    <button type="button" onClick={() => setBackgroundUrl(null)} className="ml-auto cursor-pointer text-xs text-gray-400 hover:text-red-500">Clear</button>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Images Section */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
                <Plus className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">Additional Images</span>
                <span className="text-xs text-gray-400">(optional — player photos, logos, etc.)</span>
              </div>
              <div className="p-5">
                <label className="mb-4 block cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-6 text-center transition-all hover:border-blue-400 hover:bg-blue-50/30">
                  <Upload className="mx-auto mb-1 h-6 w-6 text-gray-300" />
                  <p className="text-sm text-gray-500">Upload images to use as layers</p>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleAdditionalImageUpload} />
                </label>
                {additionalImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {additionalImages.map(img => (
                      <div key={img.id} className="group relative overflow-hidden rounded-lg border border-gray-200">
                        <img src={img.dataUrl} alt={img.name} className="h-24 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAdditionalImage(img.id)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <p className="truncate px-2 py-1 text-[10px] text-gray-500">{img.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Continue to Editor button */}
            {setupReady && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setActiveTab("editor")}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
                >
                  <Layers className="h-4 w-4" /> Open Editor →
                </button>
              </div>
            )}
        </div>

        {/* ═══ TAB 2: EDITOR (always mounted, CSS hidden to preserve state) ═══ */}
        <div className={activeTab === "editor" ? "h-full" : "hidden"}>
          {!hasWinner && activeTab === "editor" && (
            <div className="mx-auto mb-0 flex max-w-xl items-center gap-2 rounded-b-xl border border-t-0 border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> Select the winner team in Setup before converting to post.
            </div>
          )}
          {setupReady && (
            <VictoryCompositor
              backgroundUrl={backgroundUrl}
              ticketDataUrl={ticketDataUrl}
              additionalImages={additionalImages}
              sport={pick.sport}
              tier={(pick.tier as "free" | "vip") || "free"}
              onExport={handleConvertToPost}
              onRegisterExport={handleRegisterExport}
            />
          )}
        </div>

        {/* ═══ TAB 3: CAPTION & EXPORT ═══ */}
        <div className={activeTab === "caption" ? "" : "hidden"}>
          <CaptionExport
            pick={pick}
            winner={winner}
            getExportDataUrl={getExportDataUrl}
            onConvertToPost={handleConvertToPost}
            postResult={postResult}
            converting={converting}
          />
        </div>
      </div>
    </div>
  );
}
