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

// Konva must be loaded client-side only (uses window)
const VictoryCompositor = dynamic(
  () => import("@/components/admin/victory-editor/victory-compositor").then((m) => m.VictoryCompositor),
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

type Step = "ticket" | "background" | "compose";

export default function VictoryPostEditorPage() {
  const params = useParams();
  const router = useRouter();
  const pickId = params.id as string;

  const [pick, setPick] = useState<Pick | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("ticket");

  // Ticket state
  const [ticketDataUrl, setTicketDataUrl] = useState<string | null>(null);
  const ticketCanvasRef = useRef<HTMLDivElement>(null);

  // Ticket form fields (auto-populated from pick, editable)
  const [sport, setSport] = useState("");
  const [pickText, setPickText] = useState("");
  const [odds, setOdds] = useState("");
  const [wager, setWager] = useState("100");
  const [matchup, setMatchup] = useState("");
  const [winner, setWinner] = useState("");
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");

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

  // Teams extracted from matchup
  const teams = matchup.split(/\s+(?:vs\.?|@|at|v)\s+/i).map((t) => t.trim());
  const team1 = teams[0] || "";
  const team2 = teams[1] || "";

  // Fetch pick data
  useEffect(() => {
    async function fetchPick() {
      try {
        const res = await fetch(`/api/admin/picks?tab=all`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const allPicks = Array.isArray(data) ? data : data.picks || [];
        const found = allPicks.find((p: Pick) => p.id === pickId);
        if (!found) {
          setError("Pick not found");
          return;
        }
        if (found.result !== "win") {
          setError("Victory posts can only be created for winning picks");
          return;
        }
        setPick(found);
        setSport(found.sport);
        setPickText(found.pickText);
        setOdds(found.odds != null ? String(found.odds) : "");
        setWager(String((found.units || 1) * 100));
        setMatchup(found.matchup);
      } catch {
        setError("Failed to load pick data");
      } finally {
        setLoading(false);
      }
    }
    fetchPick();
  }, [pickId]);

  // Generate ticket as canvas image
  const generateTicket = useCallback(async () => {
    // Build a simple ticket as an HTML canvas
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate payout
    const oddsNum = parseInt(odds) || 0;
    const wagerNum = parseFloat(wager) || 100;
    let payout = wagerNum;
    if (oddsNum >= 0) payout = wagerNum + wagerNum * (oddsNum / 100);
    else payout = wagerNum + wagerNum * (100 / Math.abs(oddsNum));

    // Background gradient (green)
    const grad = ctx.createLinearGradient(0, 0, 0, 500);
    grad.addColorStop(0, "#05D17A");
    grad.addColorStop(1, "#04B568");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, 800, 500, 24);
    ctx.fill();

    // Header bar
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, 800, 80);

    // Sport label
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
    ctx.fillText(sport.toUpperCase(), 30, 52);

    // WIN badge
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.roundRect(640, 18, 130, 44, 10);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("WIN \u2713", 705, 48);

    // Pick text (large)
    ctx.textAlign = "center";
    ctx.font = "bold 38px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(pickText, 400, 155);

    // Odds
    ctx.font = "24px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const oddsDisplay = oddsNum >= 0 ? `+${oddsNum}` : `${oddsNum}`;
    ctx.fillText(oddsDisplay, 400, 200);

    // Matchup
    ctx.font = "20px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(matchup, 400, 245);

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 275);
    ctx.lineTo(740, 275);
    ctx.stroke();

    // Score section (if provided)
    let bottomY = 380;
    if (team1Score && team2Score) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.roundRect(100, 295, 600, 60, 12);
      ctx.fill();

      ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "right";
      ctx.fillText(team1, 250, 332);

      ctx.textAlign = "center";
      ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#FFD700";
      ctx.fillText(team1Score, 310, 332);

      ctx.font = "14px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("FINAL", 400, 332);

      ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#FFD700";
      ctx.fillText(team2Score, 490, 332);

      ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(team2, 540, 332);

      bottomY = 420;
    }

    // Wager
    ctx.textAlign = "left";
    ctx.font = "18px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("WAGER", 60, bottomY);
    ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`$${wagerNum.toFixed(0)}`, 60, bottomY + 30);

    // Payout
    ctx.textAlign = "right";
    ctx.font = "18px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("PAYOUT", 740, bottomY);
    ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`$${payout.toFixed(2)}`, 740, bottomY + 30);

    // Watermark
    ctx.textAlign = "center";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText("WINFACT PICKS", 400, 488);

    setTicketDataUrl(canvas.toDataURL("image/png"));
  }, [sport, pickText, odds, wager, matchup, team1, team2, team1Score, team2Score]);

  // Auto-generate ticket when fields change
  useEffect(() => {
    if (pick) generateTicket();
  }, [pick, generateTicket]);

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
          sport,
          matchup,
          pickText,
          odds: parseInt(odds) || null,
          units: pick.units,
          tier: pick.tier || "free",
          winner,
          team1Score: team1Score ? parseInt(team1Score) : undefined,
          team2Score: team2Score ? parseInt(team2Score) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create victory post");
      setPostResult(data);
      setStep("compose"); // Stay on compose to show result
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
        <button onClick={() => router.back()} className="mt-4 text-primary hover:underline cursor-pointer">
          Go back
        </button>
      </div>
    );
  }

  const steps: { key: Step; icon: typeof Ticket; label: string }[] = [
    { key: "ticket", icon: Ticket, label: "Ticket" },
    { key: "background", icon: ImageIcon, label: "Background" },
    { key: "compose", icon: Layers, label: "Compose" },
  ];

  const inputClass = "w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all";

  return (
    <div className="space-y-6 animate-fade-up max-w-5xl">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-3 cursor-pointer"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Pick
        </button>
        <h1 className="font-heading font-bold text-2xl tracking-tight">
          <span className="text-primary">Victory Post Editor</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {pick.sport} | {pick.matchup} | {pick.pickText} <span className="text-success font-medium">WIN</span>
        </p>
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
            <span className="hidden sm:inline">{s.label}</span>
            {i < steps.length - 1 && <span className="text-gray-300 ml-2">/</span>}
          </button>
        ))}
      </div>

      {/* ─── STEP 1: TICKET ─────────────────────────── */}
      {step === "ticket" && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Ticket Details
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sport</label>
                    <select value={sport} onChange={(e) => setSport(e.target.value)} className={inputClass}>
                      {["MLB", "NFL", "NBA", "NHL", "Soccer", "NCAA"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Winner</label>
                    <select value={winner} onChange={(e) => setWinner(e.target.value)} className={inputClass}>
                      <option value="">Select winner...</option>
                      {team1 && <option value={team1}>{team1}</option>}
                      {team2 && <option value={team2}>{team2}</option>}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Pick Text</label>
                  <input value={pickText} onChange={(e) => setPickText(e.target.value)} className={inputClass} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Matchup</label>
                  <input value={matchup} onChange={(e) => setMatchup(e.target.value)} className={inputClass} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Odds</label>
                    <input type="number" value={odds} onChange={(e) => setOdds(e.target.value)} className={`${inputClass} font-mono`} placeholder="-110" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Wager ($)</label>
                    <input type="number" value={wager} onChange={(e) => setWager(e.target.value)} className={`${inputClass} font-mono`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{team1 || "Team 1"} Score</label>
                    <input type="number" value={team1Score} onChange={(e) => setTeam1Score(e.target.value)} className={`${inputClass} font-mono`} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{team2 || "Team 2"} Score</label>
                    <input type="number" value={team2Score} onChange={(e) => setTeam2Score(e.target.value)} className={`${inputClass} font-mono`} placeholder="Optional" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={generateTicket}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg transition-all cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    Regenerate Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("background")}
                    disabled={!ticketDataUrl}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Next: Background
                  </button>
                </div>
              </div>

              {/* Ticket Preview */}
              <div className="flex flex-col items-center">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Preview</p>
                {ticketDataUrl ? (
                  <img
                    src={ticketDataUrl}
                    alt="Ticket preview"
                    className="max-w-full rounded-2xl shadow-lg border border-gray-200"
                    style={{ maxHeight: 400 }}
                  />
                ) : (
                  <div className="w-full aspect-[8/5] bg-gray-100 rounded-2xl flex items-center justify-center">
                    <Ticket className="h-10 w-10 text-gray-300" />
                  </div>
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

            <BackgroundManager
              sport={sport}
              team={winner || team1}
              onSelect={(url) => {
                setBackgroundUrl(url);
                setStep("compose");
              }}
            />

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setStep("ticket")}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 cursor-pointer"
              >
                Back: Ticket
              </button>
              {backgroundUrl && (
                <button
                  type="button"
                  onClick={() => setStep("compose")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg transition-all cursor-pointer"
                >
                  Next: Compose
                </button>
              )}
            </div>
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
                  Please select the winner team in Step 1 before converting to post.
                </div>
              )}

              <VictoryCompositor
                backgroundUrl={backgroundUrl}
                ticketDataUrl={ticketDataUrl}
                sport={sport}
                tier={(pick.tier as "free" | "vip") || "free"}
                onExport={handleConvertToPost}
              />

              {converting && (
                <div className="mt-4 flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-primary">Creating victory post...</p>
                    <p className="text-xs text-gray-500">Uploading image, generating captions, sending to Telegram</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── STEP 4: CAPTIONS (after Convert to Post) ── */}
          {postResult && (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-5 w-5" />
                  <h2 className="font-semibold">Victory Post Created</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Image preview */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Image</p>
                    <img
                      src={postResult.imageUrl}
                      alt="Victory post"
                      className="w-full rounded-xl border border-gray-200"
                    />
                    <a
                      href={postResult.imageUrl}
                      download
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Download className="h-3 w-3" />
                      Download full size
                    </a>
                  </div>

                  {/* Captions */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">English Caption</p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(postResult.captionEn)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{postResult.captionEn}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Spanish Caption</p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(postResult.captionEs)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{postResult.captionEs}</p>
                      </div>
                    </div>

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
