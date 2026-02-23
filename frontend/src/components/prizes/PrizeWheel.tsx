import { useState, useRef } from 'react';
import { Prize } from '@/hooks/usePrizes';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';

interface PrizeWheelProps {
  prizes: Prize[];
  onSpin: () => Promise<Prize | null>;
  disabled?: boolean;
}

export function PrizeWheel({ prizes, onSpin, disabled }: PrizeWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const wheelRef = useRef<SVGSVGElement>(null);

  const segmentAngle = 360 / prizes.length;

  const handleSpin = async () => {
    if (isSpinning || disabled || prizes.length === 0) return;

    setIsSpinning(true);
    setWonPrize(null);

    const result = await onSpin();
    if (!result) {
      setIsSpinning(false);
      return;
    }

    const prizeIndex = prizes.findIndex(p => p.id === result.id);
    const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
    const spins = 5; // Full rotations before stopping
    const finalRotation = rotation + 360 * spins + targetAngle - (rotation % 360);

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(result);
    }, 4000);
  };

  if (prizes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum prêmio disponível
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />
        </div>

        {/* Wheel */}
        <svg
          ref={wheelRef}
          viewBox="0 0 200 200"
          className="w-64 h-64 sm:w-80 sm:h-80"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'none',
          }}
        >
          {prizes.map((prize, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = (index + 1) * segmentAngle;
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            const x1 = 100 + 95 * Math.cos(startRad);
            const y1 = 100 + 95 * Math.sin(startRad);
            const x2 = 100 + 95 * Math.cos(endRad);
            const y2 = 100 + 95 * Math.sin(endRad);
            const largeArc = segmentAngle > 180 ? 1 : 0;

            const midAngle = (startAngle + segmentAngle / 2 - 90) * (Math.PI / 180);
            const textX = 100 + 55 * Math.cos(midAngle);
            const textY = 100 + 55 * Math.sin(midAngle);
            const textRotation = startAngle + segmentAngle / 2;

            return (
              <g key={prize.id}>
                <path
                  d={`M100,100 L${x1},${y1} A95,95 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={prize.color}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                  className="drop-shadow"
                >
                  {prize.name.length > 12 ? prize.name.slice(0, 12) + '...' : prize.name}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="15" fill="white" stroke="#333" strokeWidth="2" />
        </svg>
      </div>

      <Button
        size="lg"
        onClick={handleSpin}
        disabled={isSpinning || disabled}
        className="gap-2"
      >
        <Gift className="h-5 w-5" />
        {isSpinning ? 'Girando...' : 'Girar Roleta'}
      </Button>

      {wonPrize && (
        <div className="text-center p-6 bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-xl border-2 border-yellow-300 animate-in fade-in zoom-in">
          <p className="text-lg font-medium text-yellow-800">🎉 Parabéns!</p>
          <p className="text-2xl font-bold text-yellow-900 mt-1">{wonPrize.name}</p>
          {wonPrize.description && (
            <p className="text-sm text-yellow-700 mt-2">{wonPrize.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
