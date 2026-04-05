"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Download, Send, Loader2 } from "lucide-react";

// Instagram 3:4 feed post dimensions
const CANVAS_W = 1080;
const CANVAS_H = 1440;

const VIP_LABELS = ["VIP PICK HIT", "LA EXCLUSIVA", "VIP WINNER", "EXCLUSIVE VIP PLAY"];
const FREE_LABELS = ["FREE {SPORT} PICKS", "PICKS DE {SPORT}", "FREE PICK WINNER"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface VictoryCompositorProps {
  backgroundUrl: string | null;
  ticketDataUrl: string | null;
  sport: string;
  tier: "free" | "vip";
  onExport: (dataUrl: string) => void;
}

function useLoadImage(url: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) { setImg(null); return; }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);
    image.src = url;
    return () => { image.onload = null; image.onerror = null; };
  }, [url]);
  return img;
}

export default function VictoryCompositor({
  backgroundUrl,
  ticketDataUrl,
  sport,
  tier,
  onExport,
}: VictoryCompositorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImage = useLoadImage(backgroundUrl);
  const ticketImage = useLoadImage(ticketDataUrl);

  // Controls
  const [bgOpacity, setBgOpacity] = useState(100);
  const [gradientStrength, setGradientStrength] = useState(70);
  const [ticketScale, setTicketScale] = useState(50);
  const [ticketX, setTicketX] = useState(50); // percentage from left
  const [ticketY, setTicketY] = useState(8);  // percentage from top
  const [labelText, setLabelText] = useState(() => {
    const template = tier === "vip" ? pickRandom(VIP_LABELS) : pickRandom(FREE_LABELS);
    return template.replace("{SPORT}", sport.toUpperCase());
  });
  const [showBranding, setShowBranding] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Dragging state
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // 1. Background
    if (bgImage) {
      ctx.globalAlpha = bgOpacity / 100;
      // Cover fill
      const imgRatio = bgImage.width / bgImage.height;
      const canvasRatio = CANVAS_W / CANVAS_H;
      let sx = 0, sy = 0, sw = bgImage.width, sh = bgImage.height;
      if (imgRatio > canvasRatio) {
        sw = bgImage.height * canvasRatio;
        sx = (bgImage.width - sw) / 2;
      } else {
        sh = bgImage.width / canvasRatio;
        sy = (bgImage.height - sh) / 2;
      }
      ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = "#0B1F3B";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // 2. Gradient overlay
    if (gradientStrength > 0) {
      const grad = ctx.createLinearGradient(0, CANVAS_H * 0.4, 0, CANVAS_H);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.6, `rgba(0,0,0,${gradientStrength / 200})`);
      grad.addColorStop(1, `rgba(0,0,0,${gradientStrength / 100})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // 3. Ticket
    if (ticketImage) {
      const scale = ticketScale / 100;
      const tw = ticketImage.width * scale;
      const th = ticketImage.height * scale;
      const tx = (CANVAS_W * ticketX / 100) - tw / 2;
      const ty = CANVAS_H * ticketY / 100;
      ctx.drawImage(ticketImage, tx, ty, tw, th);
    }

    // 4. Label text
    if (labelText) {
      ctx.save();
      ctx.font = "bold 72px 'Oswald', 'Impact', 'Arial Black', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.letterSpacing = "3px";
      ctx.fillText(labelText, CANVAS_W / 2, CANVAS_H - 200);
      ctx.restore();
    }

    // 5. Branding
    if (showBranding) {
      ctx.save();
      ctx.font = "bold 28px 'Oswald', 'Impact', 'Arial Black', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.letterSpacing = "6px";
      ctx.fillText("WINFACTPICKS.COM", CANVAS_W / 2, CANVAS_H - 60);
      ctx.restore();
    }
  }, [bgImage, ticketImage, bgOpacity, gradientStrength, ticketScale, ticketX, ticketY, labelText, showBranding]);

  // Redraw on any change
  useEffect(() => { draw(); }, [draw]);

  // Mouse drag for ticket position
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    dragStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const displayScale = rect.width / CANVAS_W;
    const x = (e.clientX - rect.left) / rect.width * 100;
    const y = (e.clientY - rect.top) / rect.height * 100;
    setTicketX(Math.max(10, Math.min(90, x)));
    setTicketY(Math.max(0, Math.min(70, y)));
  }, [dragging]);

  const handleMouseUp = useCallback(() => { setDragging(false); }, []);

  // Export
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `victory-post-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const handleConvertToPost = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setExporting(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      onExport(dataUrl);
    } finally {
      setExporting(false);
    }
  }, [onExport]);

  const displayWidth = Math.min(540, typeof window !== "undefined" ? window.innerWidth - 80 : 540);
  const displayHeight = displayWidth * (CANVAS_H / CANVAS_W);

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="rounded-xl border border-gray-200 shadow-lg cursor-move"
          style={{ width: displayWidth, height: displayHeight }}
        />
      </div>

      <p className="text-xs text-center text-gray-400">Click and drag on the canvas to reposition the ticket</p>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <Slider label="Background Opacity" value={bgOpacity} min={0} max={100} onChange={setBgOpacity} />
        <Slider label="Gradient Strength" value={gradientStrength} min={0} max={100} onChange={setGradientStrength} />
        <Slider label="Ticket Scale" value={ticketScale} min={20} max={100} onChange={setTicketScale} />
        <Slider label="Ticket Position X" value={ticketX} min={10} max={90} onChange={setTicketX} />

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Label Text</label>
          <input
            type="text"
            value={labelText}
            onChange={(e) => setLabelText(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={showBranding} onChange={(e) => setShowBranding(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary" />
          Show Branding
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-primary text-primary text-sm font-semibold hover:bg-primary hover:text-white transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" /> Download PNG
        </button>
        <button
          type="button"
          onClick={handleConvertToPost}
          disabled={exporting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {exporting ? "Exporting..." : "Convert to Post →"}
        </button>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs tabular-nums text-gray-500">{value}%</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary" />
    </div>
  );
}
