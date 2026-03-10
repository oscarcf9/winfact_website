import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const sectionVariants = cva("", {
  variants: {
    bg: {
      white: "bg-white",
      light: "bg-bg-light",
      navy: "bg-navy text-white",
      gradient: "bg-gradient-to-br from-navy via-[#0f3d7a] to-primary text-white",
      dark: "bg-[#050d1a] text-white",
      "navy-gradient":
        "bg-gradient-to-b from-navy via-[#0a1a30] to-[#050d1a] text-white",
    },
    spacing: {
      default: "py-16 md:py-24",
      tight: "py-10 md:py-14",
      generous: "py-20 md:py-32",
      hero: "pt-28 pb-16 md:pt-40 md:pb-24",
      "page-hero": "pt-32 pb-16 md:pt-44 md:pb-24",
    },
  },
  defaultVariants: {
    bg: "white",
    spacing: "default",
  },
});

type SectionProps = HTMLAttributes<HTMLElement> &
  VariantProps<typeof sectionVariants>;

export function Section({ bg, spacing, className, ...props }: SectionProps) {
  return (
    <section
      className={cn(sectionVariants({ bg, spacing, className }))}
      {...props}
    />
  );
}
