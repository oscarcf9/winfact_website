"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CELL = 48;

type InteractiveGridProps = {
  className?: string;
};

export function InteractiveGrid({ className }: InteractiveGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onMove(e: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    function onLeave() {
      setPos(null);
    }

    // Listen on the parent section (hero container) so it works over text
    const section = el.closest("section");
    if (!section) return;

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
      aria-hidden="true"
    >
      {/* Base grid lines */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />

      {/* Spotlight that follows cursor — brightens grid near mouse */}
      {pos && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: pos.x - 80,
            top: pos.y - 80,
            width: 160,
            height: 160,
          }}
        >
          {/* Bright grid lines in spotlight area */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)
              `,
              backgroundSize: `${CELL}px ${CELL}px`,
              backgroundPosition: `${-(pos.x % CELL) + 80}px ${-(pos.y % CELL) + 80}px`,
              mask: `radial-gradient(circle at center, white 0%, white 30%, transparent 70%)`,
              WebkitMask: `radial-gradient(circle at center, white 0%, white 30%, transparent 70%)`,
            }}
          />
          {/* Subtle blue glow dot */}
          <div
            className="absolute inset-[25%] rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(17,104,217,0.12) 0%, transparent 70%)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
