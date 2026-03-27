import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800",
        sport: "text-white",
        confidence: "",
        result: "",
        tier: "",
      },
      confidence: {
        top: "bg-accent/10 text-accent border border-accent",
        strong: "bg-primary/10 text-primary border border-primary",
        standard: "bg-gray-100 text-gray-600 border border-gray-200",
      },
      result: {
        win: "bg-success/10 text-success",
        loss: "bg-danger/10 text-danger",
        push: "bg-warning/10 text-warning",
        void: "bg-gray-100 text-gray-400",
        pending: "bg-gray-100 text-gray-500",
      },
      tier: {
        free: "bg-gray-100 text-gray-700",
        vip: "bg-accent/10 text-accent border border-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    sportColor?: string;
  };

function Badge({ className, variant, confidence, result, tier, sportColor, style, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, confidence, result, tier, className }))}
      style={sportColor ? { backgroundColor: sportColor, color: "#fff", ...style } : style}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
