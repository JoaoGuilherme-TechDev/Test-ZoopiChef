import { useState } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MeatPreferences, MeatTexture, MeatFlavor, MeatDoneness } from '../types';
import { MEAT_TEXTURES, MEAT_FLAVORS, MEAT_DONENESS, BUDGET_OPTIONS } from '../types';

interface PreferencesScreenProps {
  onSubmit: (prefs: MeatPreferences) => void;
  onBack: () => void;
}

export function PreferencesScreen({ onSubmit, onBack }: PreferencesScreenProps) {
  const [texture, setTexture] = useState<MeatTexture | undefined>();
  const [flavor, setFlavor] = useState<MeatFlavor | undefined>();
  const [doneness, setDoneness] = useState<MeatDoneness | undefined>();
  const [budget, setBudget] = useState<'economico' | 'moderado' | 'premium'>('moderado');

  const handleSubmit = () => {
    onSubmit({ texture, flavor, doneness, budget });
  };

  const canProceed = texture || flavor || doneness;

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-red-950/30 via-background to-background">
      {/* Header */}
      <div className="text-center mb-6 pt-6">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-red-600/20 to-amber-600/20 mb-4">
          <Sparkles className="w-6 h-6 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Suas Preferências
        </h1>
        <p className="text-sm text-muted-foreground">
          Opcional - ajude-nos a encontrar o corte ideal
        </p>
      </div>

      {/* Preferences */}
      <div className="flex-1 overflow-y-auto space-y-6 max-w-md mx-auto w-full">
        {/* Texture */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Textura preferida</h3>
          <div className="flex flex-wrap gap-2">
            {MEAT_TEXTURES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTexture(texture === t.id ? undefined : t.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm transition-all",
                  texture === t.id
                    ? "bg-red-600 text-white"
                    : "bg-card/50 text-muted-foreground hover:bg-card hover:text-white"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flavor */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Intensidade de sabor</h3>
          <div className="flex flex-wrap gap-2">
            {MEAT_FLAVORS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFlavor(flavor === f.id ? undefined : f.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm transition-all",
                  flavor === f.id
                    ? "bg-red-600 text-white"
                    : "bg-card/50 text-muted-foreground hover:bg-card hover:text-white"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Doneness */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Ponto preferido</h3>
          <div className="flex flex-wrap gap-2">
            {MEAT_DONENESS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDoneness(doneness === d.id ? undefined : d.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm transition-all",
                  doneness === d.id
                    ? "bg-red-600 text-white"
                    : "bg-card/50 text-muted-foreground hover:bg-card hover:text-white"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Faixa de preço</h3>
          <div className="space-y-2">
            {BUDGET_OPTIONS.map((b) => (
              <button
                key={b.id}
                onClick={() => setBudget(b.id)}
                className={cn(
                  "w-full p-4 rounded-xl text-left transition-all",
                  budget === b.id
                    ? "bg-red-600/20 border border-red-500"
                    : "bg-card/50 border border-transparent hover:bg-card"
                )}
              >
                <span className="font-medium text-white">{b.label}</span>
                <p className="text-sm text-muted-foreground">{b.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-6 space-y-3 max-w-md mx-auto w-full">
        <Button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-600 hover:to-amber-500"
        >
          Continuar
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
