import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FoodCategory, FoodSelection, FOOD_CATEGORIES, ConsumptionContext } from '../types';
import { cn } from '@/lib/utils';

interface FoodSelectionScreenProps {
  context: ConsumptionContext;
  onSubmit: (food: FoodSelection) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function FoodSelectionScreen({ context, onSubmit, onBack, isLoading }: FoodSelectionScreenProps) {
  const [selectedCategories, setSelectedCategories] = useState<FoodCategory[]>([]);
  const [details, setDetails] = useState('');

  const handleToggleCategory = (category: FoodCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = () => {
    if (selectedCategories.length === 0) return;
    onSubmit({ categories: selectedCategories, details: details.trim() || undefined });
  };

  const firstSelectedCategory = FOOD_CATEGORIES.find(c => selectedCategories.includes(c.key));

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-amber-950/30 via-background to-background">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            O que você vai comer?
          </h1>
          <p className="text-sm text-muted-foreground">
            {context === 'local' ? 'Consumindo no local' : 'Levando para casa'}
          </p>
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {FOOD_CATEGORIES.map((category, index) => (
          <button
            key={category.key}
            onClick={() => handleToggleCategory(category.key)}
            className={cn(
              "p-4 rounded-xl border text-left transition-all duration-200",
              "animate-in fade-in slide-in-from-bottom",
              selectedCategories.includes(category.key)
                ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20"
                : "border-white/10 bg-card/50 hover:border-white/20 hover:bg-card/80"
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <span className="text-2xl mb-2 block">{category.icon}</span>
            <h3 className="font-medium text-white text-sm mb-1">{category.label}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{category.examples}</p>
          </button>
        ))}
      </div>

      {/* Details input (shown when category is selected) */}
      {selectedCategories.length > 0 && (
        <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {selectedCategories.map(cat => {
                const catData = FOOD_CATEGORIES.find(c => c.key === cat);
                return catData ? (
                  <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-sm">
                    <span>{catData.icon}</span>
                    <span className="text-white">{catData.label}</span>
                  </span>
                ) : null;
              })}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="food-details" className="text-sm text-muted-foreground">
                Quer especificar o prato? (opcional)
              </Label>
              <Input
                id="food-details"
                placeholder={`Ex: ${firstSelectedCategory?.examples.split(',')[0] || 'Seu prato específico'}`}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="bg-background/50 border-white/10 focus:border-amber-500"
              />
              <p className="text-xs text-muted-foreground">
                Quanto mais detalhes, melhor a sugestão do enólogo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={selectedCategories.length === 0 || isLoading}
        className={cn(
          "w-full py-6 text-lg font-semibold rounded-2xl",
          "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500",
          "transition-all duration-300",
          selectedCategories.length === 0 && "opacity-50"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Consultando enólogo...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Ver vinhos recomendados
            <ChevronRight className="w-5 h-5 ml-1" />
          </>
        )}
      </Button>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
        <div className="absolute bottom-40 left-5 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl" />
      </div>
    </div>
  );
}
