import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type GradientTextProps = HTMLAttributes<HTMLSpanElement> & {
  shimmer?: boolean;
  variant?: "primary" | "accent";
};

export function GradientText({
  shimmer = false,
  variant = "primary",
  className,
  ...props
}: GradientTextProps) {
  return (
    <span
      className={cn(
        variant === "primary" ? "text-gradient-primary" : "text-gradient-accent",
        shimmer && "animate-shimmer",
        className
      )}
      {...props}
    />
  );
}
