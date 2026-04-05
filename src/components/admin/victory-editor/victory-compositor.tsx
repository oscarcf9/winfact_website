"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Download, Send, Loader2 } from "lucide-react";

// Polotno imports
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from "polotno";
import { Toolbar } from "polotno/toolbar/toolbar";
import { ZoomButtons } from "polotno/toolbar/zoom-buttons";
import { SidePanel, DEFAULT_SECTIONS } from "polotno/side-panel";
import { Workspace } from "polotno/canvas/workspace";
import { createStore } from "polotno/model/store";
import "@blueprintjs/core/lib/css/blueprint.css";

// Instagram 3:4 feed post dimensions (2026 standard)
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

export default function VictoryCompositor({
  backgroundUrl,
  ticketDataUrl,
  sport,
  tier,
  onExport,
}: VictoryCompositorProps) {
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null);
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Create store once
  useEffect(() => {
    const store = createStore({
      key: process.env.NEXT_PUBLIC_POLOTNO_KEY || "nFA5H9elEytDyPyvKL7T",
      showCredit: true,
    });

    // Set canvas to Instagram 3:4
    store.setSize(CANVAS_W, CANVAS_H);

    // Create the initial page
    const page = store.addPage();

    // Add background image if provided
    if (backgroundUrl) {
      page.set({ background: "#0B1F3B" });
      page.addElement({
        type: "image",
        src: backgroundUrl,
        x: 0,
        y: 0,
        width: CANVAS_W,
        height: CANVAS_H,
        selectable: true,
        draggable: true,
      });
    } else {
      page.set({ background: "#0B1F3B" });
    }

    // Add gradient overlay (dark from bottom)
    page.addElement({
      type: "svg",
      width: CANVAS_W,
      height: CANVAS_H,
      x: 0,
      y: 0,
      src: `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.4" stop-color="rgba(0,0,0,0)" />
            <stop offset="0.75" stop-color="rgba(0,0,0,0.5)" />
            <stop offset="1" stop-color="rgba(0,0,0,0.85)" />
          </linearGradient>
        </defs>
        <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#g)" />
      </svg>`,
      selectable: false,
    });

    // Add ticket image if provided
    if (ticketDataUrl) {
      page.addElement({
        type: "image",
        src: ticketDataUrl,
        x: CANVAS_W * 0.1,
        y: CANVAS_H * 0.05,
        width: CANVAS_W * 0.8,
        height: CANVAS_W * 0.55,
        draggable: true,
      });
    }

    // Add label text
    const labelTemplate = tier === "vip" ? pickRandom(VIP_LABELS) : pickRandom(FREE_LABELS);
    const labelText = labelTemplate.replace("{SPORT}", sport.toUpperCase());

    page.addElement({
      type: "text",
      text: labelText,
      x: 0,
      y: CANVAS_H - 280,
      width: CANVAS_W,
      fontSize: 72,
      fontFamily: "Oswald",
      fontWeight: "bold",
      fill: "#FFFFFF",
      align: "center",
      letterSpacing: 0.05,
      shadowEnabled: true,
      shadowColor: "rgba(0,0,0,0.6)",
      shadowBlur: 12,
      shadowOffsetY: 4,
    });

    // Add branding
    page.addElement({
      type: "text",
      text: "WINFACTPICKS.COM",
      x: 0,
      y: CANVAS_H - 100,
      width: CANVAS_W,
      fontSize: 28,
      fontFamily: "Oswald",
      fontWeight: "bold",
      fill: "rgba(255,255,255,0.4)",
      align: "center",
      letterSpacing: 0.15,
    });

    storeRef.current = store;
    setReady(true);

    return () => {
      // Cleanup not strictly needed but good practice
      storeRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only create once

  // Update background when URL changes
  useEffect(() => {
    if (!storeRef.current || !ready) return;
    const page = storeRef.current.activePage;
    if (!page) return;

    // Find existing background image element and update it
    const elements = page.children || [];
    const bgElement = elements.find(
      (el: { type: string; width: number; height: number }) =>
        el.type === "image" && el.width === CANVAS_W && el.height === CANVAS_H
    );

    if (bgElement && backgroundUrl) {
      bgElement.set({ src: backgroundUrl });
    } else if (!bgElement && backgroundUrl) {
      // Insert at position 0 (behind everything)
      page.addElement({
        type: "image",
        src: backgroundUrl,
        x: 0,
        y: 0,
        width: CANVAS_W,
        height: CANVAS_H,
        selectable: true,
        draggable: true,
      });
    }
  }, [backgroundUrl, ready]);

  // Handle export
  const handleDownload = useCallback(async () => {
    if (!storeRef.current) return;
    const dataUrl = await storeRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = `victory-post-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  const handleConvertToPost = useCallback(async () => {
    if (!storeRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await storeRef.current.toDataURL({ pixelRatio: 2 });
      onExport(dataUrl);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  }, [onExport]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    );
  }

  const store = storeRef.current!;

  // Filter side panel sections — keep only useful ones for victory posts
  const sections = DEFAULT_SECTIONS.filter(
    (section) => !["size", "templates"].includes(section.name)
  );

  return (
    <div className="space-y-4">
      {/* Polotno Editor */}
      <div className="rounded-xl border border-gray-200 overflow-hidden" style={{ height: "700px" }}>
        <PolotnoContainer style={{ width: "100%", height: "100%" }}>
          <SidePanelWrap>
            <SidePanel store={store} sections={sections} />
          </SidePanelWrap>
          <WorkspaceWrap>
            <Toolbar store={store} downloadButtonEnabled />
            <Workspace store={store} />
            <ZoomButtons store={store} />
          </WorkspaceWrap>
        </PolotnoContainer>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-primary text-primary text-sm font-semibold hover:bg-primary hover:text-white transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Download PNG
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
