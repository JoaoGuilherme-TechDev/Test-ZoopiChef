// ================================================================
// FILE: waiter/components/dashboard/MenuCard.tsx
// Navigation card shown on the WaiterDashboard
// ================================================================

import { LucideIcon, ChevronRight } from "lucide-react";

interface MenuCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  stat: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentHover: string;
  onClick: () => void;
}

export function MenuCard({
  title,
  description,
  icon: Icon,
  stat,
  accent,
  accentBg,
  accentBorder,
  accentHover,
  onClick,
}: MenuCardProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full rounded-2xl border text-left transition-all duration-200 overflow-hidden"
      style={{ borderColor: accentBorder, background: accentBg }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = accentHover)
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = accentBg)
      }
    >
      <div className="flex items-center gap-4 p-5">
        <div
          className="shrink-0 h-12 w-12 rounded-xl flex items-center justify-center"
          style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm sm:text-base">{title}</h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full border font-medium"
              style={{ color: accent, borderColor: accentBorder, background: accentBg }}
            >
              {stat}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        </div>

        <ChevronRight className="shrink-0 h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}