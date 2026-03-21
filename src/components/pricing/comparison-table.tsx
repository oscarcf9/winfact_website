"use client";

import { useState } from "react";
import { Check, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "@/components/ui/animated-section";

const COMPARISON_FEATURES = [
  { key: "Daily VIP Picks", free: false, weekly: true, monthly: true },
  { key: "All Sports Covered", free: false, weekly: true, monthly: true },
  { key: "Bilingual Analysis (EN/ES)", free: false, weekly: true, monthly: true },
  { key: "Mobile App Access", free: false, weekly: true, monthly: true },
  { key: "Community Access", free: true, weekly: true, monthly: true },
  { key: "Member Dashboard", free: false, weekly: true, monthly: true },
  { key: "Performance Dashboard", free: false, weekly: false, monthly: true },
  { key: "Pick History & Filters", free: false, weekly: false, monthly: true },
  { key: "Priority Support", free: false, weekly: false, monthly: true },
  { key: "PICK80 Promo (80% off)", free: false, weekly: true, monthly: true },
  { key: "Sport Analysis Newsletter", free: true, weekly: true, monthly: true },
] as const;

type ColumnKey = "free" | "weekly" | "monthly";

const COLUMNS: { key: ColumnKey; label: string; highlight?: boolean }[] = [
  { key: "free", label: "Free" },
  { key: "weekly", label: "VIP Weekly" },
  { key: "monthly", label: "VIP Monthly", highlight: true },
];

export function ComparisonTable({
  tierNames,
}: {
  tierNames: [string, string, string];
}) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<ColumnKey | null>(null);

  return (
    <div className="max-w-4xl mx-auto overflow-x-auto">
      <AnimatedSection direction="up" delay={0.1}>
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left py-4 px-5 font-semibold text-navy w-[40%] bg-transparent" />
              {COLUMNS.map((col, ci) => (
                <th
                  key={col.key}
                  onMouseEnter={() => setHoveredCol(col.key)}
                  onMouseLeave={() => setHoveredCol(null)}
                  className={cn(
                    "text-center py-4 px-5 font-bold text-sm uppercase tracking-wider transition-colors duration-200 rounded-t-xl",
                    col.highlight
                      ? "bg-primary text-white"
                      : hoveredCol === col.key
                      ? "bg-primary/10 text-primary"
                      : "text-navy bg-gray-50/80"
                  )}
                >
                  {tierNames[ci]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_FEATURES.map((feature, idx) => {
              const isLast = idx === COMPARISON_FEATURES.length - 1;
              return (
                <tr
                  key={idx}
                  onMouseEnter={() => setHoveredRow(idx)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={cn(
                    "transition-colors duration-200 group",
                    hoveredRow === idx ? "bg-primary/5" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  )}
                >
                  <td
                    className={cn(
                      "py-3.5 px-5 font-medium border-b border-gray-100 transition-colors duration-200",
                      hoveredRow === idx ? "text-primary" : "text-gray-700"
                    )}
                  >
                    {feature.key}
                  </td>
                  {COLUMNS.map((col) => {
                    const value = feature[col.key];
                    return (
                      <td
                        key={col.key}
                        onMouseEnter={() => setHoveredCol(col.key)}
                        onMouseLeave={() => setHoveredCol(null)}
                        className={cn(
                          "py-3.5 px-5 text-center border-b border-gray-100 transition-all duration-200",
                          col.highlight && "bg-primary/5",
                          hoveredCol === col.key && !col.highlight && "bg-primary/5",
                          isLast && col.highlight && "rounded-b-xl"
                        )}
                      >
                        <div className={cn(
                          "inline-flex items-center justify-center w-7 h-7 rounded-full transition-transform duration-200",
                          hoveredRow === idx && "scale-110",
                          value ? "bg-success/10" : "bg-gray-100"
                        )}>
                          {value ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <XIcon className="h-3.5 w-3.5 text-gray-300" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </AnimatedSection>
    </div>
  );
}
