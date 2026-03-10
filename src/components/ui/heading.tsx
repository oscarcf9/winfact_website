import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const headingVariants = cva("font-heading font-bold tracking-tight", {
  variants: {
    size: {
      h1: "text-4xl md:text-5xl lg:text-6xl",
      h2: "text-3xl md:text-4xl",
      h3: "text-2xl md:text-3xl",
      h4: "text-xl md:text-2xl",
      h5: "text-lg md:text-xl",
      h6: "text-base md:text-lg",
    },
  },
  defaultVariants: {
    size: "h2",
  },
});

type HeadingProps = HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof headingVariants> & {
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  };

export function Heading({ as, size, className, ...props }: HeadingProps) {
  const Component = as || size || "h2";
  return (
    <Component
      className={cn(headingVariants({ size: size || as, className }))}
      {...props}
    />
  );
}
