import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { BATCH_PRODUCT_FIELDS, BatchProductUpdate } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  productCount: number;
  updates: BatchProductUpdate;
  enabledFields: Record<string, boolean>;
}

export function BatchPreviewDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  isLoading,
  productCount,
  updates,
  enabledFields 
}: Props) {
  const changedFields = Object.entries(enabledFields)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => {
      const fieldConfig = BATCH_PRODUCT_FIELDS.find(f => f.key === key);
      const value = updates[key as keyof BatchProductUpdate];
      
      let displayValue = String(value);
      if (fieldConfig?.type === 'boolean') {
        displayValue = value ? 'Sim' : 'Não';
      } else if (fieldConfig?.type === 'select') {
        displayValue = fieldConfig.options?.find(o => o.value === value)?.label || String(value);
      }

      return {
        key,
        label: fieldConfig?.label || key,
        value: displayValue,
      };
    });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Confirmar Alterações em Lote
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg border border-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                <p className="text-sm">
                  Esta ação irá alterar <strong className="text-foreground">{productCount} produtos</strong>.
                  Verifique os dados antes de confirmar.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-sm text-foreground">Campos que serão alterados:</p>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {changedFields.map((field) => (
                      <div 
                        key={field.key}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="text-sm font-medium">{field.label}</span>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="secondary" className="font-mono">
                            {field.value}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Aplicando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Alterações
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
