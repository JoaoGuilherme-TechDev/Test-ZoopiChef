// ================================================================
// FILE: waiter/components/waitlist/NextSeatableAlert.tsx
// Banner that highlights the next customer who can be seated.
// Only shown when there is a free table matching the next party size.
// ================================================================

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaitlistEntry, AvailableTable } from "../../types";

interface NextSeatableAlertProps {
  entry: WaitlistEntry;
  table: AvailableTable;
  isLoading: boolean;
  onNotify: () => void;
}

export function NextSeatableAlert({
  entry,
  table,
  isLoading,
  onNotify,
}: NextSeatableAlertProps) {
  return (
    <div className="container mx-auto px-4 pt-4 max-w-lg">
      <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Mesa disponível!</p>
          <p className="text-xs text-muted-foreground truncate">
            {entry.customer_name} · {entry.party_size} pessoas · Mesa {table.number}
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 rounded-xl text-xs shrink-0"
          disabled={isLoading}
          onClick={onNotify}
        >
          Chamar
        </Button>
      </div>
    </div>
  );
}