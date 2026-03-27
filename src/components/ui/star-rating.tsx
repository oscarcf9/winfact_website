"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
};

export function StarRating({ value, onChange, size = "md", readonly = false }: Props) {
  const sizes = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-6 w-6" };
  const gaps = { sm: "gap-0.5", md: "gap-0.5", lg: "gap-1" };

  return (
    <div className={cn("flex items-center", gaps[size])}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(value === star ? 0 : star)}
          className={cn(
            "transition-all duration-150",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={cn(
              sizes[size],
              star <= value
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * Convert old confidence text to stars for backward compatibility.
 */
export function confidenceToStars(confidence: string | null | undefined): number {
  if (!confidence) return 0;
  switch (confidence) {
    case "top": return 5;
    case "strong": return 3;
    case "standard": return 2;
    default: return 0;
  }
}

/**
 * Format stars as emoji string for Telegram/text.
 */
export function starsToEmoji(stars: number): string {
  return "\u2B50".repeat(stars);
}
