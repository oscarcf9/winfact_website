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
  Type,
  ImageIcon,
  Move,
  ChevronUp,
  ChevronDown,
  Copy,
  Undo2,
  Redo2,
  MousePointer,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────
const CANVAS_W = 1080;
const CANVAS_H = 1350;
const HANDLE_SIZE = 10;
const SNAP_THRESHOLD = 6;
const MIN_SIZE = 40;
const MAX_UNDO = 30;

const VIP_LABELS = ["VIP PICK HIT", "VIP WINNER", "EXCLUSIVE VIP PLAY"];
const FREE_LABELS = ["FREE {SPORT} PICKS", "FREE PICK WINNER"];
const COLOR_SWATCHES = [
  "#FFFFFF",
  "#0BC4D9",
  "#22C55E",
  "#1168D9",
  "#0B1F3B",
  "#EF4444",
  "#EAB308",
  "#000000",
];
const WEB_SAFE_FONTS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Courier New",
  "Impact",
];
const FONT_WEIGHTS = [
  "Normal",
  "Bold",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Types ──────────────────────────────────────────────────────────────────────
type LayerType =
  | "background"
  | "gradient"
  | "ticket"
  | "text"
  | "watermark"
  | "image";

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
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
  gradientOpacity?: number;
  blur?: number;
  cornerRadius?: number;
  shadow?: boolean;
}

type HandlePosition = "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br";

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

interface SnapLine {
  orientation: "h" | "v";
  pos: number;
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface VictoryCompositorProps {
  backgroundUrl: string | null;
  ticketDataUrl: string | null;
  additionalImages: { id: string; dataUrl: string }[];
  sport: string;
  tier: "free" | "vip";
  onExport: (dataUrl: string) => void;
  onDownload?: () => void;
  /** Callback to expose the export function to parent components */
  onRegisterExport?: (exportFn: () => string | null) => void;
}

// ── Image loader hook ──────────────────────────────────────────────────────────
function useLoadImage(url: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);
    image.src = url;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [url]);
  return img;
}

