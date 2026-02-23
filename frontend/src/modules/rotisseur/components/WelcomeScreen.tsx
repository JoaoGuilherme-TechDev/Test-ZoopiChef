import { Beef, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RotisseurSettings } from '../types';

interface WelcomeScreenProps {
  settings: RotisseurSettings | null;
  companyName: string;
  logoUrl?: string | null;
  onStart: () => void;
  customerName?: string;
}

export function RotisseurWelcomeScreen({ settings, companyName, logoUrl, onStart, customerName }: WelcomeScreenProps) {
  const title = settings?.welcome_title || 'Maître Rôtisseur';
  const subtitle = customerName 
    ? `Olá ${customerName}! ${settings?.welcome_subtitle || 'Seu especialista em carnes'}` 
    : (settings?.welcome_subtitle || 'Seu especialista em carnes');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-red-950/50 via-background to-background">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Logo or Icon */}
        {logoUrl ? (
          <img src={logoUrl} alt={companyName} className="h-20 mb-6 animate-fade-in" />
        ) : (
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-amber-500 rounded-full blur-xl opacity-50 animate-pulse" />
            <div className="relative p-6 rounded-full bg-gradient-to-br from-red-700 to-amber-600 shadow-lg">
              <Beef className="w-12 h-12 text-white" />
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 animate-fade-in">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {subtitle}
        </p>

        {/* Company name */}
        <p className="text-sm text-muted-foreground/70 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {companyName}
        </p>

        {/* CTA Button */}
        <Button
          size="lg"
          onClick={onStart}
          className="group relative overflow-hidden bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-600 hover:to-amber-500 text-white font-semibold px-8 py-6 text-lg rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in"
          style={{ animationDelay: '0.3s' }}
        >
          <span className="relative z-10 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Iniciar Experiência
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </Button>

        {/* Elegant decoration */}
        <div className="mt-12 flex items-center gap-4 text-muted-foreground/50 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-red-500/50" />
          <span className="text-2xl">🥩</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/50" />
        </div>
      </div>
    </div>
  );
}
