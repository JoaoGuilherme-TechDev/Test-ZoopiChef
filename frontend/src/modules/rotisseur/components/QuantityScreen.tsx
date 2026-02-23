import { useState } from 'react';
import { Users, ChevronRight, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuantityScreenProps {
  onSubmit: (numberOfPeople: number) => void;
  onBack: () => void;
}

export function QuantityScreen({ onSubmit, onBack }: QuantityScreenProps) {
  const [numberOfPeople, setNumberOfPeople] = useState(4);

  const increment = () => setNumberOfPeople((prev) => Math.min(prev + 1, 50));
  const decrement = () => setNumberOfPeople((prev) => Math.max(prev - 1, 1));

  const presets = [2, 4, 6, 8, 10, 15, 20];

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-red-950/30 via-background to-background">
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-red-600/20 to-amber-600/20 mb-4">
          <Users className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Quantas pessoas?
        </h1>
        <p className="text-muted-foreground">
          Vou calcular a quantidade ideal de cada item
        </p>
      </div>

      {/* Counter */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-md mx-auto w-full">
        {/* Main counter */}
        <div className="flex items-center gap-6">
          <button
            onClick={decrement}
            disabled={numberOfPeople <= 1}
            className={cn(
              "p-4 rounded-full bg-card/50 border border-white/10 transition-all",
              numberOfPeople > 1 ? "hover:bg-red-600/20 hover:border-red-500/50" : "opacity-50"
            )}
          >
            <Minus className="w-6 h-6" />
          </button>

          <div className="text-center">
            <span className="text-6xl font-bold text-white">{numberOfPeople}</span>
            <p className="text-muted-foreground mt-2">
              {numberOfPeople === 1 ? 'pessoa' : 'pessoas'}
            </p>
          </div>

          <button
            onClick={increment}
            disabled={numberOfPeople >= 50}
            className={cn(
              "p-4 rounded-full bg-card/50 border border-white/10 transition-all",
              numberOfPeople < 50 ? "hover:bg-red-600/20 hover:border-red-500/50" : "opacity-50"
            )}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap justify-center gap-2">
          {presets.map((num) => (
            <button
              key={num}
              onClick={() => setNumberOfPeople(num)}
              className={cn(
                "px-4 py-2 rounded-full text-sm transition-all",
                numberOfPeople === num
                  ? "bg-red-600 text-white"
                  : "bg-card/50 text-muted-foreground hover:bg-card hover:text-white"
              )}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Estimate */}
        <div className="bg-card/30 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Estimativa base</p>
          <p className="text-white">
            ~<span className="font-bold">{(numberOfPeople * 400 / 1000).toFixed(1)}kg</span> de carne total
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            (≈400g por pessoa)
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-6 space-y-3 max-w-md mx-auto w-full">
        <Button
          onClick={() => onSubmit(numberOfPeople)}
          className="w-full bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-600 hover:to-amber-500"
        >
          Ver Recomendações
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
        <button
          onClick={onBack}
          className="w-full text-muted-foreground hover:text-white transition-colors text-sm py-2"
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}
