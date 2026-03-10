"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type StepProps = {
  index: number;
  children: ReactNode;
  isLast?: boolean;
};

function TimelineStep({ index, children, isLast }: StepProps) {
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
    <div ref={ref} className="relative">
      {/* Timeline connector — visible on lg+ */}
      <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-16">
        {/* Vertical line */}
        <div
          className={cn(
            "absolute left-[1.9375rem] top-8 w-0.5 bg-primary/20 origin-top transition-transform duration-700 ease-out",
            isLast ? "bottom-0" : "-bottom-12",
            visible ? "scale-y-100" : "scale-y-0"
          )}
          style={{ transitionDelay: "0.4s" }}
        />
        {/* Step dot */}
        <div
          className={cn(
            "absolute left-4 top-1 w-4 h-4 rounded-full border-[3px] border-primary transition-all duration-500",
            visible
              ? "bg-primary scale-100 shadow-[0_0_12px_rgba(17,104,217,0.4)]"
              : "bg-transparent scale-0"
          )}
          style={{ transitionDelay: "0.2s" }}
        />
      </div>

      {/* Content */}
      <div
        className={cn(
          "lg:pl-24 transition-all duration-700 ease-out",
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        )}
        style={{ transitionDelay: `${0.15 * index}s` }}
      >
        {children}
      </div>
    </div>
  );
}

type StepsTimelineProps = {
  children: ReactNode[];
};

export function StepsTimeline({ children }: StepsTimelineProps) {
  return (
    <div className="relative space-y-16 md:space-y-24 max-w-6xl mx-auto">
      {children.map((child, i) => (
        <TimelineStep key={i} index={i} isLast={i === children.length - 1}>
          {child}
        </TimelineStep>
      ))}
    </div>
  );
}

type StaggeredListProps = {
  children: ReactNode[];
  className?: string;
};

export function StaggeredList({ children, className }: StaggeredListProps) {
  const ref = useRef<HTMLUListElement>(null);
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
      { rootMargin: "-40px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <ul ref={ref} className={cn("space-y-2.5", className)}>
      {children.map((child, i) => (
        <li
          key={i}
          className={cn(
            "transition-all duration-500 ease-out",
            visible
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4"
          )}
          style={{ transitionDelay: visible ? `${0.3 + i * 0.08}s` : "0s" }}
        >
          {child}
        </li>
      ))}
    </ul>
  );
}

type ScaleInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function ScaleIn({ children, className, delay = 0.1 }: ScaleInProps) {
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
      { rootMargin: "-40px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        visible
          ? "opacity-100 scale-100 rotate-0"
          : "opacity-0 scale-90 rotate-1",
        className
      )}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
