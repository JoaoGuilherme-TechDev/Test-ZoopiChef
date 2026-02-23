import { useState } from 'react';
import { ArrowLeft, ArrowRight, SkipForward, Users, Wine, Grape, Globe, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  WineType,
  WineBody,
  WINE_TYPE_OPTIONS,
  WINE_BODY_OPTIONS,
  calculateWineQuantity,
  EnhancedWineProfile,
} from '../types/wineTypes';
import { cn } from '@/lib/utils';

interface EnhancedProfileScreenProps {
  onSubmit: (profile: EnhancedWineProfile) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function EnhancedProfileScreen({ onSubmit, onSkip, onBack }: EnhancedProfileScreenProps) {
  const [wineType, setWineType] = useState<WineType | null>(null);
  const [body, setBody] = useState<WineBody | null>(null);
  const [numPeople, setNumPeople] = useState<number>(2);
  
  const wineCalc = calculateWineQuantity(numPeople);

  const handleSubmit = () => {
    onSubmit({
      wineType: wineType || undefined,
      body: body || undefined,
      numPeople,
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

      <div className="flex-1 flex flex-col items-center max-w-lg mx-auto w-full overflow-y-auto pb-24">
        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-2 animate-fade-in">
          Seu Perfil de Vinho
        </h2>
        <p className="text-muted-foreground text-center mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Nosso Sommelier com 40 anos de experiência vai encontrar o vinho perfeito
        </p>

        <div className="space-y-8 w-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {/* 1. Tipo de Vinho */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wine className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-medium text-white">Tipo de Vinho</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {WINE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setWineType(opt.value)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200",
                    wineType === opt.value
                      ? "bg-gradient-to-r from-purple-600/20 to-amber-600/20 border-purple-500 text-white shadow-lg"
                      : "bg-card border-purple-500/30 text-muted-foreground hover:border-purple-400/50 hover:text-white"
                  )}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="text-left">
                    <span className="font-medium">{opt.label}</span>
                    <div className={cn("w-4 h-4 rounded-full mt-1", opt.color)} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Sabor/Corpo */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Grape className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-medium text-white">Sabor do Corpo</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {WINE_BODY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBody(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition-all duration-200",
                    body === opt.value
                      ? "bg-gradient-to-r from-purple-600/20 to-amber-600/20 border-amber-500 text-white shadow-lg"
                      : "bg-card border-amber-500/30 text-muted-foreground hover:border-amber-400/50 hover:text-white"
                  )}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-center opacity-70">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Quantidade de Pessoas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-medium text-white">Quantas Pessoas?</h3>
            </div>
            <div className="bg-card/50 rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNumPeople(Math.max(1, numPeople - 1))}
                  className="h-10 w-10"
                >
                  -
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={numPeople}
                  onChange={(e) => setNumPeople(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-center text-xl font-bold w-20"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNumPeople(numPeople + 1)}
                  className="h-10 w-10"
                >
                  +
                </Button>
              </div>
              
              {/* Recomendação de quantidade */}
              <div className="mt-4 p-3 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-lg border border-green-500/20">
                <p className="text-sm text-green-300 font-medium">
                  🍷 {wineCalc.recommendation}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Base: 375ml por pessoa (meia garrafa)
                </p>
              </div>
            </div>
          </div>

          {/* Info sobre IA */}
          <div className="bg-gradient-to-r from-purple-900/20 to-amber-900/20 rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🎓</div>
              <div>
                <h4 className="font-medium text-white mb-1">Sommelier com 40 Anos de Experiência</h4>
                <p className="text-xs text-muted-foreground">
                  A IA irá sugerir automaticamente os melhores tipos de <strong>uvas</strong> 🍇, 
                  <strong> países</strong> 🌍 e <strong>regiões</strong> 📍 com base nas suas preferências
                  e no prato escolhido. Confie na experiência!
                </p>
              </div>
            </div>
          </div>
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
