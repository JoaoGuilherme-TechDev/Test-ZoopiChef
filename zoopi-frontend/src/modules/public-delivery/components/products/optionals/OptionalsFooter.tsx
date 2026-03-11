import { AlertCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { formatCurrency } from "@/lib/utils";

interface OptionalsFooterProps {
  totalPrice: number;
  isStepValid: boolean;
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onConfirm: () => void;
}

export function OptionalsFooter({
  totalPrice,
  isStepValid,
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  onConfirm
}: OptionalsFooterProps) {
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="p-8 border-t border-white/5 space-y-6 bg-[#050214]">
      <div className="flex justify-between items-end">
        <div className="space-y-0.5">
          <p className="text-[10px] text-white/30 font-black uppercase">Subtotal</p>
          <p className="text-2xl font-black text-blue-500 tracking-tighter">
            {formatCurrency(totalPrice)}
          </p>
        </div>
        
        {!isStepValid && (
          <div className="flex items-center gap-2 text-red-500 animate-pulse">
            <AlertCircle className="h-4 w-4" />
            <span className="text-[9px] font-black uppercase tracking-widest">
              Selecione para avançar
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {/* BOTÃO VOLTAR */}
        {currentStep > 0 && (
          <button 
            onClick={onPrev}
            className="flex-1 h-14 rounded-2xl border border-white/10 text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
        )}
        
        {/* BOTÃO PRÓXIMO OU FINALIZAR */}
        {isLastStep ? (
          <button 
            disabled={!isStepValid}
            onClick={onConfirm}
            className="flex-[2] h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-20 text-white font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Check className="h-4 w-4" /> Finalizar
          </button>
        ) : (
          <button 
            disabled={!isStepValid}
            onClick={onNext}
            className="flex-[2] h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-20 text-white font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            Próximo <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}