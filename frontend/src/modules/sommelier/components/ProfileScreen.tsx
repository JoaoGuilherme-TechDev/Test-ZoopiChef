import { useState } from 'react';
import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  WineProfile,
  WineIntensity,
  WineSweetness,
  WineOccasion,
  INTENSITY_LABELS,
  SWEETNESS_LABELS,
  OCCASION_LABELS,
} from '../types';
import { cn } from '@/lib/utils';

interface ProfileScreenProps {
  onSubmit: (profile: WineProfile) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function ProfileScreen({ onSubmit, onSkip, onBack }: ProfileScreenProps) {
  const [intensity, setIntensity] = useState<WineIntensity | null>(null);
  const [sweetness, setSweetness] = useState<WineSweetness | null>(null);
  const [occasion, setOccasion] = useState<WineOccasion | null>(null);

  const handleSubmit = () => {
    onSubmit({
      intensity: intensity || undefined,
      sweetness: sweetness || undefined,
      occasion: occasion || undefined,
    });
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-purple-950/30 via-background to-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground hover:text-white"
        >
          Pular
          <SkipForward className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center max-w-lg mx-auto w-full">
        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-2 animate-fade-in">
          Seu Perfil de Vinho
        </h2>
        <p className="text-muted-foreground text-center mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Opcional — nos ajuda a personalizar suas recomendações
        </p>

        {/* Questions */}
        <div className="space-y-8 w-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {/* Intensity */}
          <ProfileQuestion
            title="Intensidade"
            options={Object.entries(INTENSITY_LABELS).map(([value, label]) => ({
              value: value as WineIntensity,
              label,
            }))}
            selected={intensity}
            onSelect={(val) => setIntensity(val as WineIntensity)}
          />

          {/* Sweetness */}
          <ProfileQuestion
            title="Doçura"
            options={Object.entries(SWEETNESS_LABELS).map(([value, label]) => ({
              value: value as WineSweetness,
              label,
            }))}
            selected={sweetness}
            onSelect={(val) => setSweetness(val as WineSweetness)}
          />

          {/* Occasion */}
          <ProfileQuestion
            title="Ocasião"
            options={Object.entries(OCCASION_LABELS).map(([value, label]) => ({
              value: value as WineOccasion,
              label,
            }))}
            selected={occasion}
            onSelect={(val) => setOccasion(val as WineOccasion)}
          />
        </div>

        {/* Continue Button */}
        <Button
          size="lg"
          onClick={handleSubmit}
          className="mt-10 bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-semibold px-8 py-6 rounded-xl shadow-neon-mixed"
        >
          Continuar
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

interface ProfileQuestionProps<T extends string> {
  title: string;
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T) => void;
}

function ProfileQuestion<T extends string>({
  title,
  options,
  selected,
  onSelect,
}: ProfileQuestionProps<T>) {
  return (
    <div>
      <h3 className="text-lg font-medium text-white mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={cn(
              "px-4 py-2 rounded-full border transition-all duration-200",
              selected === opt.value
                ? "bg-gradient-to-r from-purple-600 to-amber-600 border-transparent text-white shadow-neon-mixed"
                : "bg-card border-purple-500/30 text-muted-foreground hover:border-purple-400/50 hover:text-white"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
