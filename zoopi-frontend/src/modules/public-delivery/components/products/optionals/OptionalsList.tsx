import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatCurrency } from "@/lib/utils";

interface OptionalsListProps {
  group: any;
  selections: Record<string, number>;
  currentGroupTotal: number;
  onItemAction: (item: any) => void;
  onUpdateQty: (e: React.MouseEvent, item: any, delta: number) => void;
}

export function OptionalsList({
  group,
  selections,
  currentGroupTotal,
  onItemAction,
  onUpdateQty
}: OptionalsListProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-6 pb-2">
        <h3 className="text-base font-black uppercase text-white">{group.name}</h3>
        <p className="text-[10px] text-white/40 font-bold uppercase mt-1">
          {group.min_qty > 0 
            ? `Obrigatório • Selecione pelo menos ${group.min_qty}` 
            : `Opcional • Máximo ${group.max_qty} opções`}
        </p>
      </div>

      <ScrollArea className="flex-1 px-5">
        <div className="py-4 space-y-2">
          {group.items?.map((item: any) => {
            const qty = selections[item.id] || 0;
            const isSelected = qty > 0;
            const isMulti = group.max_qty > 1;

            return (
              <div 
                key={item.id}
                onClick={() => onItemAction(item)}
                className={cn(
                  "w-full p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                  isSelected ? "border-blue-500 bg-[#0d0b1a]" : "border-white/5 bg-[#0d0b1a] hover:bg-[#121021]"
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* ÍCONE SELEÇÃO ÚNICA OU BOTÃO DE QUANTIDADE */}
                  {!isMulti ? (
                    <div className={cn(
                      "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0",
                      isSelected ? "border-blue-500 bg-blue-500" : "border-white/10"
                    )}>
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  ) : (
                    <div 
                      className="flex items-center gap-3 bg-black/40 rounded-xl p-1 border border-white/10" 
                      onClick={e => e.stopPropagation()}
                    >
                      <button 
                        onClick={(e) => onUpdateQty(e, item, -1)} 
                        className="h-7 w-7 flex items-center justify-center bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Minus className="h-3 w-3 text-white"/>
                      </button>
                      <span className="text-xs font-black w-4 text-center text-white">{qty}</span>
                      <button 
                        onClick={(e) => onUpdateQty(e, item, 1)} 
                        className="h-7 w-7 flex items-center justify-center bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                        disabled={currentGroupTotal >= group.max_qty && qty === 0}
                      >
                        <Plus className="h-3 w-3 text-white"/>
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className={cn(
                      "text-xs font-bold uppercase", 
                      isSelected ? "text-white" : "text-white/60"
                    )}>
                      {item.name}
                    </span>
                    <span className="text-[10px] font-black text-blue-500">
                      + {formatCurrency(item.price)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}