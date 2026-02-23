/**
 * DineModeScreen - Choose "Eat here" or "Takeaway"
 * 
 * Big buttons for easy touch selection.
 */

import { useKioskState, kioskActions } from '@/stores/kioskStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Utensils, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DineModeScreen() {
  const device = useKioskState(s => s.device);
  const orientation = device?.orientation || 'portrait';
  const isLandscape = orientation === 'landscape';

  const handleSelect = (mode: 'eat_here' | 'takeaway') => {
    kioskActions.setDineMode(mode);

    // Não pedir confirmação de telefone/nome novamente.
    kioskActions.setState('PAYMENT');
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-6 bg-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-14 h-14"
            onClick={() => kioskActions.setState('CART')}
          >
            <ArrowLeft className="w-8 h-8" />
          </Button>
          <h1 className="text-3xl font-bold text-white">Onde você vai consumir?</h1>
        </div>
      </div>

      {/* Options */}
      <div className={cn(
        'flex-1 flex items-center justify-center p-8',
        isLandscape ? 'flex-row gap-8' : 'flex-col gap-6'
      )}>
        {/* Eat here */}
        <button
          onClick={() => handleSelect('eat_here')}
          className={cn(
            'flex flex-col items-center justify-center p-8 rounded-3xl',
            'bg-gradient-to-br from-green-600 to-green-700',
            'hover:from-green-500 hover:to-green-600',
            'transition-all transform hover:scale-105',
            'shadow-2xl',
            isLandscape ? 'w-80 h-80' : 'w-full h-48'
          )}
        >
          <Utensils className={cn('text-white mb-4', isLandscape ? 'w-24 h-24' : 'w-16 h-16')} />
          <span className={cn('font-bold text-white', isLandscape ? 'text-4xl' : 'text-3xl')}>
            Comer Aqui
          </span>
        </button>

        {/* Takeaway */}
        <button
          onClick={() => handleSelect('takeaway')}
          className={cn(
            'flex flex-col items-center justify-center p-8 rounded-3xl',
            'bg-gradient-to-br from-blue-600 to-blue-700',
            'hover:from-blue-500 hover:to-blue-600',
            'transition-all transform hover:scale-105',
            'shadow-2xl',
            isLandscape ? 'w-80 h-80' : 'w-full h-48'
          )}
        >
          <ShoppingBag className={cn('text-white mb-4', isLandscape ? 'w-24 h-24' : 'w-16 h-16')} />
          <span className={cn('font-bold text-white', isLandscape ? 'text-4xl' : 'text-3xl')}>
            Para Levar
          </span>
        </button>
      </div>
    </div>
  );
}
