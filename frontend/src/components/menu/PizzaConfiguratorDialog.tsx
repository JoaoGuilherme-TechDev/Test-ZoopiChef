import { Loader2, AlertCircle, Pizza } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FlavorSelectorDialog } from './FlavorSelectorDialog';
import { useProductPizzaConfigurationPublic, isValidPizzaConfiguration } from '@/hooks/useProductPizzaConfigurationPublic';

type PizzaConfiguratorDialogProps = {
  open: boolean;
  onClose: () => void;
  companyId?: string;
  productId?: string;
  productName: string;
  onConfirm: (selection: any) => void;
};

export function PizzaConfiguratorDialog({
  open,
  onClose,
  companyId,
  productId,
  productName,
  onConfirm,
}: PizzaConfiguratorDialogProps) {
  const { data: pizzaConfiguration, isLoading } = useProductPizzaConfigurationPublic(
    open ? productId : undefined,
    companyId,
    open
  );

  // MANDATORY: A pizza is valid if AT LEAST ONE exists: sizes OR flavors OR borders OR optionalGroups
  const hasConfig = isValidPizzaConfiguration(pizzaConfiguration);
  // This specific ordering UI requires pizzaConfig + at least 1 flavor to proceed.
  // If the configuration exists but is incomplete, we show the friendly error state.
  const canRenderOrderingUI = !!pizzaConfiguration?.pizzaConfig && (pizzaConfiguration?.flavors?.length || 0) > 0;

  if (!open) return null;

  // Loading state - stays open with loader
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pizza className="w-5 h-5 text-primary" />
              {productName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando tamanhos e sabores…</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // No config state - stays open with message, user must dismiss
  if (!hasConfig || !canRenderOrderingUI) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pizza className="w-5 h-5 text-primary" />
              {productName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Pizza sem configuração</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Este produto não possui configuração de pizza suficiente para venda.
                Verifique tamanhos, sabores, bordas ou adicionais no cadastro do produto.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="w-full">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Has config - show full flavor selector
  return (
    <FlavorSelectorDialog
      open={open}
      onClose={onClose}
      onConfirm={(selection) =>
        onConfirm({
          ...selection,
          pricing_model: pizzaConfiguration!.pizzaConfig!.pricing_model,
        })
      }
      productName={productName}
      flavors={(pizzaConfiguration!.flavors || []) as any}
      borders={pizzaConfiguration!.borders || []}
      pizzaConfig={pizzaConfiguration!.pizzaConfig as any}
      optionGroups={(pizzaConfiguration!.optionGroups || []) as any}
      doughTypes={pizzaConfiguration!.doughTypes || []}
      borderTypes={pizzaConfiguration!.borderTypes || []}
    />
  );
}