"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Download,
  Send,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────
const CANVAS_W = 1080;
const CANVAS_H = 1440;
const HANDLE_SIZE = 10;
const SNAP_THRESHOLD = 10;
const CENTER_X = CANVAS_W / 2;
const CENTER_Y = CANVAS_H / 2;
const MIN_SIZE = 50;

const VIP_LABELS = ["VIP PICK HIT", "VIP WINNER", "EXCLUSIVE VIP PLAY"];
const FREE_LABELS = ["FREE {SPORT} PICKS", "FREE PICK WINNER"];
const COLOR_SWATCHES = ["#FFFFFF", "#0BC4D9", "#0B1F3B", "#FFD700", "#000000"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Types ──────────────────────────────────────────────────────────────────────
type LayerType = "background" | "gradient" | "ticket" | "text" | "watermark";

interface EditorLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageElement?: HTMLImageElement;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fillColor?: string;
  textAlign?: CanvasTextAlign;
  gradientOpacity?: number;
  blur?: number;
}

type HandlePosition =
  | "tl" | "tc" | "tr"
  | "ml" | "mr"
  | "bl" | "bc" | "br";

interface DragState {
  type: "move" | "resize";
  layerId: string;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  handle?: HandlePosition;
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface VictoryCompositorProps {
  backgroundUrl: string | null;
  ticketDataUrl: string | null;
  sport: string;
  tier: "free" | "vip";
  onExport: (dataUrl: string) => void;
}

// ── Image loader hook ──────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function getHandleRects(layer: EditorLayer): Record<HandlePosition, { x: number; y: number; w: number; h: number }> {
  const { x, y, width: w, height: h } = layer;
  const s = HANDLE_SIZE;
  const hs = s / 2;
  return {
    tl: { x: x - hs, y: y - hs, w: s, h: s },
    tc: { x: x + w / 2 - hs, y: y - hs, w: s, h: s },
    tr: { x: x + w - hs, y: y - hs, w: s, h: s },
    ml: { x: x - hs, y: y + h / 2 - hs, w: s, h: s },
    mr: { x: x + w - hs, y: y + h / 2 - hs, w: s, h: s },
    bl: { x: x - hs, y: y + h - hs, w: s, h: s },
    bc: { x: x + w / 2 - hs, y: y + h - hs, w: s, h: s },
    br: { x: x + w - hs, y: y + h - hs, w: s, h: s },
  };
}

function handleCursor(handle: HandlePosition): string {
  const map: Record<HandlePosition, string> = {
    tl: "nwse-resize", tr: "nesw-resize", bl: "nesw-resize", br: "nwse-resize",
    tc: "ns-resize", bc: "ns-resize", ml: "ew-resize", mr: "ew-resize",
  };
  return map[handle];
}

function isCornerHandle(h: HandlePosition): boolean {
  return h === "tl" || h === "tr" || h === "bl" || h === "br";
}

function pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

