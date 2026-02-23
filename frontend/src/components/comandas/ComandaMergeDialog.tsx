import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Merge, Tag, AlertTriangle } from 'lucide-react';
import { useComandas, useComandaMutations } from '@/hooks/useComandas';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ComandaMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentComandaId: string;
  onSuccess: () => void;
}

export function ComandaMergeDialog({
  open,
  onOpenChange,
  currentComandaId,
  onSuccess,
}: ComandaMergeDialogProps) {
  const [sourceComandaId, setSourceComandaId] = useState<string | null>(null);

  const { comandas } = useComandas(['open', 'no_activity', 'requested_bill']);
  const { mergeComandas } = useComandaMutations();

  // Filter only comandas with consumption (total > 0) that are not the current one
  const availableComandas = comandas.filter((c) => c.id !== currentComandaId && Number(c.total_amount) > 0);
  const selectedComanda = comandas.find((c) => c.id === sourceComandaId);

  const handleMerge = async () => {
    if (!sourceComandaId) {
      toast.error('Selecione a comanda a juntar');
      return;
    }

    try {
      await mergeComandas.mutateAsync({
        sourceId: sourceComandaId,
        targetId: currentComandaId,
      });

      toast.success('Comandas unificadas com sucesso');
      setSourceComandaId(null);
      onSuccess();
    } catch (error) {
      toast.error('Erro ao juntar comandas');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Juntar Comandas
          </DialogTitle>
          <DialogDescription>
            Todos os itens e pagamentos da comanda selecionada serão movidos para esta comanda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              A comanda selecionada será <strong>fechada</strong> após a junção.
              Esta ação não pode ser desfeita.
            </div>
          </div>

          {/* Source comanda selection */}
          <div className="space-y-2">
            <Label>Juntar itens de</Label>
            <ScrollArea className="h-48 rounded-lg border p-2">
              {availableComandas.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhuma outra comanda disponível
                </div>
              ) : (
                <div className="space-y-2">
                  {availableComandas.map((comanda) => (
                    <button
                      key={comanda.id}
                      onClick={() => setSourceComandaId(comanda.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                        sourceComandaId === comanda.id
                          ? 'border-primary bg-primary/10'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Tag className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium">Comanda {comanda.command_number}</p>
                        {comanda.name && (
                          <p className="text-sm text-muted-foreground">{comanda.name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          R$ {Number(comanda.total_amount).toFixed(2)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {selectedComanda && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm">
                Os itens da <strong>Comanda {selectedComanda.command_number}</strong>{' '}
                {selectedComanda.name && `(${selectedComanda.name}) `}
                serão adicionados a esta comanda.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleMerge}
            disabled={mergeComandas.isPending || !sourceComandaId}
          >
            {mergeComandas.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Juntar Comandas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
