import { cn } from "@/lib/utils";

type PatternProps = {
  className?: string;
};

export function DotPattern({ className }: PatternProps) {
  return (
    <div
      className={cn("absolute inset-0 bg-dot-pattern pointer-events-none", className)}
      aria-hidden="true"
    />
  );
}

export function GridPattern({ className }: PatternProps) {
  return (
    <div
      className={cn("absolute inset-0 bg-grid-pattern pointer-events-none", className)}
      aria-hidden="true"
    />
  );
}

type GradientOrbProps = {
  color?: "primary" | "accent";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const orbSizes = {
  sm: "w-48 h-48",
  md: "w-72 h-72",
  lg: "w-96 h-96",
};

const orbColors = {
  primary: "bg-primary/20",
  accent: "bg-accent/15",
};

export function GradientOrb({
  color = "primary",
  size = "md",
  className,
}: GradientOrbProps) {
  return (
    <div
      className={cn(
        "absolute rounded-full blur-3xl pointer-events-none animate-breathe",
        orbSizes[size],
        orbColors[color],
        className
      )}
      aria-hidden="true"
    />
  );
}
