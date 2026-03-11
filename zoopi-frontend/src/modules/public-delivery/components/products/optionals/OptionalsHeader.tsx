import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface OptionalsHeaderProps {
  productName: string;
  totalSteps: number;
  currentStep: number;
}

export function OptionalsHeader({ 
  productName, 
  totalSteps, 
  currentStep 
}: OptionalsHeaderProps) {
  return (
    <div className="p-6 space-y-2">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">
            Personalizando
          </span>
          <DialogTitle className="text-xl font-black uppercase text-white leading-tight">
            {productName}
          </DialogTitle>
        </div>
      </div>

      {/* INDICADOR DE PASSOS (PILLS) */}
      {totalSteps > 1 && (
        <div className="flex gap-1.5 pt-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                i === currentStep 
                  ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                  : i < currentStep 
                    ? "bg-emerald-500" 
                    : "bg-white/10"
              )} 
            />
          ))}
        </div>
      )}
    </div>
  );
}