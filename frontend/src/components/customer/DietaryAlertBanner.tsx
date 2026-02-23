import { AlertTriangle, Wheat, Milk, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface DietaryAlertBannerProps {
  hasGlutenIntolerance?: boolean;
  hasLactoseIntolerance?: boolean;
  dietaryRestrictions?: string[];
  allergyNotes?: string | null;
  customerName?: string;
  variant?: 'banner' | 'compact' | 'ticket';
  className?: string;
}

export function DietaryAlertBanner({
  hasGlutenIntolerance = false,
  hasLactoseIntolerance = false,
  dietaryRestrictions = [],
  allergyNotes = null,
  customerName,
  variant = 'banner',
  className,
}: DietaryAlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasAnyRestriction =
    hasGlutenIntolerance ||
    hasLactoseIntolerance ||
    dietaryRestrictions.length > 0 ||
    !!allergyNotes;

  if (!hasAnyRestriction) return null;

  const restrictionsList: string[] = [];
  if (hasGlutenIntolerance) restrictionsList.push('🌾 Glúten');
  if (hasLactoseIntolerance) restrictionsList.push('🥛 Lactose');
  dietaryRestrictions.forEach((r) => {
    const iconMap: Record<string, string> = {
      vegetarian: '🥬',
      vegan: '🌱',
      shellfish: '🦐',
      peanut: '🥜',
      tree_nuts: '🌰',
      egg: '🥚',
      fish: '🐟',
      soy: '🫘',
    };
    const icon = iconMap[r] || '⚠️';
    const labelMap: Record<string, string> = {
      vegetarian: 'Vegetariano',
      vegan: 'Vegano',
      shellfish: 'Frutos do Mar',
      peanut: 'Amendoim',
      tree_nuts: 'Castanhas',
      egg: 'Ovos',
      fish: 'Peixe',
      soy: 'Soja',
    };
    restrictionsList.push(`${icon} ${labelMap[r] || r}`);
  });

  if (variant === 'ticket') {
    return (
      <div
        className={cn(
          'bg-red-100 border-2 border-dashed border-red-500 rounded-lg p-3 print:border-red-800',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="font-bold text-red-700 uppercase text-sm">
            ⚠️ ATENÇÃO: RESTRIÇÕES ALIMENTARES
          </span>
        </div>

        {customerName && (
          <p className="text-sm font-semibold text-red-800 mb-1">
            Cliente: {customerName}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-2">
          {restrictionsList.map((item, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-red-200 text-red-800 text-xs font-medium rounded"
            >
              {item}
            </span>
          ))}
        </div>

        {allergyNotes && (
          <p className="text-sm text-red-700 border-t border-red-300 pt-2 mt-2">
            <strong>Obs:</strong> {allergyNotes}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full bg-amber-50 border border-amber-300 rounded-lg p-2 text-left transition-all',
          className
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-medium text-amber-800">
              {restrictionsList.length} restrição{restrictionsList.length > 1 ? 'ões' : ''} alimentar
              {restrictionsList.length > 1 ? 'es' : ''}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-amber-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-600" />
          )}
        </div>

        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-amber-200">
            <div className="flex flex-wrap gap-1">
              {restrictionsList.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded"
                >
                  {item}
                </span>
              ))}
            </div>
            {allergyNotes && (
              <p className="text-xs text-amber-700 mt-2">
                <strong>Obs:</strong> {allergyNotes}
              </p>
            )}
          </div>
        )}
      </button>
    );
  }

  // Default: banner variant
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-amber-50 to-red-50 border-l-4 border-amber-500 rounded-lg p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-full flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            Restrições Alimentares
            {customerName && (
              <span className="text-sm font-normal text-amber-600">
                ({customerName})
              </span>
            )}
          </h4>

          <div className="flex flex-wrap gap-2 mb-2">
            {hasGlutenIntolerance && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 border border-amber-300 rounded-full">
                <Wheat className="w-3 h-3 text-amber-700" />
                <span className="text-xs font-medium text-amber-800">Sem Glúten</span>
              </div>
            )}
            {hasLactoseIntolerance && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 border border-blue-300 rounded-full">
                <Milk className="w-3 h-3 text-blue-700" />
                <span className="text-xs font-medium text-blue-800">Sem Lactose</span>
              </div>
            )}
            {dietaryRestrictions.map((r) => {
              const iconMap: Record<string, string> = {
                vegetarian: '🥬',
                vegan: '🌱',
                shellfish: '🦐',
                peanut: '🥜',
                tree_nuts: '🌰',
                egg: '🥚',
                fish: '🐟',
                soy: '🫘',
              };
              const labelMap: Record<string, string> = {
                vegetarian: 'Vegetariano',
                vegan: 'Vegano',
                shellfish: 'Frutos do Mar',
                peanut: 'Amendoim',
                tree_nuts: 'Castanhas',
                egg: 'Ovos',
                fish: 'Peixe',
                soy: 'Soja',
              };
              return (
                <span
                  key={r}
                  className="px-2 py-1 bg-red-100 border border-red-300 text-xs font-medium text-red-800 rounded-full"
                >
                  {iconMap[r] || '⚠️'} {labelMap[r] || r}
                </span>
              );
            })}
          </div>

          {allergyNotes && (
            <p className="text-sm text-amber-700 bg-white/50 rounded p-2 border border-amber-200">
              <strong>Observações:</strong> {allergyNotes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