// ── Cover-fit drawing ──────────────────────────────────────────────────────────
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
) {
  const imgRatio = img.width / img.height;
  const destRatio = dw / dh;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > destRatio) {
    sw = img.height * destRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / destRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function VictoryCompositor({
  backgroundUrl,
  ticketDataUrl,
  sport,
  tier,
  onExport,
}: VictoryCompositorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgImage = useLoadImage(backgroundUrl);
  const ticketImage = useLoadImage(ticketDataUrl);

  const [scale, setScale] = useState(0.35);
  const [userZoom, setUserZoom] = useState<number | null>(null); // null = auto-fit
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [snapX, setSnapX] = useState(false);
  const [snapY, setSnapY] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Initial label
  const [initialLabel] = useState(() => {
    const template = tier === "vip" ? pickRandom(VIP_LABELS) : pickRandom(FREE_LABELS);
    return template.replace("{SPORT}", sport.toUpperCase());
  });

  const [layers, setLayers] = useState<EditorLayer[]>(() => [
    {
      id: "bg", type: "background", name: "Background", visible: true, locked: true,
      opacity: 1, x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, blur: 0,
    },
    {
      id: "gradient", type: "gradient", name: "Gradient Overlay", visible: true, locked: true,
      opacity: 1, x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, gradientOpacity: 0.6,
    },
    {
      id: "ticket", type: "ticket", name: "Ticket", visible: true, locked: false,
      opacity: 1, x: CANVAS_W * 0.25, y: 60, width: CANVAS_W * 0.5, height: 600,
    },
    {
      id: "label", type: "text", name: "Label", visible: true, locked: false,
      opacity: 1, x: 100, y: CANVAS_H - 280, width: CANVAS_W - 200, height: 100,
      text: initialLabel, fontSize: 72, fontFamily: "Impact, 'Arial Black', sans-serif",
      fontWeight: "bold", fillColor: "#FFFFFF", textAlign: "center" as CanvasTextAlign,
    },
    {
      id: "branding", type: "watermark", name: "Branding", visible: true, locked: false,
      opacity: 0.4, x: 200, y: CANVAS_H - 90, width: CANVAS_W - 400, height: 50,
      text: "WINFACTPICKS.COM", fontSize: 28, fontFamily: "Impact, 'Arial Black', sans-serif",
      fontWeight: "bold", fillColor: "#FFFFFF", textAlign: "center" as CanvasTextAlign,
    },
  ]);

  // Sync loaded images into layers
  useEffect(() => {
    setLayers(prev => prev.map(l => l.id === "bg" ? { ...l, imageElement: bgImage ?? undefined } : l));
  }, [bgImage]);

  useEffect(() => {
    if (!ticketImage) return;
    const tw = CANVAS_W * 0.5;
    const ratio = ticketImage.height / ticketImage.width;
    const th = tw * ratio;
    setLayers(prev => prev.map(l =>
      l.id === "ticket" ? { ...l, imageElement: ticketImage, width: tw, height: th, x: (CANVAS_W - tw) / 2 } : l
    ));
  }, [ticketImage]);

  // Auto-fit scale based on container size (both width AND height)
  const [fitScale, setFitScale] = useState(0.35);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cw = entry.contentRect.width - 24; // padding
        const ch = entry.contentRect.height - 24;
        const scaleW = cw / CANVAS_W;
        const scaleH = ch / CANVAS_H;
        const fit = Math.min(scaleW, scaleH, 0.65); // cap at 65% to always look manageable
        setFitScale(fit);
        if (userZoom === null) setScale(fit);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [userZoom]);

  // Layer helpers
  const updateLayer = useCallback((id: string, patch: Partial<EditorLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }, []);

  const selectedLayer = layers.find(l => l.id === selectedId) ?? null;

  // ── Drawing ────────────────────────────────────────────────────────────────
  const renderToCtx = useCallback((ctx: CanvasRenderingContext2D, showUI: boolean) => {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;

      if (layer.type === "background") {
        if (layer.imageElement) {
          if (layer.blur && layer.blur > 0) {
            ctx.filter = `blur(${layer.blur}px)`;
          }
          drawCoverImage(ctx, layer.imageElement, 0, 0, CANVAS_W, CANVAS_H);
          ctx.filter = "none";
        } else {
          ctx.fillStyle = "#0B1F3B";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.globalAlpha = 0.3;
          ctx.font = "bold 36px Arial";
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.fillText("Upload a background image", CENTER_X, CENTER_Y);
        }
      } else if (layer.type === "gradient") {
        const go = layer.gradientOpacity ?? 0.6;
        const grad = ctx.createLinearGradient(0, CENTER_Y, 0, CANVAS_H);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(0,0,0,${go})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      } else if (layer.type === "ticket") {
        if (layer.imageElement) {
          ctx.drawImage(layer.imageElement, layer.x, layer.y, layer.width, layer.height);
        }
      } else if (layer.type === "text" || layer.type === "watermark") {
        if (layer.text) {
          ctx.font = `${layer.fontWeight ?? "bold"} ${layer.fontSize ?? 48}px ${layer.fontFamily ?? "Arial"}`;
          ctx.textAlign = layer.textAlign ?? "center";
          ctx.fillStyle = layer.fillColor ?? "#FFFFFF";
          if (layer.type === "text") {
            ctx.shadowColor = "rgba(0,0,0,0.6)";
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
          }
          const tx = layer.textAlign === "center" ? layer.x + layer.width / 2
            : layer.textAlign === "right" ? layer.x + layer.width : layer.x;
          const ty = layer.y + (layer.fontSize ?? 48);
          ctx.fillText(layer.text, tx, ty, layer.width);
        }
      }
      ctx.restore();
    }

    // Selection UI
    if (showUI && selectedId) {
      const sel = layers.find(l => l.id === selectedId);
      if (sel && !sel.locked) {
        ctx.save();
        ctx.strokeStyle = "#1168D9";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);
        ctx.setLineDash([]);

        // Handles
        const handles = getHandleRects(sel);
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#1168D9";
        ctx.lineWidth = 1.5;
        for (const key of Object.keys(handles) as HandlePosition[]) {
          const r = handles[key];
          ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.strokeRect(r.x, r.y, r.w, r.h);
        }
        ctx.restore();
      }
    }

    // Snap guides
    if (showUI && (snapX || snapY)) {
      ctx.save();
      ctx.strokeStyle = "#0BC4D9";
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 6]);
      if (snapX) {
        ctx.beginPath();
        ctx.moveTo(CENTER_X, 0);
        ctx.lineTo(CENTER_X, CANVAS_H);
        ctx.stroke();
      }
      if (snapY) {
        ctx.beginPath();
        ctx.moveTo(0, CENTER_Y);
        ctx.lineTo(CANVAS_W, CENTER_Y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [layers, selectedId, snapX, snapY]);

  // Redraw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    const displayW = Math.round(CANVAS_W * scale);
    const displayH = Math.round(CANVAS_H * scale);
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    canvas.width = Math.round(CANVAS_W * dpr);
    canvas.height = Math.round(CANVAS_H * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    renderToCtx(ctx, true);
  }, [renderToCtx, scale]);

  // ── Mouse coordinate conversion ───────────────────────────────────────────
  const toCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }, []);

  // ── Hit testing ────────────────────────────────────────────────────────────
  const hitTestHandle = useCallback((mx: number, my: number): { layerId: string; handle: HandlePosition } | null => {
    if (!selectedId) return null;
    const sel = layers.find(l => l.id === selectedId);
    if (!sel || sel.locked) return null;
    const handles = getHandleRects(sel);
    // Increase hit area slightly
    const pad = 4;
    for (const key of (Object.keys(handles) as HandlePosition[]).reverse()) {
      const r = handles[key];
      if (pointInRect(mx, my, r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2)) {
        return { layerId: sel.id, handle: key };
      }
    }
    return null;
  }, [layers, selectedId]);

  const hitTestLayer = useCallback((mx: number, my: number): EditorLayer | null => {
    // Top-most first (reverse order)
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (!l.visible || l.locked) continue;
      if (pointInRect(mx, my, l.x, l.y, l.width, l.height)) return l;
    }
    return null;
  }, [layers]);

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvasCoords(e);

    // Check handle first
    const handleHit = hitTestHandle(x, y);
    if (handleHit) {
      const layer = layers.find(l => l.id === handleHit.layerId)!;
      setDragState({
        type: "resize", layerId: layer.id, handle: handleHit.handle,
        startMouseX: x, startMouseY: y,
        startX: layer.x, startY: layer.y, startW: layer.width, startH: layer.height,
      });
      return;
    }

    // Check layer hit
    const hit = hitTestLayer(x, y);
    if (hit) {
      setSelectedId(hit.id);
      setDragState({
        type: "move", layerId: hit.id,
        startMouseX: x, startMouseY: y,
        startX: hit.x, startY: hit.y, startW: hit.width, startH: hit.height,
      });
    } else {
      setSelectedId(null);
    }
  }, [toCanvasCoords, hitTestHandle, hitTestLayer, layers]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvasCoords(e);

    if (!dragState) {
      // Update cursor
      const canvas = canvasRef.current;
      if (!canvas) return;
      const handleHit = hitTestHandle(x, y);
      if (handleHit) {
        canvas.style.cursor = handleCursor(handleHit.handle);
        return;
      }
      const layerHit = hitTestLayer(x, y);
      canvas.style.cursor = layerHit ? "move" : "default";
      return;
    }

    const dx = x - dragState.startMouseX;
    const dy = y - dragState.startMouseY;

    if (dragState.type === "move") {
      let newX = dragState.startX + dx;
      let newY = dragState.startY + dy;
      const layer = layers.find(l => l.id === dragState.layerId);
      if (!layer) return;

      // Snap to center
      const layerCX = newX + layer.width / 2;
      const layerCY = newY + layer.height / 2;
      const snappedX = Math.abs(layerCX - CENTER_X) < SNAP_THRESHOLD;
      const snappedY = Math.abs(layerCY - CENTER_Y) < SNAP_THRESHOLD;
      if (snappedX) newX = CENTER_X - layer.width / 2;
      if (snappedY) newY = CENTER_Y - layer.height / 2;
      setSnapX(snappedX);
      setSnapY(snappedY);
      updateLayer(dragState.layerId, { x: newX, y: newY });
    } else if (dragState.type === "resize") {
      const h = dragState.handle!;
      let newX = dragState.startX;
      let newY = dragState.startY;
      let newW = dragState.startW;
      let newH = dragState.startH;
      const aspect = dragState.startW / dragState.startH;

      if (isCornerHandle(h)) {
        // Aspect-ratio locked for corners
        if (h === "br") {
          newW = Math.max(MIN_SIZE, dragState.startW + dx);
          newH = newW / aspect;
        } else if (h === "bl") {
          newW = Math.max(MIN_SIZE, dragState.startW - dx);
          newH = newW / aspect;
          newX = dragState.startX + dragState.startW - newW;
        } else if (h === "tr") {
          newW = Math.max(MIN_SIZE, dragState.startW + dx);
          newH = newW / aspect;
          newY = dragState.startY + dragState.startH - newH;
        } else if (h === "tl") {
          newW = Math.max(MIN_SIZE, dragState.startW - dx);
          newH = newW / aspect;
          newX = dragState.startX + dragState.startW - newW;
          newY = dragState.startY + dragState.startH - newH;
        }
      } else {
        // Free resize for edge handles
        if (h === "mr") newW = Math.max(MIN_SIZE, dragState.startW + dx);
        else if (h === "ml") {
          newW = Math.max(MIN_SIZE, dragState.startW - dx);
          newX = dragState.startX + dragState.startW - newW;
        } else if (h === "bc") newH = Math.max(MIN_SIZE, dragState.startH + dy);
        else if (h === "tc") {
          newH = Math.max(MIN_SIZE, dragState.startH - dy);
          newY = dragState.startY + dragState.startH - newH;
        }
      }
      setSnapX(false);
      setSnapY(false);
      updateLayer(dragState.layerId, { x: newX, y: newY, width: newW, height: newH });
    }
  }, [toCanvasCoords, dragState, layers, hitTestHandle, hitTestLayer, updateLayer]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setSnapX(false);
    setSnapY(false);
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const sel = layers.find(l => l.id === selectedId);
      if (!sel || sel.locked) return;

      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !["bg", "gradient", "ticket", "label", "branding"].includes(sel.id)) {
        // Only delete custom text layers
        setLayers(prev => prev.filter(l => l.id !== selectedId));
        setSelectedId(null);
        e.preventDefault();
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") { updateLayer(selectedId, { x: sel.x - step }); e.preventDefault(); }
      else if (e.key === "ArrowRight") { updateLayer(selectedId, { x: sel.x + step }); e.preventDefault(); }
      else if (e.key === "ArrowUp") { updateLayer(selectedId, { y: sel.y - step }); e.preventDefault(); }
      else if (e.key === "ArrowDown") { updateLayer(selectedId, { y: sel.y + step }); e.preventDefault(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, layers, updateLayer]);

  // ── Zoom controls ──────────────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    const next = Math.min((userZoom ?? scale) + 0.05, 1);
    setUserZoom(next);
    setScale(next);
  }, [userZoom, scale]);

  const zoomOut = useCallback(() => {
    const next = Math.max((userZoom ?? scale) - 0.05, 0.15);
    setUserZoom(next);
    setScale(next);
  }, [userZoom, scale]);

  const zoomFit = useCallback(() => {
    setUserZoom(null);
    setScale(fitScale);
  }, [fitScale]);

  // ── Add text layer ─────────────────────────────────────────────────────────
  const addTextLayer = useCallback(() => {
    const id = `text-${Date.now()}`;
    const newLayer: EditorLayer = {
      id, type: "text", name: `Text ${layers.filter(l => l.type === "text").length + 1}`,
      visible: true, locked: false, opacity: 1,
      x: 140, y: CENTER_Y - 40, width: 800, height: 80,
      text: "YOUR TEXT HERE", fontSize: 56, fontFamily: "Impact, 'Arial Black', sans-serif",
      fontWeight: "bold", fillColor: "#FFFFFF", textAlign: "center",
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedId(id);
  }, [layers]);

  // ── Export functions ────────────────────────────────────────────────────────
  const renderExport = useCallback((): HTMLCanvasElement => {
    const offscreen = document.createElement("canvas");
    offscreen.width = CANVAS_W;
    offscreen.height = CANVAS_H;
    const ctx = offscreen.getContext("2d")!;
    // Temporarily clear selection for clean render
    const savedSelected = selectedId;
    // We pass showUI=false so no selection UI
    renderToCtx(ctx, false);
    return offscreen;
  }, [renderToCtx, selectedId]);

  const handleDownload = useCallback(() => {
    const offscreen = renderExport();
    offscreen.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `victory-post-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [renderExport]);

  const handleConvertToPost = useCallback(async () => {
    setExporting(true);
    try {
      const offscreen = renderExport();
      const dataUrl = offscreen.toDataURL("image/png");
      onExport(dataUrl);
    } finally {
      setExporting(false);
    }
  }, [renderExport, onExport]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const bgLayer = layers.find(l => l.id === "bg")!;
  const gradientLayer = layers.find(l => l.id === "gradient")!;

  return (
    <div className="flex flex-col gap-4 lg:flex-row" tabIndex={-1}>
      {/* LEFT SIDEBAR — Layers */}
      <div className="w-full space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:w-64 lg:shrink-0">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Layers</h3>
            <button
              type="button"
              onClick={addTextLayer}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add Text
            </button>
          </div>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {[...layers].reverse().map(layer => (
              <div
                key={layer.id}
                onClick={() => { if (!layer.locked) setSelectedId(layer.id); }}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition ${
                  selectedId === layer.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                  className="text-gray-400 hover:text-gray-600"
                  title={layer.visible ? "Hide" : "Show"}
                >
                  {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
                  className="text-gray-400 hover:text-gray-600"
                  title={layer.locked ? "Unlock" : "Lock"}
                >
                  {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </button>
                <span className="flex-1 truncate text-xs font-medium">{layer.name}</span>
                {!["bg", "gradient", "ticket", "label", "branding"].includes(layer.id) && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setLayers(prev => prev.filter(l => l.id !== layer.id));
                      if (selectedId === layer.id) setSelectedId(null);
                    }}
                    className="text-gray-400 hover:text-red-500"
                    title="Delete layer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CENTER — Canvas Viewport (height-constrained) */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Zoom toolbar */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={zoomOut} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-xs font-medium tabular-nums text-gray-600">
              {Math.round(scale * 100)}%
            </span>
            <button type="button" onClick={zoomIn} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button type="button" onClick={zoomFit} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Fit to screen">
              <Maximize className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Click layers to select. Drag to move. Handles to resize. Arrow keys to nudge.
          </p>
        </div>

        {/* Canvas container — fixed max height so it never overflows viewport */}
        <div ref={containerRef} className="flex items-center justify-center overflow-auto rounded-xl border border-gray-700 bg-gray-900 p-3" style={{ maxHeight: "calc(100vh - 200px)", minHeight: 400 }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="rounded-lg shadow-lg"
          />
        </div>

        {/* Action Buttons */}
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
            onClick={handleConvertToPost}
            disabled={exporting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {exporting ? "Exporting..." : "Convert to Post \u2192"}
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR — Properties & Controls */}
      <div className="w-full space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:w-64 lg:shrink-0">
        {/* Selected Layer Properties */}
        {selectedLayer && !selectedLayer.locked ? (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              {selectedLayer.name}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="X" value={Math.round(selectedLayer.x)}
                onChange={v => updateLayer(selectedLayer.id, { x: v })} />
              <NumberField label="Y" value={Math.round(selectedLayer.y)}
                onChange={v => updateLayer(selectedLayer.id, { y: v })} />
              <NumberField label="W" value={Math.round(selectedLayer.width)}
                onChange={v => updateLayer(selectedLayer.id, { width: Math.max(MIN_SIZE, v) })} />
              <NumberField label="H" value={Math.round(selectedLayer.height)}
                onChange={v => updateLayer(selectedLayer.id, { height: Math.max(MIN_SIZE, v) })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Opacity: {Math.round(selectedLayer.opacity * 100)}%
              </label>
              <input type="range" min={0} max={100} value={Math.round(selectedLayer.opacity * 100)}
                onChange={e => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600" />
            </div>
            {(selectedLayer.type === "text" || selectedLayer.type === "watermark") && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Text</label>
                  <input type="text" value={selectedLayer.text ?? ""}
                    onChange={e => updateLayer(selectedLayer.id, { text: e.target.value })}
                    className="flex h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Font Size</label>
                  <input type="number" min={12} max={200} value={selectedLayer.fontSize ?? 48}
                    onChange={e => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })}
                    className="flex h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Color</label>
                  <div className="flex gap-1.5">
                    {COLOR_SWATCHES.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateLayer(selectedLayer.id, { fillColor: color })}
                        className={`h-7 w-7 rounded-full border-2 transition ${
                          selectedLayer.fillColor === color ? "border-blue-500 ring-2 ring-blue-500/30" : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Select a layer to edit its properties</p>
        )}

        {/* Background Controls */}
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Background</h4>
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
              <span>Opacity</span>
              <span className="tabular-nums text-gray-400">{Math.round(bgLayer.opacity * 100)}%</span>
            </label>
            <input type="range" min={0} max={100} value={Math.round(bgLayer.opacity * 100)}
              onChange={e => updateLayer("bg", { opacity: Number(e.target.value) / 100 })}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600" />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
              <span>Blur</span>
              <span className="tabular-nums text-gray-400">{bgLayer.blur ?? 0}px</span>
            </label>
            <input type="range" min={0} max={20} value={bgLayer.blur ?? 0}
              onChange={e => updateLayer("bg", { blur: Number(e.target.value) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600" />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
              <span>Gradient</span>
              <span className="tabular-nums text-gray-400">{Math.round((gradientLayer.gradientOpacity ?? 0.6) * 100)}%</span>
            </label>
            <input type="range" min={0} max={100} value={Math.round((gradientLayer.gradientOpacity ?? 0.6) * 100)}
              onChange={e => updateLayer("gradient", { gradientOpacity: Number(e.target.value) / 100 })}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small sub-components ─────────────────────────────────────────────────────
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs tabular-nums focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
      />
    </div>
  );
}
