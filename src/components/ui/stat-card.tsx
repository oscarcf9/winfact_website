import { cn } from "@/lib/utils";

type StatCardProps = {
  value: string;
  label: string;
  className?: string;
};

export function StatCard({ value, label, className }: StatCardProps) {
  return (
    <div className={cn("text-center", className)}>
      <div className="font-mono text-4xl font-bold tracking-tight text-accent">
        {value}
      </div>
      <div className="mt-1 text-sm text-gray-400 font-medium">{label}</div>
    </div>
  );
}
