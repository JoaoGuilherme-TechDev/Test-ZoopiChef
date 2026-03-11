// ================================================================
// FILE: waiter/components/waitlist/WaitlistCard.tsx
// Individual entry card in the waiting list
// ================================================================

import { Bell, Users, Clock, MapPin, UserX, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WaitlistEntry } from "../../types";

interface WaitlistCardProps {
  entry: WaitlistEntry;
  position: number;
  onNotify: () => void;
  onSeat: () => void;
  onCancel: (noShow: boolean) => void;
  isNotifying: boolean;
  isSeating: boolean;
  isCancelling: boolean;
}

export function WaitlistCard({
  entry,
  position,
  onNotify,
  onSeat,
  onCancel,
  isNotifying,
  isSeating,
  isCancelling,
}: WaitlistCardProps) {
  const isNotified = entry.status === "notified";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all duration-200",
        isNotified
          ? "border-green-500/40 bg-green-500/5"
          : "border-border/60 bg-muted/20"
      )}
    >
      <div className="flex items-start gap-3">

        {/* Position / bell badge */}
        <div
          className={cn(
            "shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold border",
            isNotified
              ? "bg-green-500/15 border-green-500/30 text-green-400"
              : "bg-muted border-border/60 text-muted-foreground"
          )}
        >
          {isNotified ? <Bell className="h-4 w-4" /> : <span>#{position}</span>}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{entry.customer_name}</span>
            {isNotified && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 font-medium flex items-center gap-1">
                <Bell className="h-2.5 w-2.5" />
                Chamado
              </span>
            )}
            {isNotified && entry.assignedTable && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 font-medium flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" />
                Mesa {entry.assignedTable.number}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {entry.party_size} {entry.party_size === 1 ? "pessoa" : "pessoas"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(entry.requested_at), {
                addSuffix: false,
                locale: ptBR,
              })}
            </span>
            {entry.customer_phone && (
              <span className="hidden sm:flex items-center gap-1 truncate max-w-[140px]">
                {entry.customer_phone}
              </span>
            )}
          </div>

          {entry.special_requests && (
            <p className="mt-1.5 text-xs text-muted-foreground italic truncate">
              "{entry.special_requests}"
            </p>
          )}
        </div>

        {/* Remove / no-show */}
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive"
          onClick={() => onCancel(isNotified)}
          disabled={isCancelling}
          title={isNotified ? "Não compareceu" : "Remover da fila"}
        >
          {isCancelling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserX className="h-4 w-4" />
          )}
        </Button>

      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
        {!isNotified && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 rounded-xl text-xs font-semibold"
            onClick={onNotify}
            disabled={isNotifying}
          >
            {isNotifying ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Bell className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isNotifying ? "Chamando..." : "Chamar"}
          </Button>
        )}
        {isNotified && (
          <Button
            size="sm"
            className="flex-1 h-8 rounded-xl text-xs font-semibold"
            onClick={onSeat}
            disabled={isSeating}
          >
            {isSeating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isSeating ? "Acomodando..." : "Acomodar"}
          </Button>
        )}
      </div>
    </div>
  );
}