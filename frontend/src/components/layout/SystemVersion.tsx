import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Versão do sistema - Atualizar a cada release
// Formato: ANO-Z + número sequencial
export const SYSTEM_VERSION = '2026-Z1';

interface SystemVersionProps {
  className?: string;
  variant?: 'badge' | 'text';
}

export function SystemVersion({ className, variant = 'badge' }: SystemVersionProps) {
  if (variant === 'text') {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        v{SYSTEM_VERSION}
      </span>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs font-mono bg-primary/5 border-primary/20 text-primary hover:bg-primary/10",
        className
      )}
    >
      v{SYSTEM_VERSION}
    </Badge>
  );
}
