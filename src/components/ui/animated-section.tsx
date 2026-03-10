"use client";

import { type ReactNode, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "none";

type AnimatedSectionProps = {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
};

const animationClass: Record<Direction, string> = {
  up: "animate-fade-up",
  down: "animate-fade-down",
  left: "animate-fade-left",
  right: "animate-fade-right",
  none: "animate-fade-none",
};

export function AnimatedSection({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  className,
  once = true,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { rootMargin: "-80px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={cn(
        visible ? animationClass[direction] : "opacity-0",
        className
      )}
      style={
        visible
          ? { animationDuration: `${duration}s`, animationDelay: `${delay}s` }
          : undefined
      }
    >
      {children}
    </div>
  );
}
