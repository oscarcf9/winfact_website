import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-2xl p-6 transition-all duration-200", {
  variants: {
    variant: {
      default: "bg-white border border-gray-100 shadow-sm hover:shadow-md",
      navy: "bg-navy text-white border border-white/10",
      glass: "bg-white/10 backdrop-blur-md border border-white/20 text-white",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type CardProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants>;

function Card({ className, variant, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, className }))} {...props} />
  );
}

function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}

function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 pt-4 border-t border-gray-100", className)} {...props} />;
}

export { Card, CardHeader, CardContent, CardFooter, cardVariants };
