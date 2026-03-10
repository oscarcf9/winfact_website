"use client";

import { type ReactNode, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AnimatedCardProps = {
  children: ReactNode;
  index?: number;
  className?: string;
  hoverGlow?: boolean;
};

export function AnimatedCard({
  children,
  index = 0,
  className,
  hoverGlow = false,
}: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-60px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        visible ? "animate-fade-up" : "opacity-0",
        "transition-transform duration-200 hover:-translate-y-1.5",
        hoverGlow && "hover:glow-primary",
        className
      )}
      style={visible ? { animationDelay: `${index * 0.1}s` } : undefined}
    >
      {children}
    </div>
  );
}
