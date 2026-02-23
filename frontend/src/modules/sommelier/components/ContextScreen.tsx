import { UtensilsCrossed, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConsumptionContext, SommelierSettings } from '../types';
import { cn } from '@/lib/utils';

interface ContextScreenProps {
  settings: SommelierSettings | null;
  onSelectContext: (context: ConsumptionContext) => void;
  onBack?: () => void;
}

export function ContextScreen({ settings, onSelectContext, onBack }: ContextScreenProps) {
  const question = settings?.context_question || 'Como você vai consumir o vinho?';

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-purple-950/30 via-background to-background">
      {/* Back button */}
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="self-start mb-4 text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      )}

      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
        {/* Question */}
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3 animate-fade-in">
          {question}
        </h2>
        <p className="text-muted-foreground text-center mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Isso nos ajuda a sugerir harmonizações perfeitas
        </p>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <ContextOption
            icon={<UtensilsCrossed className="w-8 h-8" />}
            title="Comer aqui"
            description="Pratos e harmonizações para consumo no local"
            gradient="from-purple-600 to-purple-800"
            onClick={() => onSelectContext('local')}
          />
          <ContextOption
            icon={<ShoppingBag className="w-8 h-8" />}
            title="Levar para casa"
            description="Produtos e acompanhamentos para viagem"
            gradient="from-amber-600 to-orange-700"
            onClick={() => onSelectContext('takeaway')}
          />
        </div>
      </div>
    </div>
  );
}

interface ContextOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  onClick: () => void;
}

function ContextOption({ icon, title, description, gradient, onClick }: ContextOptionProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300",
        "bg-gradient-to-br from-card to-card/50 border-purple-500/20",
        "hover:border-purple-400/40 hover:scale-[1.02] hover:shadow-neon-purple",
        "p-6 flex flex-col items-center text-center gap-4"
      )}
    >
      {/* Icon with gradient background */}
      <div className={cn(
        "p-4 rounded-2xl bg-gradient-to-br shadow-lg",
        gradient
      )}>
        <div className="text-white">{icon}</div>
      </div>

      {/* Text */}
      <div>
        <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
    </Card>
  );
}
