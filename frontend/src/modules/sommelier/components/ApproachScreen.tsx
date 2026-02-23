import { Wine, UtensilsCrossed, Sparkles } from 'lucide-react';
import { SommelierSettings, SommelierApproach } from '../types';
import { cn } from '@/lib/utils';

interface ApproachScreenProps {
  settings: SommelierSettings | null;
  onSelectApproach: (approach: SommelierApproach) => void;
  onBack: () => void;
}

export function ApproachScreen({ settings, onSelectApproach, onBack }: ApproachScreenProps) {
  const approaches = [
    {
      id: 'wine_first' as const,
      icon: Wine,
      title: 'Quero escolher um vinho',
      description: 'Responda algumas perguntas e descubra o vinho ideal para você',
      gradient: 'from-purple-600 to-purple-800',
      shadowColor: 'shadow-purple-500/30',
    },
    {
      id: 'food_first' as const,
      icon: UtensilsCrossed,
      title: 'Quero harmonizar com minha refeição',
      description: 'Diga o que vai comer e receba sugestões de vinhos perfeitos',
      gradient: 'from-amber-500 to-orange-600',
      shadowColor: 'shadow-amber-500/30',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-purple-950/30 via-background to-background">
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-purple-600/20 to-amber-600/20 mb-4">
          <Sparkles className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Como posso ajudar?
        </h1>
        <p className="text-muted-foreground">
          Escolha como deseja começar sua experiência
        </p>
      </div>

      {/* Options */}
      <div className="flex-1 flex flex-col justify-center gap-4 max-w-md mx-auto w-full">
        {approaches.map((approach, index) => (
          <button
            key={approach.id}
            onClick={() => onSelectApproach(approach.id)}
            className={cn(
              "group relative p-6 rounded-2xl border border-white/10 bg-card/50 backdrop-blur-sm",
              "hover:border-white/20 hover:bg-card/80 transition-all duration-300",
              "animate-in fade-in slide-in-from-bottom",
              approach.shadowColor,
              "hover:shadow-lg"
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                "p-4 rounded-xl bg-gradient-to-br",
                approach.gradient,
                "group-hover:scale-110 transition-transform duration-300"
              )}>
                <approach.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors">
                  {approach.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {approach.description}
                </p>
              </div>
            </div>

            {/* Hover indicator */}
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-purple-500/50 transition-all duration-300 pointer-events-none" />
          </button>
        ))}
      </div>

      {/* Back button */}
      <div className="pt-6 text-center">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-white transition-colors text-sm"
        >
          ← Voltar
        </button>
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-5 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
        <div className="absolute bottom-1/4 right-5 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
      </div>
    </div>
  );
}
