// ================================================================
// FILE: waiter/components/shared/StatFilterBar.tsx
// Horizontally scrollable row of stat cards used as filters.
// Used by both WaiterTablesPage and WaiterComandasPage.
// ================================================================

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  dotClass: string;
  active: boolean;
  onClick: () => void;
}

export function StatCard({ label, value, dotClass, active, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 min-w-[90px] rounded-xl border p-3 text-left transition-all duration-150",
        active
          ? "border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/30"
          : "border-border/40 bg-muted/10 hover:border-border/70"
      )}
    >
      <p className="text-xl font-black leading-none">{value}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className={cn("h-2 w-2 rounded-full shrink-0", dotClass)} />
        <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
      </div>
    </button>
  );
}

interface StatFilterBarProps {
  filters: { key: string; label: string; dotClass: string }[];
  counts: Record<string, number>;
  activeFilter: string;
  onFilterChange: (key: string) => void;
}

export function StatFilterBar({
  filters,
  counts,
  activeFilter,
  onFilterChange,
}: StatFilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
      {filters.map(({ key, label, dotClass }) => (
        <StatCard
          key={key}
          label={label}
          value={counts[key] ?? 0}
          dotClass={dotClass}
          active={activeFilter === key}
          onClick={() => onFilterChange(key)}
        />
      ))}
    </div>
  );
}