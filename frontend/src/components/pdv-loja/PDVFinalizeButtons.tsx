import { useState } from 'react';
import { CheckCircle, Receipt, FileText, FileCheck, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export type FinalizeType = 'simple' | 'cupom_controle' | 'nfce' | 'nfe';

interface Customer {
  id: string;
  name: string;
  cpf_cnpj?: string | null;
  email?: string | null;
  address?: string | null;
}

interface PDVFinalizeButtonsProps {
  canFinalize: boolean;
  isLoading?: boolean;
  customer?: Customer | null;
  onFinalize: (type: FinalizeType) => void;
  onRequestCustomer: () => void;
}

export function PDVFinalizeButtons({
  canFinalize,
  isLoading,
  customer,
  onFinalize,
  onRequestCustomer,
}: PDVFinalizeButtonsProps) {
  const [showNFeWarning, setShowNFeWarning] = useState(false);
  const [pendingNFe, setPendingNFe] = useState(false);

  const handleFinalizeClick = (type: FinalizeType) => {
    if (type === 'nfe') {
      // NF-e requer cliente com dados completos
      if (!customer || !customer.cpf_cnpj) {
        setShowNFeWarning(true);
        return;
      }
    }
    onFinalize(type);
  };

  const handleOpenCustomerForm = () => {
    setShowNFeWarning(false);
    setPendingNFe(true);
    onRequestCustomer();
  };

  // Callback para quando o cliente for cadastrado/selecionado
  const handleCustomerReady = () => {
    if (pendingNFe) {
      setPendingNFe(false);
      // Após cadastrar cliente, tentar emitir NF-e novamente
      onFinalize('nfe');
    }
  };

  return (
    <>
      <div className="space-y-2">
        {/* Botão Principal - Finalizar Venda */}
        <Button
          size="lg"
          className="w-full h-14 text-lg"
          disabled={!canFinalize || isLoading}
          onClick={() => handleFinalizeClick('simple')}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-5 w-5 mr-2" />
          )}
          {isLoading ? 'Finalizando...' : 'Finalizar Venda'}
        </Button>

        {/* Dropdown com opções fiscais */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12"
              disabled={!canFinalize || isLoading}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Opções de Documento Fiscal
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="center">
            <DropdownMenuItem
              onClick={() => handleFinalizeClick('cupom_controle')}
              className="py-3"
            >
              <FileText className="h-4 w-4 mr-3" />
              <div className="flex flex-col">
                <span className="font-medium">Cupom Controle</span>
                <span className="text-xs text-muted-foreground">Documento interno sem valor fiscal</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => handleFinalizeClick('nfce')}
              className="py-3"
            >
              <Receipt className="h-4 w-4 mr-3" />
              <div className="flex flex-col">
                <span className="font-medium">Emitir NFC-e</span>
                <span className="text-xs text-muted-foreground">Nota Fiscal de Consumidor</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => handleFinalizeClick('nfe')}
              className="py-3"
            >
              <FileCheck className="h-4 w-4 mr-3" />
              <div className="flex flex-col">
                <span className="font-medium">Emitir NF-e</span>
                <span className="text-xs text-muted-foreground">
                  Nota Fiscal Eletrônica
                  {customer && <span className="text-primary ml-1">• {customer.name}</span>}
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mostrar cliente vinculado se houver */}
        {customer && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-1">
            <User className="h-3 w-3" />
            <span>Cliente: <strong className="text-foreground">{customer.name}</strong></span>
            {customer.cpf_cnpj && (
              <span className="text-xs">({customer.cpf_cnpj})</span>
            )}
          </div>
        )}
      </div>

      {/* Dialog de aviso para NF-e sem cliente */}
      <Dialog open={showNFeWarning} onOpenChange={setShowNFeWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-amber-500" />
              Cliente Necessário para NF-e
            </DialogTitle>
            <DialogDescription className="text-left space-y-2 pt-2">
              <p>
                Para emitir uma <strong>Nota Fiscal Eletrônica (NF-e)</strong>, é necessário 
                vincular um cliente com os seguintes dados:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Nome completo ou Razão Social</li>
                <li>CPF ou CNPJ</li>
                <li>Endereço completo (para NF-e)</li>
                <li>E-mail (opcional, para envio)</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                {customer 
                  ? "O cliente atual não possui todos os dados necessários."
                  : "Nenhum cliente foi vinculado a esta venda."}
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNFeWarning(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleOpenCustomerForm}>
              <User className="h-4 w-4 mr-2" />
              {customer ? 'Completar Cadastro' : 'Cadastrar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