// ── Helper: draw cover-fit image ──────────────────────────────────────────────
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const destRatio = dw / dh;
  let sx = 0,
    sy = 0,
    sw = img.naturalWidth,
    sh = img.naturalHeight;
  if (imgRatio > destRatio) {
    sw = img.naturalHeight * destRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / destRatio;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

// ── Helper: round rect clip ──────────────────────────────────────────────────
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// ── Helper: deep clone layers ─────────────────────────────────────────────────
function cloneLayers(layers: EditorLayer[]): EditorLayer[] {
  return layers.map((l) => ({ ...l }));
}

// ── Helper: get handle positions ──────────────────────────────────────────────
function getHandles(
  layer: EditorLayer
): { pos: HandlePosition; x: number; y: number }[] {
  const { x, y, width: w, height: h } = layer;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return [
    { pos: "tl", x, y },
    { pos: "tc", x: cx, y },
    { pos: "tr", x: x + w, y },
    { pos: "ml", x, y: cy },
    { pos: "mr", x: x + w, y: cy },
    { pos: "bl", x, y: y + h },
    { pos: "bc", x: cx, y: y + h },
    { pos: "br", x: x + w, y: y + h },
  ];
}

function getHandleCursor(pos: HandlePosition): string {
  const map: Record<HandlePosition, string> = {
    tl: "nwse-resize",
    tr: "nesw-resize",
    bl: "nesw-resize",
    br: "nwse-resize",
    tc: "ns-resize",
    bc: "ns-resize",
    ml: "ew-resize",
    mr: "ew-resize",
  };
  return map[pos];
}

function isCornerHandle(h: HandlePosition): boolean {
  return h === "tl" || h === "tr" || h === "bl" || h === "br";
}

// ── Helper: transform text ────────────────────────────────────────────────────
function applyTextTransform(
  text: string,
  transform?: "none" | "uppercase" | "lowercase"
): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  return text;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VictoryCompositor({
  backgroundUrl,
  ticketDataUrl,
  additionalImages,
  sport,
  tier,
  onExport,
  onDownload,
  onRegisterExport,
}: VictoryCompositorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const bgImg = useLoadImage(backgroundUrl);
  const ticketImg = useLoadImage(ticketDataUrl);

  const [layers, setLayers] = useState<EditorLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<EditorLayer[][]>([]);
  const [redoStack, setRedoStack] = useState<EditorLayer[][]>([]);

  // Additional image elements loaded from props
  const [additionalImgElements, setAdditionalImgElements] = useState<
    Map<string, HTMLImageElement>
  >(new Map());

  // Track if layers have been initialized
  const initializedRef = useRef(false);
  const lastNudgeTimeRef = useRef(0);
  const prevBgRef = useRef<HTMLImageElement | null>(null);
  const prevTicketRef = useRef<HTMLImageElement | null>(null);
  const prevAdditionalRef = useRef<string>("");

  // ── Load additional images from props ──────────────────────────────────────
  useEffect(() => {
    const newMap = new Map<string, HTMLImageElement>();
    let cancelled = false;
    let loaded = 0;

    if (additionalImages.length === 0) {
      setAdditionalImgElements(new Map());
      return;
    }

    additionalImages.forEach((ai) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        newMap.set(ai.id, img);
        loaded++;
        if (loaded === additionalImages.length) {
          setAdditionalImgElements(new Map(newMap));
        }
      };
      img.onerror = () => {
        if (cancelled) return;
        loaded++;
        if (loaded === additionalImages.length) {
          setAdditionalImgElements(new Map(newMap));
        }
      };
      img.src = ai.dataUrl;
    });

    return () => {
      cancelled = true;
    };
  }, [additionalImages]);

  // ── Push undo snapshot ─────────────────────────────────────────────────────
  const pushUndo = useCallback(
    (currentLayers: EditorLayer[]) => {
      setUndoStack((prev) => {
        const next = [...prev, cloneLayers(currentLayers)];
        if (next.length > MAX_UNDO) next.shift();
        return next;
      });
      setRedoStack([]);
    },
    []
  );

  // ── Undo ───────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const newStack = [...prev];
      const snapshot = newStack.pop()!;
      setRedoStack((r) => [...r, cloneLayers(layers)]);
      setLayers(snapshot);
      return newStack;
    });
  }, [layers]);

  // ── Redo ───────────────────────────────────────────────────────────────────
  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const newStack = [...prev];
      const snapshot = newStack.pop()!;
      setUndoStack((u) => [...u, cloneLayers(layers)]);
      setLayers(snapshot);
      return newStack;
    });
  }, [layers]);

  // ── Initialize layers ──────────────────────────────────────────────────────
  useEffect(() => {
    const bgChanged = bgImg !== prevBgRef.current;
    const ticketChanged = ticketImg !== prevTicketRef.current;
    const additionalKey = additionalImages.map((a) => a.id).join(",");
    const additionalChanged = additionalKey !== prevAdditionalRef.current;

    prevBgRef.current = bgImg;
    prevTicketRef.current = ticketImg;
    prevAdditionalRef.current = additionalKey;

    if (!initializedRef.current || bgChanged || ticketChanged || additionalChanged) {
      const labelText =
        tier === "vip"
          ? pickRandom(VIP_LABELS)
          : pickRandom(FREE_LABELS).replace("{SPORT}", sport.toUpperCase());

      const ticketW = CANVAS_W * 0.5;
      const ticketH = ticketImg
        ? ticketW * (ticketImg.naturalHeight / ticketImg.naturalWidth)
        : CANVAS_H * 0.4;
      const ticketX = (CANVAS_W - ticketW) / 2;
      const ticketY = (CANVAS_H - ticketH) / 2 - 60;

      const baseLayers: EditorLayer[] = [
        {
          id: "bg",
          type: "background",
          name: "Background",
          visible: true,
          locked: true,
          opacity: 1,
          x: 0,
          y: 0,
          width: CANVAS_W,
          height: CANVAS_H,
          imageElement: bgImg || undefined,
          blur: 0,
        },
        {
          id: "gradient",
          type: "gradient",
          name: "Gradient Overlay",
          visible: true,
          locked: true,
          opacity: 1,
          x: 0,
          y: 0,
          width: CANVAS_W,
          height: CANVAS_H,
          gradientOpacity: 0.6,
        },
      ];

      // Additional images inserted between gradient and ticket
      const additionalLayers: EditorLayer[] = [];
      additionalImages.forEach((ai, idx) => {
        const imgEl = additionalImgElements.get(ai.id);
        const iw = imgEl ? imgEl.naturalWidth : 400;
        const ih = imgEl ? imgEl.naturalHeight : 400;
        const layerW = CANVAS_W * 0.4;
        const layerH = layerW * (ih / iw);
        additionalLayers.push({
          id: `addimg-${ai.id}`,
          type: "image",
          name: `Image ${idx + 1}`,
          visible: true,
          locked: false,
          opacity: 1,
          x: (CANVAS_W - layerW) / 2 + idx * 40,
          y: 100 + idx * 40,
          width: layerW,
          height: layerH,
          imageElement: imgEl || undefined,
          cornerRadius: 0,
          shadow: false,
        });
      });

      const topLayers: EditorLayer[] = [
        {
          id: "ticket",
          type: "ticket",
          name: "Ticket",
          visible: true,
          locked: false,
          opacity: 1,
          x: ticketX,
          y: ticketY,
          width: ticketW,
          height: ticketH,
          imageElement: ticketImg || undefined,
          cornerRadius: 0,
          shadow: false,
        },
        {
          id: "label",
          type: "text",
          name: "Label",
          visible: true,
          locked: false,
          opacity: 1,
          x: CANVAS_W / 2 - 300,
          y: CANVAS_H - 220,
          width: 600,
          height: 80,
          text: labelText,
          fontSize: 64,
          fontFamily: "Impact",
          fontWeight: "Normal",
          fillColor: "#FFFFFF",
          textAlign: "center",
          letterSpacing: 0,
          textTransform: "none",
        },
        {
          id: "branding",
          type: "watermark",
          name: "Branding",
          visible: true,
          locked: false,
          opacity: 0.4,
          x: CANVAS_W / 2 - 200,
          y: CANVAS_H - 60,
          width: 400,
          height: 40,
          text: "WINFACTPICKS.COM",
          fontSize: 28,
          fontFamily: "Impact",
          fontWeight: "Normal",
          fillColor: "#FFFFFF",
          textAlign: "center",
          letterSpacing: 0,
          textTransform: "none",
        },
      ];

      const newLayers = [...baseLayers, ...additionalLayers, ...topLayers];

      // If we already had layers, preserve user edits to layers that still exist
      if (initializedRef.current) {
        setLayers((prev) => {
          const preserved = new Map(prev.map((l) => [l.id, l]));
          return newLayers.map((nl) => {
            const existing = preserved.get(nl.id);
            if (existing) {
              // Update image elements but keep user edits
              return {
                ...existing,
                imageElement: nl.imageElement,
              };
            }
            return nl;
          });
        });
      } else {
        setLayers(newLayers);
      }

      initializedRef.current = true;
    }
  }, [bgImg, ticketImg, additionalImages, additionalImgElements, sport, tier]);

  // Update image elements on layers when they change
  useEffect(() => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === "bg" && bgImg) return { ...l, imageElement: bgImg };
        if (l.id === "ticket" && ticketImg)
          return { ...l, imageElement: ticketImg };
        if (l.type === "image" && l.id.startsWith("addimg-")) {
          const aiId = l.id.replace("addimg-", "");
          const el = additionalImgElements.get(aiId);
          if (el) return { ...l, imageElement: el };
        }
        return l;
      })
    );
  }, [bgImg, ticketImg, additionalImgElements]);

  // ── Selected layer helper ──────────────────────────────────────────────────
  const selectedLayer = layers.find((l) => l.id === selectedId) || null;

  // ── Update a single layer property ─────────────────────────────────────────
  const updateLayer = useCallback(
    (id: string, updates: Partial<EditorLayer>, skipUndo = false) => {
      setLayers((prev) => {
        if (!skipUndo) pushUndo(prev);
        return prev.map((l) => (l.id === id ? { ...l, ...updates } : l));
      });
    },
    [pushUndo]
  );

  // ── Compute snap lines ─────────────────────────────────────────────────────
  const computeSnap = useCallback(
    (
      movingId: string,
      mx: number,
      my: number,
      mw: number,
      mh: number,
      allLayers: EditorLayer[]
    ): { dx: number; dy: number; lines: SnapLine[] } => {
      const targets: { h: number[]; v: number[] } = { h: [], v: [] };

      // Canvas edges and center
      targets.v.push(0, CANVAS_W / 2, CANVAS_W);
      targets.h.push(0, CANVAS_H / 2, CANVAS_H);

      // Other layers
      allLayers.forEach((l) => {
        if (l.id === movingId || !l.visible) return;
        targets.v.push(l.x, l.x + l.width / 2, l.x + l.width);
        targets.h.push(l.y, l.y + l.height / 2, l.y + l.height);
      });

      const movingEdgesV = [mx, mx + mw / 2, mx + mw];
      const movingEdgesH = [my, my + mh / 2, my + mh];

      let dx = 0;
      let dy = 0;
      const lines: SnapLine[] = [];
      let bestDV = SNAP_THRESHOLD + 1;
      let bestDH = SNAP_THRESHOLD + 1;

      for (const me of movingEdgesV) {
        for (const t of targets.v) {
          const d = Math.abs(me - t);
          if (d < bestDV) {
            bestDV = d;
            dx = t - me;
          }
        }
      }

      for (const me of movingEdgesH) {
        for (const t of targets.h) {
          const d = Math.abs(me - t);
          if (d < bestDH) {
            bestDH = d;
            dy = t - me;
          }
        }
      }

      if (bestDV > SNAP_THRESHOLD) dx = 0;
      if (bestDH > SNAP_THRESHOLD) dy = 0;

      // Collect matched snap lines for display
      if (dx !== 0 || bestDV <= SNAP_THRESHOLD) {
        for (const me of movingEdgesV) {
          for (const t of targets.v) {
            if (Math.abs(me + dx - t) < 1) {
              lines.push({ orientation: "v", pos: t });
            }
          }
        }
      }
      if (dy !== 0 || bestDH <= SNAP_THRESHOLD) {
        for (const me of movingEdgesH) {
          for (const t of targets.h) {
            if (Math.abs(me + dy - t) < 1) {
              lines.push({ orientation: "h", pos: t });
            }
          }
        }
      }

      return { dx, dy, lines };
    },
    []
  );

  // ── Hit test ───────────────────────────────────────────────────────────────
  const hitTest = useCallback(
    (cx: number, cy: number): string | null => {
      // Check from top to bottom (highest index first)
      for (let i = layers.length - 1; i >= 0; i--) {
        const l = layers[i];
        if (!l.visible || l.locked) continue;
        if (
          cx >= l.x &&
          cx <= l.x + l.width &&
          cy >= l.y &&
          cy <= l.y + l.height
        ) {
          return l.id;
        }
      }
      return null;
    },
    [layers]
  );

  // ── Handle hit test ────────────────────────────────────────────────────────
  const handleHitTest = useCallback(
    (
      cx: number,
      cy: number
    ): HandlePosition | null => {
      if (!selectedLayer) return null;
      const handles = getHandles(selectedLayer);
      for (const h of handles) {
        const hs = HANDLE_SIZE * 1.5;
        if (
          cx >= h.x - hs &&
          cx <= h.x + hs &&
          cy >= h.y - hs &&
          cy <= h.y + hs
        ) {
          return h.pos;
        }
      }
      return null;
    },
    [selectedLayer]
  );

  // ── Screen to canvas coords ────────────────────────────────────────────────
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) * (CANVAS_W / rect.width);
      const y = (clientY - rect.top) * (CANVAS_H / rect.height);
      return { x, y };
    },
    []
  );

  // ── Mouse Down ─────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (spaceHeld || e.button === 1) {
        // Start panning
        setIsPanning(true);
        setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
        e.preventDefault();
        return;
      }

      if (e.button !== 0) return;

      const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);

      // Check handle first
      if (selectedLayer && !selectedLayer.locked) {
        const handle = handleHitTest(cx, cy);
        if (handle) {
          pushUndo(layers);
          setDragState({
            type: "resize",
            layerId: selectedLayer.id,
            startMouseX: cx,
            startMouseY: cy,
            startX: selectedLayer.x,
            startY: selectedLayer.y,
            startW: selectedLayer.width,
            startH: selectedLayer.height,
            handle,
          });
          return;
        }
      }

      // Hit test layers
      const hitId = hitTest(cx, cy);
      if (hitId) {
        if (editingLayerId && hitId !== editingLayerId) {
          setEditingLayerId(null);
        }
        setSelectedId(hitId);
        const layer = layers.find((l) => l.id === hitId)!;
        pushUndo(layers);
        setDragState({
          type: "move",
          layerId: hitId,
          startMouseX: cx,
          startMouseY: cy,
          startX: layer.x,
          startY: layer.y,
          startW: layer.width,
          startH: layer.height,
        });
      } else {
        setSelectedId(null);
        setEditingLayerId(null);
      }
    },
    [
      spaceHeld,
      panX,
      panY,
      screenToCanvas,
      selectedLayer,
      handleHitTest,
      hitTest,
      layers,
      editingLayerId,
      pushUndo,
    ]
  );

  // ── Mouse Move ─────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanning) {
        setPanX(e.clientX - panStart.x);
        setPanY(e.clientY - panStart.y);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);

      if (spaceHeld) {
        canvas.style.cursor = "grab";
        return;
      }

      if (!dragState) {
        // Update cursor
        if (selectedLayer && !selectedLayer.locked) {
          const handle = handleHitTest(cx, cy);
          if (handle) {
            canvas.style.cursor = getHandleCursor(handle);
            return;
          }
        }
        const hitId = hitTest(cx, cy);
        canvas.style.cursor = hitId ? "move" : "default";
        return;
      }

      // Dragging
      const layer = layers.find((l) => l.id === dragState.layerId);
      if (!layer) return;

      if (dragState.type === "move") {
        let newX = dragState.startX + (cx - dragState.startMouseX);
        let newY = dragState.startY + (cy - dragState.startMouseY);

        const snap = computeSnap(
          layer.id,
          newX,
          newY,
          layer.width,
          layer.height,
          layers
        );
        newX += snap.dx;
        newY += snap.dy;
        setSnapLines(snap.lines);

        setLayers((prev) =>
          prev.map((l) =>
            l.id === dragState.layerId
              ? { ...l, x: Math.round(newX), y: Math.round(newY) }
              : l
          )
        );
      } else if (dragState.type === "resize") {
        const dx = cx - dragState.startMouseX;
        const dy = cy - dragState.startMouseY;
        const h = dragState.handle!;

        let newX = dragState.startX;
        let newY = dragState.startY;
        let newW = dragState.startW;
        let newH = dragState.startH;

        const aspectRatio = dragState.startW / dragState.startH;

        if (isCornerHandle(h)) {
          // Aspect-locked resize
          if (h === "br") {
            newW = Math.max(MIN_SIZE, dragState.startW + dx);
            newH = newW / aspectRatio;
          } else if (h === "bl") {
            newW = Math.max(MIN_SIZE, dragState.startW - dx);
            newH = newW / aspectRatio;
            newX = dragState.startX + dragState.startW - newW;
          } else if (h === "tr") {
            newW = Math.max(MIN_SIZE, dragState.startW + dx);
            newH = newW / aspectRatio;
            newY = dragState.startY + dragState.startH - newH;
          } else if (h === "tl") {
            newW = Math.max(MIN_SIZE, dragState.startW - dx);
            newH = newW / aspectRatio;
            newX = dragState.startX + dragState.startW - newW;
            newY = dragState.startY + dragState.startH - newH;
          }
        } else {
          // Free resize on edges
          if (h === "mr") {
            newW = Math.max(MIN_SIZE, dragState.startW + dx);
          } else if (h === "ml") {
            newW = Math.max(MIN_SIZE, dragState.startW - dx);
            newX = dragState.startX + dragState.startW - newW;
          } else if (h === "bc") {
            newH = Math.max(MIN_SIZE, dragState.startH + dy);
          } else if (h === "tc") {
            newH = Math.max(MIN_SIZE, dragState.startH - dy);
            newY = dragState.startY + dragState.startH - newH;
          }
        }

        setLayers((prev) =>
          prev.map((l) =>
            l.id === dragState.layerId
              ? {
                  ...l,
                  x: Math.round(newX),
                  y: Math.round(newY),
                  width: Math.round(newW),
                  height: Math.round(newH),
                }
              : l
          )
        );
      }
    },
    [
      isPanning,
      panStart,
      spaceHeld,
      dragState,
      screenToCanvas,
      selectedLayer,
      handleHitTest,
      hitTest,
      layers,
      computeSnap,
    ]
  );

  // ── Mouse Up ───────────────────────────────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setSnapLines([]);
    setIsPanning(false);
  }, []);

  // ── Double Click ───────────────────────────────────────────────────────────
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);
      const hitId = hitTest(cx, cy);
      if (hitId) {
        const layer = layers.find((l) => l.id === hitId);
        if (layer && (layer.type === "text" || layer.type === "watermark")) {
          setSelectedId(hitId);
          setEditingLayerId(hitId);
        }
      }
    },
    [screenToCanvas, hitTest, layers]
  );

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((prev) => Math.min(2, Math.max(0.1, prev + delta)));
      }
    },
    []
  );

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Space for pan
      if (e.code === "Space" && !editingLayerId) {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }

      // Ctrl shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Z") {
        e.preventDefault();
        handleRedo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (selectedLayer) {
          duplicateLayer(selectedLayer.id);
        }
        return;
      }

      // Inline text editing
      if (editingLayerId) {
        if (e.key === "Escape" || e.key === "Enter") {
          setEditingLayerId(null);
          return;
        }
        const layer = layers.find((l) => l.id === editingLayerId);
        if (!layer) return;
        if (e.key === "Backspace") {
          e.preventDefault();
          updateLayer(editingLayerId, {
            text: (layer.text || "").slice(0, -1),
          });
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          updateLayer(editingLayerId, {
            text: (layer.text || "") + e.key,
          });
          return;
        }
        return;
      }

      // Escape deselect
      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }

      // Delete
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedLayer &&
        !["bg", "gradient", "ticket"].includes(selectedLayer.id)
      ) {
        e.preventDefault();
        deleteLayer(selectedLayer.id);
        return;
      }

      // Arrow nudge (debounced undo — only pushes if >500ms since last nudge)
      if (selectedLayer && !selectedLayer.locked) {
        const step = e.shiftKey ? 10 : 1;
        let handled = true;
        const now = Date.now();
        const shouldPushUndo = now - lastNudgeTimeRef.current > 500;
        if (shouldPushUndo) pushUndo(layers);
        lastNudgeTimeRef.current = now;

        switch (e.key) {
          case "ArrowLeft":
            updateLayer(selectedLayer.id, { x: selectedLayer.x - step }, true);
            break;
          case "ArrowRight":
            updateLayer(selectedLayer.id, { x: selectedLayer.x + step }, true);
            break;
          case "ArrowUp":
            updateLayer(selectedLayer.id, { y: selectedLayer.y - step }, true);
            break;
          case "ArrowDown":
            updateLayer(selectedLayer.id, { y: selectedLayer.y + step }, true);
            break;
          default:
            handled = false;
        }
        if (handled) e.preventDefault();
      }
    },
    [
      editingLayerId,
      selectedLayer,
      layers,
      handleUndo,
      handleRedo,
      pushUndo,
      updateLayer,
    ]
  );

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.code === "Space") {
      setSpaceHeld(false);
    }
  }, []);

  // ── Add text layer ─────────────────────────────────────────────────────────
  const addTextLayer = useCallback(() => {
    pushUndo(layers);
    const id = `text-${Date.now()}`;
    const newLayer: EditorLayer = {
      id,
      type: "text",
      name: "New Text",
      visible: true,
      locked: false,
      opacity: 1,
      x: CANVAS_W / 2 - 150,
      y: CANVAS_H / 2 - 30,
      width: 300,
      height: 60,
      text: "New Text",
      fontSize: 48,
      fontFamily: "Arial",
      fontWeight: "Bold",
      fillColor: "#FFFFFF",
      textAlign: "center",
      letterSpacing: 0,
      textTransform: "none",
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedId(id);
  }, [layers, pushUndo]);

  // ── Add image layer ────────────────────────────────────────────────────────
  const addImageLayer = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          pushUndo(layers);
          const id = `img-${Date.now()}`;
          const ratio = img.naturalHeight / img.naturalWidth;
          const w = CANVAS_W * 0.4;
          const h = w * ratio;
          const newLayer: EditorLayer = {
            id,
            type: "image",
            name: file.name.substring(0, 20),
            visible: true,
            locked: false,
            opacity: 1,
            x: (CANVAS_W - w) / 2,
            y: (CANVAS_H - h) / 2,
            width: w,
            height: h,
            imageElement: img,
            cornerRadius: 0,
            shadow: false,
          };
          setLayers((prev) => [...prev, newLayer]);
          setSelectedId(id);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [layers, pushUndo]
  );

  // ── Delete layer ───────────────────────────────────────────────────────────
  const deleteLayer = useCallback(
    (id: string) => {
      if (["bg", "gradient", "ticket"].includes(id)) return;
      pushUndo(layers);
      setLayers((prev) => prev.filter((l) => l.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [layers, selectedId, pushUndo]
  );

  // ── Duplicate layer ────────────────────────────────────────────────────────
  const duplicateLayer = useCallback(
    (id: string) => {
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      pushUndo(layers);
      const newId = `${layer.type}-${Date.now()}`;
      const dup: EditorLayer = {
        ...layer,
        id: newId,
        name: `${layer.name} Copy`,
        x: layer.x + 20,
        y: layer.y + 20,
        locked: false,
      };
      setLayers((prev) => [...prev, dup]);
      setSelectedId(newId);
    },
    [layers, pushUndo]
  );

  // ── Reorder layers ─────────────────────────────────────────────────────────
  const moveLayerUp = useCallback(
    (id: string) => {
      pushUndo(layers);
      setLayers((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx < 0 || idx >= prev.length - 1) return prev;
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      });
    },
    [layers, pushUndo]
  );

  const moveLayerDown = useCallback(
    (id: string) => {
      pushUndo(layers);
      setLayers((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx <= 0) return prev;
        const next = [...prev];
        [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
        return next;
      });
    },
    [layers, pushUndo]
  );

  const bringToFront = useCallback(
    (id: string) => {
      pushUndo(layers);
      setLayers((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx < 0) return prev;
        const next = [...prev];
        const [item] = next.splice(idx, 1);
        next.push(item);
        return next;
      });
    },
    [layers, pushUndo]
  );

  const sendToBack = useCallback(
    (id: string) => {
      pushUndo(layers);
      setLayers((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx < 0) return prev;
        const next = [...prev];
        const [item] = next.splice(idx, 1);
        next.unshift(item);
        return next;
      });
    },
    [layers, pushUndo]
  );

  const bringForward = useCallback(
    (id: string) => {
      moveLayerUp(id);
    },
    [moveLayerUp]
  );

  const sendBackward = useCallback(
    (id: string) => {
      moveLayerDown(id);
    },
    [moveLayerDown]
  );

  // ── Render to context ──────────────────────────────────────────────────────
  const renderToCtx = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      showUI: boolean
    ) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      for (const layer of layers) {
        if (!layer.visible) continue;

        ctx.save();
        ctx.globalAlpha = layer.opacity;

        switch (layer.type) {
          case "background": {
            if (layer.imageElement) {
              if (layer.blur && layer.blur > 0) {
                ctx.filter = `blur(${layer.blur}px)`;
              }
              drawCoverImage(
                ctx,
                layer.imageElement,
                layer.x,
                layer.y,
                layer.width,
                layer.height
              );
              ctx.filter = "none";
            } else {
              ctx.fillStyle = "#1a1a2e";
              ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
            }
            break;
          }

          case "gradient": {
            const gOp = layer.gradientOpacity ?? 0.6;
            const grad = ctx.createLinearGradient(
              0,
              height * 0.4,
              0,
              height
            );
            grad.addColorStop(0, `rgba(0,0,0,0)`);
            grad.addColorStop(1, `rgba(0,0,0,${gOp})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
            break;
          }

          case "image":
          case "ticket": {
            if (layer.imageElement) {
              ctx.save();

              if (layer.shadow) {
                ctx.shadowColor = "rgba(0,0,0,0.5)";
                ctx.shadowBlur = 20;
                ctx.shadowOffsetX = 4;
                ctx.shadowOffsetY = 4;
              }

              const cr = layer.cornerRadius ?? 0;
              if (cr > 0) {
                roundRectPath(
                  ctx,
                  layer.x,
                  layer.y,
                  layer.width,
                  layer.height,
                  cr
                );
                ctx.clip();
              }

              ctx.drawImage(
                layer.imageElement,
                layer.x,
                layer.y,
                layer.width,
                layer.height
              );
              ctx.restore();
            }
            break;
          }

          case "text":
          case "watermark": {
            const text = applyTextTransform(
              layer.text || "",
              layer.textTransform
            );
            const weight =
              layer.fontWeight === "Normal"
                ? ""
                : layer.fontWeight === "Bold"
                ? "bold"
                : layer.fontWeight || "";
            const fontStr = `${weight} ${layer.fontSize || 48}px ${JSON.stringify(layer.fontFamily || "Arial")}`.trim();
            ctx.font = fontStr;
            ctx.fillStyle = layer.fillColor || "#FFFFFF";
            ctx.textAlign = layer.textAlign || "center";
            ctx.textBaseline = "middle";
            if (layer.letterSpacing && "letterSpacing" in ctx) {
              (ctx as unknown as { letterSpacing: string }).letterSpacing = `${layer.letterSpacing}px`;
            }

            let textX = layer.x + layer.width / 2;
            if (layer.textAlign === "left") textX = layer.x;
            if (layer.textAlign === "right") textX = layer.x + layer.width;

            const textY = layer.y + layer.height / 2;

            // Text shadow for text type (not watermark)
            if (layer.type === "text") {
              ctx.save();
              ctx.shadowColor = "rgba(0,0,0,0.6)";
              ctx.shadowBlur = 8;
              ctx.shadowOffsetX = 2;
              ctx.shadowOffsetY = 2;
              ctx.fillText(text, textX, textY);
              ctx.restore();
            } else {
              ctx.fillText(text, textX, textY);
            }

            // Show cursor when editing
            if (showUI && editingLayerId === layer.id) {
              const metrics = ctx.measureText(text);
              const cursorX =
                layer.textAlign === "center"
                  ? textX + metrics.width / 2 + 2
                  : layer.textAlign === "right"
                  ? textX + 2
                  : textX + metrics.width + 2;
              const cursorH = (layer.fontSize || 48) * 0.8;
              // Blinking effect via animation frame won't work directly,
              // so just draw a solid cursor line
              if (Math.floor(Date.now() / 500) % 2 === 0) {
                ctx.strokeStyle = "#FFFFFF";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cursorX, textY - cursorH / 2);
                ctx.lineTo(cursorX, textY + cursorH / 2);
                ctx.stroke();
              }
            }
            break;
          }
        }

        ctx.restore();
      }

      // UI overlays
      if (showUI) {
        // Snap lines
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "#0BC4D9";
        ctx.lineWidth = 2;
        for (const sl of snapLines) {
          ctx.beginPath();
          if (sl.orientation === "v") {
            ctx.moveTo(sl.pos, 0);
            ctx.lineTo(sl.pos, height);
          } else {
            ctx.moveTo(0, sl.pos);
            ctx.lineTo(width, sl.pos);
          }
          ctx.stroke();
        }
        ctx.restore();

        // Selection rect + handles
        if (selectedLayer) {
          const sl = selectedLayer;
          ctx.save();
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 4]);
          ctx.strokeRect(sl.x, sl.y, sl.width, sl.height);
          ctx.setLineDash([]);

          const handles = getHandles(sl);
          for (const h of handles) {
            ctx.fillStyle = "#FFFFFF";
            ctx.strokeStyle = "#3B82F6";
            ctx.lineWidth = 2;
            ctx.fillRect(
              h.x - HANDLE_SIZE / 2,
              h.y - HANDLE_SIZE / 2,
              HANDLE_SIZE,
              HANDLE_SIZE
            );
            ctx.strokeRect(
              h.x - HANDLE_SIZE / 2,
              h.y - HANDLE_SIZE / 2,
              HANDLE_SIZE,
              HANDLE_SIZE
            );
          }
          ctx.restore();
        }
      }
    },
    [layers, snapLines, selectedLayer, editingLayerId]
  );

  // ── Canvas render loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const draw = () => {
      renderToCtx(ctx, CANVAS_W, CANVAS_H, true);
      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [renderToCtx]);

  // ── Fit zoom calculation ───────────────────────────────────────────────────
  const fitZoom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleX = (rect.width - 40) / CANVAS_W;
    const scaleY = (rect.height - 40) / CANVAS_H;
    const newZoom = Math.min(scaleX, scaleY, 1);
    setZoom(Math.max(0.1, newZoom));
    setPanX(0);
    setPanY(0);
  }, []);

  // Initial fit
  useEffect(() => {
    fitZoom();
  }, [fitZoom]);

  // ── Export / Download ──────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    setExporting(true);
    const offscreen = document.createElement("canvas");
    offscreen.width = CANVAS_W;
    offscreen.height = CANVAS_H;
    const ctx = offscreen.getContext("2d")!;
    renderToCtx(ctx, CANVAS_W, CANVAS_H, false);

    offscreen.toBlob((blob) => {
      if (!blob) {
        setExporting(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `victory-post-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExporting(false);
      onDownload?.();
    }, "image/png");
  }, [renderToCtx, onDownload]);

  const handleConvertToPost = useCallback(() => {
    setExporting(true);
    const offscreen = document.createElement("canvas");
    offscreen.width = CANVAS_W;
    offscreen.height = CANVAS_H;
    const ctx = offscreen.getContext("2d")!;
    renderToCtx(ctx, CANVAS_W, CANVAS_H, false);
    const dataUrl = offscreen.toDataURL("image/png");
    onExport(dataUrl);
    setExporting(false);
  }, [renderToCtx, onExport]);

  // ── Register export function for parent access ─────────────────────────────
  const getExportDataUrl = useCallback((): string | null => {
    const offscreen = document.createElement("canvas");
    offscreen.width = CANVAS_W;
    offscreen.height = CANVAS_H;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;
    renderToCtx(ctx, CANVAS_W, CANVAS_H, false);
    return offscreen.toDataURL("image/png");
  }, [renderToCtx]);

  useEffect(() => {
    onRegisterExport?.(getExportDataUrl);
  }, [onRegisterExport, getExportDataUrl]);

  // ── Layer type icon ────────────────────────────────────────────────────────
  const getLayerIcon = (type: LayerType) => {
    switch (type) {
      case "background":
        return <ImageIcon className="w-3.5 h-3.5" />;
      case "gradient":
        return <div className="w-3.5 h-3.5 rounded bg-gradient-to-b from-transparent to-black border border-gray-400" />;
      case "ticket":
        return <ImageIcon className="w-3.5 h-3.5" />;
      case "text":
      case "watermark":
        return <Type className="w-3.5 h-3.5" />;
      case "image":
        return <ImageIcon className="w-3.5 h-3.5" />;
    }
  };

  // ── Computed canvas display style ──────────────────────────────────────────
  const canvasDisplayStyle: React.CSSProperties = {
    width: CANVAS_W * zoom,
    height: CANVAS_H * zoom,
    transform: `translate(${panX}px, ${panY}px)`,
    cursor: spaceHeld
      ? isPanning
        ? "grabbing"
        : "grab"
      : "default",
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={rootRef}
      className="flex h-full"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* ── LEFT: Layers Panel ──────────────────────────────────────────── */}
      <div className="w-60 shrink-0 border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
        <div className="px-3 py-2 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Layers</h3>
        </div>

        {/* Layer list - reverse for z-order display (top = front) */}
        <div className="flex-1 overflow-y-auto">
          {[...layers].reverse().map((layer) => (
            <div
              key={layer.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs cursor-pointer border-b border-gray-100 ${
                selectedId === layer.id
                  ? "bg-blue-50 border-l-2 border-l-blue-500"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => {
                setSelectedId(layer.id);
                if (editingLayerId && editingLayerId !== layer.id) {
                  setEditingLayerId(null);
                }
              }}
            >
              {/* Visibility toggle */}
              <button
                className="p-0.5 hover:bg-gray-200 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layer.id, { visible: !layer.visible });
                }}
                title={layer.visible ? "Hide" : "Show"}
              >
                {layer.visible ? (
                  <Eye className="w-3.5 h-3.5 text-gray-600" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>

              {/* Lock toggle */}
              <button
                className="p-0.5 hover:bg-gray-200 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layer.id, { locked: !layer.locked });
                }}
                title={layer.locked ? "Unlock" : "Lock"}
              >
                {layer.locked ? (
                  <Lock className="w-3.5 h-3.5 text-gray-600" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>

              {/* Type icon */}
              <span className="text-gray-500">{getLayerIcon(layer.type)}</span>

              {/* Name */}
              <span className="flex-1 truncate text-gray-700">
                {layer.name}
              </span>

              {/* Delete for custom layers */}
              {!["bg", "gradient", "ticket"].includes(layer.id) && (
                <button
                  className="p-0.5 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(layer.id);
                  }}
                  title="Delete"
                  style={{ opacity: selectedId === layer.id ? 1 : undefined }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Layer actions */}
        <div className="p-2 border-t border-gray-200 flex flex-col gap-1.5">
          {selectedId && (
            <div className="flex gap-1">
              <button
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                onClick={() => moveLayerUp(selectedId)}
                title="Move Up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                Up
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                onClick={() => moveLayerDown(selectedId)}
                title="Move Down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Down
              </button>
            </div>
          )}
          <button
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded"
            onClick={addTextLayer}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Text
          </button>
          <button
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded"
            onClick={addImageLayer}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Image
          </button>
        </div>
      </div>

      {/* ── CENTER: Canvas Viewport ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Zoom toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1" />
            {selectedId && (
              <button
                className="p-1.5 rounded hover:bg-gray-100"
                onClick={() => duplicateLayer(selectedId)}
                title="Duplicate (Ctrl+D)"
              >
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded hover:bg-gray-100"
              onClick={() =>
                setZoom((prev) => Math.max(0.1, prev - 0.1))
              }
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-xs text-gray-600 w-12 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="p-1.5 rounded hover:bg-gray-100"
              onClick={() =>
                setZoom((prev) => Math.min(2, prev + 0.1))
              }
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <button
              className="p-1.5 rounded hover:bg-gray-100"
              onClick={fitZoom}
              title="Fit to Screen"
            >
              <Maximize className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden flex items-center justify-center relative"
          style={{
            maxHeight: "calc(100vh - 180px)",
            backgroundColor: "#111827",
            backgroundImage:
              "radial-gradient(circle, #1f2937 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            style={canvasDisplayStyle}
            className="shadow-2xl"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 p-3 border-t border-gray-200 bg-white">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
            onClick={handleDownload}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PNG
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 text-sm font-medium"
            onClick={handleConvertToPost}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Convert to Post
          </button>
        </div>
      </div>

      {/* ── RIGHT: Properties Panel ──────────────────────────────────────── */}
      <div className="w-72 shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4">
        {!selectedLayer ? (
          <div className="text-sm text-gray-400 text-center mt-8">
            Select a layer to edit properties
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200">
              {selectedLayer.name}
            </h3>

            {/* Position */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Position
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="text-xs text-gray-400">X</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    value={Math.round(selectedLayer.x)}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        x: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Y</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    value={Math.round(selectedLayer.y)}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        y: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Size
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="text-xs text-gray-400">W</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    value={Math.round(selectedLayer.width)}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        width: Math.max(
                          MIN_SIZE,
                          parseInt(e.target.value) || MIN_SIZE
                        ),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">H</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    value={Math.round(selectedLayer.height)}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        height: Math.max(
                          MIN_SIZE,
                          parseInt(e.target.value) || MIN_SIZE
                        ),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Opacity */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Opacity: {Math.round(selectedLayer.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(selectedLayer.opacity * 100)}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, {
                    opacity: parseInt(e.target.value) / 100,
                  })
                }
                className="w-full mt-1"
              />
            </div>

            {/* Background-specific */}
            {selectedLayer.type === "background" && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Blur: {selectedLayer.blur ?? 0}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={selectedLayer.blur ?? 0}
                  onChange={(e) =>
                    updateLayer(selectedLayer.id, {
                      blur: parseInt(e.target.value),
                    })
                  }
                  className="w-full mt-1"
                />
              </div>
            )}

            {/* Gradient-specific */}
            {selectedLayer.type === "gradient" && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Gradient Opacity:{" "}
                  {Math.round((selectedLayer.gradientOpacity ?? 0.6) * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(
                    (selectedLayer.gradientOpacity ?? 0.6) * 100
                  )}
                  onChange={(e) =>
                    updateLayer(selectedLayer.id, {
                      gradientOpacity: parseInt(e.target.value) / 100,
                    })
                  }
                  className="w-full mt-1"
                />
              </div>
            )}

            {/* Text/Watermark properties */}
            {(selectedLayer.type === "text" ||
              selectedLayer.type === "watermark") && (
              <>
                {/* Text content */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Text
                  </label>
                  <input
                    type="text"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded mt-1"
                    value={selectedLayer.text || ""}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        text: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Font Family */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Font Family
                  </label>
                  <select
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded mt-1"
                    value={selectedLayer.fontFamily || "Arial"}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        fontFamily: e.target.value,
                      })
                    }
                  >
                    {WEB_SAFE_FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Font Size
                  </label>
                  <input
                    type="number"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded mt-1"
                    value={selectedLayer.fontSize || 48}
                    min={8}
                    max={400}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        fontSize: parseInt(e.target.value) || 48,
                      })
                    }
                  />
                </div>

                {/* Font Weight */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Font Weight
                  </label>
                  <select
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded mt-1"
                    value={selectedLayer.fontWeight || "Normal"}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        fontWeight: e.target.value,
                      })
                    }
                  >
                    {FONT_WEIGHTS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Color
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono"
                      value={selectedLayer.fillColor || "#FFFFFF"}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, {
                          fillColor: e.target.value,
                        })
                      }
                    />
                    <input
                      type="color"
                      className="w-7 h-7 p-0 border border-gray-300 rounded cursor-pointer"
                      value={selectedLayer.fillColor || "#FFFFFF"}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, {
                          fillColor: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        onClick={() =>
                          updateLayer(selectedLayer.id, {
                            fillColor: c,
                          })
                        }
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* Text Alignment */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Alignment
                  </label>
                  <div className="flex gap-1 mt-1">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        className={`flex-1 px-2 py-1 text-xs rounded border ${
                          selectedLayer.textAlign === align
                            ? "bg-blue-100 border-blue-400 text-blue-700"
                            : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                        onClick={() =>
                          updateLayer(selectedLayer.id, {
                            textAlign: align,
                          })
                        }
                      >
                        {align.charAt(0).toUpperCase() + align.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Transform */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Text Transform
                  </label>
                  <div className="flex gap-1 mt-1">
                    {(
                      [
                        { value: "none", label: "None" },
                        { value: "uppercase", label: "UPPER" },
                        { value: "lowercase", label: "lower" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        className={`flex-1 px-2 py-1 text-xs rounded border ${
                          (selectedLayer.textTransform || "none") === opt.value
                            ? "bg-blue-100 border-blue-400 text-blue-700"
                            : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                        onClick={() =>
                          updateLayer(selectedLayer.id, {
                            textTransform: opt.value,
                          })
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Letter Spacing */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Letter Spacing
                  </label>
                  <input
                    type="number"
                    min={-5}
                    max={20}
                    value={selectedLayer.letterSpacing ?? 0}
                    onChange={(e) => updateLayer(selectedLayer.id, { letterSpacing: Number(e.target.value) })}
                    className="mt-1 w-full h-8 px-2 text-xs border border-gray-300 rounded bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Image/Ticket properties */}
            {(selectedLayer.type === "image" ||
              selectedLayer.type === "ticket") && (
              <>
                {/* Arrange */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Arrange
                  </label>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <button
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      onClick={() => bringToFront(selectedLayer.id)}
                    >
                      Bring to Front
                    </button>
                    <button
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      onClick={() => sendToBack(selectedLayer.id)}
                    >
                      Send to Back
                    </button>
                    <button
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      onClick={() => bringForward(selectedLayer.id)}
                    >
                      Bring Forward
                    </button>
                    <button
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      onClick={() => sendBackward(selectedLayer.id)}
                    >
                      Send Backward
                    </button>
                  </div>
                </div>

                {/* Corner Radius */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Corner Radius: {selectedLayer.cornerRadius ?? 0}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={selectedLayer.cornerRadius ?? 0}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        cornerRadius: parseInt(e.target.value),
                      })
                    }
                    className="w-full mt-1"
                  />
                </div>

                {/* Drop Shadow */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Drop Shadow
                  </label>
                  <button
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      selectedLayer.shadow ? "bg-blue-500" : "bg-gray-300"
                    }`}
                    onClick={() =>
                      updateLayer(selectedLayer.id, {
                        shadow: !selectedLayer.shadow,
                      })
                    }
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        selectedLayer.shadow
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
