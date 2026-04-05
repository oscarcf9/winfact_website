"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ChangeEvent,
} from "react";
import { Stage, Layer, Image as KonvaImage, Text, Rect, Transformer } from "react-konva";
import type Konva from "konva";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VictoryCompositorProps {
  backgroundUrl: string | null;
  ticketDataUrl: string | null;
  sport: string;
  tier: "free" | "vip";
  onExport: (dataUrl: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVAS_W = 1080;
const CANVAS_H = 1440;
const DISPLAY_SCALE = 0.5;
const DISPLAY_W = CANVAS_W * DISPLAY_SCALE;
const DISPLAY_H = CANVAS_H * DISPLAY_SCALE;
const EXPORT_PIXEL_RATIO = 2;

const DEFAULT_TICKET_SCALE = 50;
const DEFAULT_BG_OPACITY = 100;
const DEFAULT_GRADIENT_STRENGTH = 70;

const VIP_LABELS = [
  "VIP PICK HIT",
  "LA EXCLUSIVA",
  "VIP WINNER",
  "EXCLUSIVE VIP PLAY",
] as const;

const FREE_LABELS = [
  "FREE {SPORT} PICKS",
  "PICKS DE {SPORT}",
  "FREE PICK WINNER",
] as const;

// ---------------------------------------------------------------------------
// Hook: useKonvaImage
// ---------------------------------------------------------------------------

function useKonvaImage(url: string | null): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement>();

  useEffect(() => {
    if (!url) {
      setImage(undefined);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setImage(undefined);
    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return image;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDefaultLabel(tier: "free" | "vip", sport: string): string {
  const template =
    tier === "vip" ? pickRandom(VIP_LABELS) : pickRandom(FREE_LABELS);
  return template.replace("{SPORT}", sport.toUpperCase());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VictoryCompositor({
  backgroundUrl,
  ticketDataUrl,
  sport,
  tier,
  onExport,
}: VictoryCompositorProps) {
  // --- Images ----------------------------------------------------------------
  const backgroundImage = useKonvaImage(backgroundUrl);
  const ticketImage = useKonvaImage(ticketDataUrl);

  // --- Refs ------------------------------------------------------------------
  const stageRef = useRef<Konva.Stage>(null);
  const ticketRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // --- Controls state --------------------------------------------------------
  const [bgOpacity, setBgOpacity] = useState(DEFAULT_BG_OPACITY);
  const [gradientStrength, setGradientStrength] = useState(
    DEFAULT_GRADIENT_STRENGTH
  );
  const [ticketScale, setTicketScale] = useState(DEFAULT_TICKET_SCALE);
  const [labelText, setLabelText] = useState(() =>
    generateDefaultLabel(tier, sport)
  );
  const [showBranding, setShowBranding] = useState(true);
  const [ticketSelected, setTicketSelected] = useState(false);

  // Re-generate label when tier/sport change (only if user hasn't manually edited)
  const labelIsDefault = useRef(true);
  useEffect(() => {
    if (labelIsDefault.current) {
      setLabelText(generateDefaultLabel(tier, sport));
    }
  }, [tier, sport]);

  // --- Derived values --------------------------------------------------------
  const gradientOpacity = gradientStrength / 100;

  const ticketDimensions = useMemo(() => {
    if (!ticketImage) return { width: 0, height: 0, x: 0, y: 0 };
    const scale = ticketScale / 100;
    const w = ticketImage.width * scale;
    const h = ticketImage.height * scale;
    const x = (CANVAS_W - w) / 2;
    const y = CANVAS_H * 0.08;
    return { width: w, height: h, x, y };
  }, [ticketImage, ticketScale]);

  // --- Transformer attachment ------------------------------------------------
  useEffect(() => {
    const transformer = transformerRef.current;
    const ticket = ticketRef.current;
    if (!transformer) return;

    if (ticketSelected && ticket) {
      transformer.nodes([ticket]);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [ticketSelected]);

  // --- Handlers --------------------------------------------------------------
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === e.target.getStage()) {
        setTicketSelected(false);
      }
    },
    []
  );

  const handleTicketClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true;
      setTicketSelected(true);
    },
    []
  );

  const handleLabelChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    labelIsDefault.current = false;
    setLabelText(e.target.value);
  }, []);

  const handleExport = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Temporarily deselect transformer for clean export
    transformerRef.current?.nodes([]);
    transformerRef.current?.getLayer()?.batchDraw();

    const dataUrl = stage.toDataURL({ pixelRatio: EXPORT_PIXEL_RATIO });
    onExport(dataUrl);

    // Re-attach transformer if ticket was selected
    if (ticketSelected && ticketRef.current) {
      transformerRef.current?.nodes([ticketRef.current]);
      transformerRef.current?.getLayer()?.batchDraw();
    }
  }, [onExport, ticketSelected]);

  const handleDownload = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    transformerRef.current?.nodes([]);
    transformerRef.current?.getLayer()?.batchDraw();

    const dataUrl = stage.toDataURL({ pixelRatio: EXPORT_PIXEL_RATIO });
    const link = document.createElement("a");
    link.download = `victory-post-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    if (ticketSelected && ticketRef.current) {
      transformerRef.current?.nodes([ticketRef.current]);
      transformerRef.current?.getLayer()?.batchDraw();
    }
  }, [ticketSelected]);

  // --- Render ----------------------------------------------------------------
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Canvas */}
      <div
        className="overflow-hidden rounded-lg border border-gray-200 shadow-md"
        style={{ width: DISPLAY_W, height: DISPLAY_H }}
      >
        <Stage
          ref={stageRef}
          width={DISPLAY_W}
          height={DISPLAY_H}
          scaleX={DISPLAY_SCALE}
          scaleY={DISPLAY_SCALE}
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          <Layer>
            {/* 1. Background Image */}
            {backgroundImage && (
              <KonvaImage
                image={backgroundImage}
                x={0}
                y={0}
                width={CANVAS_W}
                height={CANVAS_H}
                opacity={bgOpacity / 100}
              />
            )}

            {/* Fallback background when no image */}
            {!backgroundImage && (
              <Rect
                x={0}
                y={0}
                width={CANVAS_W}
                height={CANVAS_H}
                fill="#1a1a2e"
              />
            )}

            {/* 2. Gradient Overlay */}
            <Rect
              x={0}
              y={0}
              width={CANVAS_W}
              height={CANVAS_H}
              fillLinearGradientStartPoint={{ x: 0, y: CANVAS_H * 0.5 }}
              fillLinearGradientEndPoint={{ x: 0, y: CANVAS_H }}
              fillLinearGradientColorStops={[
                0,
                "rgba(0,0,0,0)",
                1,
                `rgba(0,0,0,${gradientOpacity})`,
              ]}
              listening={false}
            />

            {/* 3. Ticket Image */}
            {ticketImage && (
              <KonvaImage
                ref={ticketRef}
                image={ticketImage}
                x={ticketDimensions.x}
                y={ticketDimensions.y}
                width={ticketDimensions.width}
                height={ticketDimensions.height}
                draggable
                onClick={handleTicketClick}
                onTap={handleTicketClick}
                onDragEnd={() => {
                  // Position updates are handled by Konva internally
                }}
              />
            )}

            {/* 4. Label Text */}
            <Text
              x={0}
              y={CANVAS_H - 260}
              width={CANVAS_W}
              align="center"
              text={labelText}
              fontSize={72}
              fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
              fontStyle="bold"
              fill="#FFFFFF"
              shadowColor="rgba(0,0,0,0.6)"
              shadowBlur={12}
              shadowOffsetY={4}
              letterSpacing={3}
              listening={false}
            />

            {/* 5. Branding */}
            {showBranding && (
              <Text
                x={0}
                y={CANVAS_H - 80}
                width={CANVAS_W}
                align="center"
                text="WINFACTPICKS.COM"
                fontSize={28}
                fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
                fontStyle="bold"
                fill="rgba(255,255,255,0.45)"
                letterSpacing={6}
                listening={false}
              />
            )}

            {/* Transformer (resize handles for ticket) */}
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              keepRatio
              enabledAnchors={[
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                // Enforce minimum size
                if (newBox.width < 100 || newBox.height < 100) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </div>

      {/* Controls Panel */}
      <div className="w-full max-w-[540px] space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        {/* Background Opacity */}
        <ControlSlider
          label="Background Opacity"
          value={bgOpacity}
          min={0}
          max={100}
          onChange={setBgOpacity}
        />

        {/* Gradient Strength */}
        <ControlSlider
          label="Gradient Strength"
          value={gradientStrength}
          min={0}
          max={100}
          onChange={setGradientStrength}
        />

        {/* Ticket Scale */}
        <ControlSlider
          label="Ticket Scale"
          value={ticketScale}
          min={30}
          max={100}
          onChange={setTicketScale}
        />

        {/* Label Text */}
        <div>
          <label
            htmlFor="label-text"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Label Text
          </label>
          <input
            id="label-text"
            type="text"
            value={labelText}
            onChange={handleLabelChange}
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Show Branding */}
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={showBranding}
            onChange={(e) => setShowBranding(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
          />
          Show Branding
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 rounded-lg border-2 border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-secondary hover:shadow-lg"
          >
            Convert to Post &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: ControlSlider
// ---------------------------------------------------------------------------

interface ControlSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function ControlSlider({ label, value, min, max, onChange }: ControlSliderProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <span className="text-xs tabular-nums text-gray-500">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary"
      />
    </div>
  );
}
