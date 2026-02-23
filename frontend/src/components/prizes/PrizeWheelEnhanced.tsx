import { useState, useRef, useEffect, useCallback } from 'react';
import { Prize } from '@/hooks/usePrizes';
import { Button } from '@/components/ui/button';
import { Gift, Volume2, VolumeX, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PrizeWheelEnhancedProps {
  prizes: Prize[];
  onSpin: () => Promise<Prize | null>;
  disabled?: boolean;
  companyName?: string;
  onClose?: () => void; // Callback when user closes the reward modal
}

// Wheel colors come from design tokens (index.css)
const WHEEL_COLOR_VARS = [
  '--wheel-1',
  '--wheel-2',
  '--wheel-3',
  '--wheel-4',
  '--wheel-5',
  '--wheel-6',
  '--wheel-7',
  '--wheel-8',
];

const hslVar = (name: string) => `hsl(var(${name}))`;

export function PrizeWheelEnhanced({ prizes, onSpin, disabled, companyName, onClose }: PrizeWheelEnhancedProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const wheelRef = useRef<SVGSVGElement>(null);
  const spinSoundRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);

  const segmentAngle = 360 / prizes.length;

  // Use palette colors even if prizes have same `color` in DB.
  const getSegmentColor = (index: number) => {
    const varName = WHEEL_COLOR_VARS[index % WHEEL_COLOR_VARS.length];
    return hslVar(varName);
  };

  // Good contrast: only the very light segment uses dark text.
  const getTextColor = (bg: string) => {
    return bg === hslVar('--wheel-6') ? hslVar('--wheel-text-dark') : hslVar('--wheel-text-light');
  };

  // Trigger confetti celebration
  const celebrate = useCallback(() => {
    const duration = 4200;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 32, spread: 360, ticks: 70, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const colors = [
      hslVar('--wheel-1'),
      hslVar('--wheel-2'),
      hslVar('--wheel-3'),
      hslVar('--wheel-4'),
      hslVar('--wheel-5'),
      hslVar('--wheel-7'),
      hslVar('--wheel-8'),
    ];

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 60 * (timeLeft / duration);

      // Confetti from multiple angles
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.08, 0.28), y: Math.random() - 0.2 },
        colors,
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.72, 0.92), y: Math.random() - 0.2 },
        colors,
      });
    }, 220);
  }, []);

  const handleSpin = async () => {
    if (isSpinning || disabled || prizes.length === 0) return;

    setIsSpinning(true);
    setWonPrize(null);

    // Play spin sound if enabled
    if (soundEnabled && spinSoundRef.current) {
      spinSoundRef.current.currentTime = 0;
      spinSoundRef.current.play().catch(() => {});
    }

    const result = await onSpin();
    if (!result) {
      setIsSpinning(false);
      return;
    }

    const prizeIndex = prizes.findIndex(p => p.id === result.id);
    const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
    const spins = 6 + Math.floor(Math.random() * 3); // 6-8 full rotations
    const finalRotation = rotation + 360 * spins + targetAngle - (rotation % 360);

    setRotation(finalRotation);

    // Wait for spin animation to finish
    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(result);
      
      // Play win sound and celebrate
      if (soundEnabled && winSoundRef.current) {
        winSoundRef.current.currentTime = 0;
        winSoundRef.current.play().catch(() => {});
      }
      
      // Trigger confetti explosion
      celebrate();
    }, 5000);
  };

  if (prizes.length === 0) {
    return (
      <div className="text-center py-8 text-white/70">
        Nenhum prêmio disponível
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 relative">
      {/* Sound effects (silent audio elements) */}
      <audio ref={spinSoundRef} preload="none" />
      <audio ref={winSoundRef} preload="none" />

      {/* Sound toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-0 right-0 p-2 text-white/60 hover:text-white transition-colors"
        title={soundEnabled ? 'Desativar som' : 'Ativar som'}
      >
        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>

      {/* Wheel container with glow effect */}
      <div className="relative drop-shadow-2xl">
        {/* Outer glow ring */}
         <div
           className="absolute inset-0 -m-4 rounded-full opacity-80 blur-2xl animate-pulse"
           style={{ background: 'var(--gradient-primary)' }}
         />
        
        {/* Decorative lights around wheel */}
        <div className="absolute inset-0 -m-6">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
               className="absolute w-3 h-3 rounded-full shadow-lg"
               style={{
                 background: 'hsl(var(--warning))',
                 top: `${50 - 48 * Math.cos((i * 30 * Math.PI) / 180)}%`,
                 left: `${50 + 48 * Math.sin((i * 30 * Math.PI) / 180)}%`,
                 animation: `pulse ${0.5 + (i % 3) * 0.2}s ease-in-out infinite alternate`,
                 animationDelay: `${i * 0.1}s`,
               }}
            />
          ))}
        </div>

        {/* Pointer */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="relative">
             <div
               className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent drop-shadow-lg"
               style={{ borderTopColor: 'hsl(var(--warning))' }}
             />
             <Sparkles
               className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 animate-pulse"
               style={{ color: 'hsl(var(--warning))' }}
             />
          </div>
        </div>

        {/* Wheel */}
        <svg
          ref={wheelRef}
          viewBox="0 0 200 200"
          className="w-72 h-72 sm:w-80 sm:h-80 relative z-10"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning 
              ? 'transform 5.2s cubic-bezier(0.06, 0.86, 0.12, 1)' 
              : 'none',
            filter: 'drop-shadow(0 14px 34px rgba(0,0,0,0.42))',
          }}
        >
          {/* Outer ring */}
          <circle cx="100" cy="100" r="98" fill="none" stroke="hsl(var(--warning))" strokeWidth="4" />
          
          {prizes.map((prize, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = (index + 1) * segmentAngle;
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            const x1 = 100 + 92 * Math.cos(startRad);
            const y1 = 100 + 92 * Math.sin(startRad);
            const x2 = 100 + 92 * Math.cos(endRad);
            const y2 = 100 + 92 * Math.sin(endRad);
            const largeArc = segmentAngle > 180 ? 1 : 0;

            const midAngle = (startAngle + segmentAngle / 2 - 90) * (Math.PI / 180);
            const textX = 100 + 55 * Math.cos(midAngle);
            const textY = 100 + 55 * Math.sin(midAngle);
            const textRotation = startAngle + segmentAngle / 2;

            const bgColor = getSegmentColor(index);
            const textColor = getTextColor(bgColor);

            // Calculate font size based on text length
            const displayName = prize.name.length > 14 ? prize.name.slice(0, 14) + '...' : prize.name;
            const fontSize = displayName.length > 10 ? 7 : 9;

            return (
              <g key={prize.id}>
                {/* Segment with gradient effect */}
                <defs>
                  <linearGradient id={`grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: bgColor, stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: bgColor, stopOpacity: 0.8 }} />
                  </linearGradient>
                </defs>
                <path
                  d={`M100,100 L${x1},${y1} A92,92 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={`url(#grad-${index})`}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="2"
                />
                {/* Text with shadow */}
                <text
                  x={textX}
                  y={textY}
                  fill={textColor}
                  fontSize={fontSize}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                  style={{
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {displayName}
                </text>
              </g>
            );
          })}
          
          {/* Center button */}
          <circle cx="100" cy="100" r="18" fill="url(#centerGradient)" stroke="hsl(var(--warning))" strokeWidth="3" />
          <defs>
            <radialGradient id="centerGradient">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f0f0f0" />
            </radialGradient>
          </defs>
          <text x="100" y="102" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#333">
            🎁
          </text>
        </svg>
      </div>

      {/* Spin button */}
       <Button
         size="lg"
         onClick={handleSpin}
         disabled={isSpinning || disabled}
         className={`btn-neon gap-2 px-8 py-6 text-lg font-bold rounded-full transition-all duration-300 ${
           isSpinning ? 'animate-pulse cursor-not-allowed' : 'hover:scale-105 active:scale-95'
         }`}
       >
         <Gift className={`h-6 w-6 ${isSpinning ? 'animate-spin' : ''}`} />
         {isSpinning ? 'Girando...' : 'Girar Roleta'}
       </Button>

      {/* Win celebration */}
      {wonPrize && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative mx-4 max-w-sm w-full">
            {/* Close button - top right, clearly visible */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute -top-2 -right-2 z-20 h-10 w-10 rounded-full bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 shadow-lg border border-gray-200"
              aria-label="Fechar"
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Glowing background */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 rounded-3xl blur-xl opacity-60 animate-pulse" />
            
             <div className="relative bg-card text-card-foreground rounded-3xl p-8 border border-border shadow-2xl">
               {/* Stars decoration */}
              <div className="absolute top-2 left-4 text-yellow-400 animate-bounce">✨</div>
              <div className="absolute top-4 right-6 text-pink-400 animate-bounce delay-100">🌟</div>
              <div className="absolute bottom-4 left-6 text-purple-400 animate-bounce delay-200">⭐</div>
              
              <div className="text-center space-y-4">
                <div className="text-6xl animate-bounce">🎉</div>
                
                <div className="space-y-2">
                   <h2 className="text-2xl font-bold text-foreground animate-[roleta-pop_700ms_ease-out]">
                     🎉 Parabéns! Você ganhou um desconto!
                   </h2>
                   <p className="text-sm text-accent">{companyName ? `Válido em ${companyName}` : 'Válido no seu próximo pedido'}</p>
                </div>
                
                 <div className="py-4 px-6 rounded-2xl border border-border" style={{ background: 'var(--gradient-glow)' }}>
                   <p className="text-3xl font-bold text-foreground leading-tight">
                     {wonPrize.name}
                   </p>
                   {wonPrize.description && (
                     <p className="text-sm text-muted-foreground mt-2">{wonPrize.description}</p>
                   )}
                 </div>
                
                 <div className="pt-2">
                   <p className="text-sm text-foreground/80">
                     🎁 Seu desconto foi salvo.
                   </p>
                   <p className="text-xs text-muted-foreground mt-1">
                     Use em qualquer canal informando seu telefone (ou guarde para depois).
                   </p>
                 </div>

                 {/* Explicit close button at bottom */}
                 <Button 
                   onClick={onClose}
                   className="w-full mt-4 gap-2"
                   size="lg"
                 >
                   <X className="h-4 w-4" />
                   Fechar e Continuar
                 </Button>
              </div>
            </div>
          </div>
        </div>
      )}

       <style>{`
         @keyframes pulse {
           0% { opacity: 0.45; transform: scale(0.82); }
           100% { opacity: 1; transform: scale(1.14); }
         }
         @keyframes roleta-pop {
           0% { transform: translateY(10px) scale(0.92); opacity: 0; }
           60% { transform: translateY(-6px) scale(1.06); opacity: 1; }
           100% { transform: translateY(0) scale(1); opacity: 1; }
         }
       `}</style>
    </div>
  );
}
