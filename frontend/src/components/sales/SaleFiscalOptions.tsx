import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  CheckCircle, 
  Receipt, 
  FileText, 
  FileCheck, 
  Loader2, 
  User,
  AlertTriangle
} from 'lucide-react';
import { FiscalErrorDialog } from '@/components/fiscal/FiscalErrorDialog';
import { useFiscalEmission } from '@/hooks/useFiscalEmission';
import { toast } from 'sonner';

export type FiscalDocumentType = 'simple' | 'cupom_controle' | 'nfce' | 'nfe';

interface Customer {
  id: string;
  name: string;
  document?: string | null;
  email?: string | null;
  whatsapp?: string | null;
}

interface SaleFiscalOptionsProps {
  canFinalize: boolean;
  isLoading?: boolean;
  customer?: Customer | null;
  orderId?: string;
  totalCents: number;
  orderType: string;
  onFinalize: (type: FiscalDocumentType) => void;
  onRequestCustomer: () => void;
}

export function SaleFiscalOptions({
  canFinalize,
  isLoading,
  customer,
  orderId,
  totalCents,
  orderType,
  onFinalize,
  onRequestCustomer,
}: SaleFiscalOptionsProps) {
  const [showNFeWarning, setShowNFeWarning] = useState(false);
  const [fiscalError, setFiscalError] = useState<{ code: string; message: string; details?: string } | null>(null);
  const [pendingNFe, setPendingNFe] = useState(false);
  const { emitDocument, isEmitting } = useFiscalEmission();

  const handleFinalizeClick = async (type: FiscalDocumentType) => {
    // Para NF-e, precisa de cliente com dados completos
    if (type === 'nfe') {
      if (!customer || !customer.document) {
        setShowNFeWarning(true);
        return;
      }
    }

    // Se for apenas finalização simples, delega para o parent
    if (type === 'simple') {
      onFinalize(type);
      return;
    }

    // Para documentos fiscais, tentar emitir
    try {
      const result = await emitDocument.mutateAsync({
        documentType: type,
        orderId: orderId || '',
        customer: customer ? {
          id: customer.id,
          name: customer.name,
          cpf_cnpj: customer.document,
          email: customer.email,
          whatsapp: customer.whatsapp,
        } : null,
        items: [], // Será preenchido pelo caller
        totalCents,
        sendWhatsApp: !!customer?.whatsapp,
      });

      if (result.success) {
        toast.success(`${getFiscalDocName(type)} emitida com sucesso!`);
        onFinalize(type);
      } else if (result.error) {
        // Erro da SEFAZ - mostrar para o operador
        setFiscalError({
          code: result.error.code || 'SEFAZ_ERROR',
          message: result.error.message,
          details: result.error.details,
        });
      }
    } catch (error) {
      setFiscalError({
        code: 'SYSTEM_ERROR',
        message: 'Erro ao emitir documento fiscal',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const getFiscalDocName = (type: FiscalDocumentType): string => {
    switch (type) {
      case 'cupom_controle': return 'Cupom de Controle';
      case 'nfce': return 'NFC-e';
      case 'nfe': return 'NF-e';
      default: return 'Documento';
    }
  };

  const handleOpenCustomerForm = () => {
    setShowNFeWarning(false);
    setPendingNFe(true);
    onRequestCustomer();
  };

  return (
    <>
      <div className="space-y-2">
        {/* Botão Principal - Finalizar Venda */}
        <Button
          size="lg"
          className="w-full h-14 text-lg"
          disabled={!canFinalize || isLoading || isEmitting}
          onClick={() => handleFinalizeClick('simple')}
        >
          {isLoading || isEmitting ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-5 w-5 mr-2" />
          )}
          {isLoading || isEmitting ? 'Finalizando...' : 'Finalizar Venda'}
        </Button>

        {/* Dropdown com opções fiscais */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12"
              disabled={!canFinalize || isLoading || isEmitting}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Emitir Documento Fiscal
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="center">
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
            {customer.document && (
              <span className="text-xs">({customer.document})</span>
            )}
          </div>
        )}
      </div>

      {/* Dialog de aviso para NF-e sem cliente */}
      <Dialog open={showNFeWarning} onOpenChange={setShowNFeWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
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
                <li>Endereço completo</li>
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

      {/* Dialog de erro fiscal */}
      {fiscalError && (
        <FiscalErrorDialog
          open={!!fiscalError}
          onOpenChange={(open) => !open && setFiscalError(null)}
          error={fiscalError}
          onRetry={() => {
            setFiscalError(null);
            // Tentar novamente com o último tipo de documento
          }}
        />
      )}
    </>
  );
}
