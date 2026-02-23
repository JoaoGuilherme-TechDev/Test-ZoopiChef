import { Button } from '@/components/ui/button';
import { LayoutGrid, Users, AlertCircle, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableStatusLegendProps {
  onFilterChange?: (status: string | null) => void;
  activeFilter?: string | null;
}

const legendItems = [
  { 
    status: 'free', 
    color: 'bg-green-500', 
    label: 'Livre',
    icon: LayoutGrid 
  },
  { 
    status: 'open', 
    color: 'bg-blue-500', 
    label: 'Ocupada',
    icon: Users 
  },
  { 
    status: 'idle_warning', 
    color: 'bg-yellow-500', 
    label: 'Sem consumo',
    icon: AlertCircle 
  },
  { 
    status: 'bill_requested', 
    color: 'bg-red-500', 
    label: 'Conta pedida',
    icon: Receipt 
  },
];

export function TableStatusLegend({ onFilterChange, activeFilter }: TableStatusLegendProps) {
  return (
    <div className="flex flex-wrap gap-3 p-4 bg-card rounded-lg border">
      <span className="text-sm font-medium text-muted-foreground mr-2">Legenda:</span>
      {onFilterChange && (
        <Button
          variant={activeFilter === null ? 'default' : 'ghost'}
          size="sm"
          className="h-7"
          onClick={() => onFilterChange(null)}
        >
          Todas
        </Button>
      )}
      {legendItems.map((item) => (
        <div 
          key={item.status} 
          className={cn(
            "flex items-center gap-2 cursor-pointer px-2 py-1 rounded",
            onFilterChange && "hover:bg-muted",
            activeFilter === item.status && "bg-muted ring-2 ring-primary"
          )}
          onClick={() => onFilterChange?.(item.status)}
        >
          <div className={`w-4 h-4 rounded ${item.color}`} />
          <div className="flex items-center gap-1 text-sm">
            <item.icon className="h-3 w-3 text-muted-foreground" />
            <span>{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
