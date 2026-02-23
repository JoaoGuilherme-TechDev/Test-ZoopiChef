import { useState } from 'react';
import { AlertTriangle, Copy, RefreshCw, X, FileText, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface FiscalError {
  code: string;
  message: string;
  details?: string;
  suggestion?: string;
}

interface FiscalErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: FiscalError | null;
  documentType?: 'nfe' | 'nfce' | 'nfse';
  onRetry?: () => void;
  isRetrying?: boolean;
}

// Mapeamento de códigos de erro SEFAZ para mensagens amigáveis
const SEFAZ_ERROR_SUGGESTIONS: Record<string, string> = {
  // Erros de validação
  '225': 'Verifique se a data de emissão está correta e não é futura.',
  '233': 'Confira o CNPJ do destinatário. Pode estar inválido ou não cadastrado.',
  '301': 'O XML foi assinado incorretamente. Verifique o certificado digital.',
  '302': 'A assinatura digital expirou ou é inválida. Renove o certificado.',
  '539': 'Duplicidade de NF-e. Já existe uma nota com esta chave de acesso.',
  '561': 'O CNPJ do emitente está irregular junto ao Fisco.',
  '562': 'O CNPJ do destinatário está irregular junto ao Fisco.',
  '563': 'IE do emitente não vinculada ao CNPJ.',
  '564': 'IE do destinatário não vinculada ao CNPJ.',
  '565': 'Valor do ICMS diferente do calculado.',
  '587': 'Verifique se o NCM do produto está correto.',
  '591': 'Verifique se o CFOP é compatível com a operação.',
  '600': 'Chave de acesso inválida. Verifique os dados da nota.',
  '656': 'Consumidor final em operação interestadual: CPF obrigatório.',
  '694': 'O CNPJ do emitente não é válido.',
  '778': 'Informar dados do transportador é obrigatório.',
  '999': 'Erro não especificado. Entre em contato com o suporte.',
  // Erros de comunicação
  '108': 'Serviço SEFAZ indisponível. Tente novamente em alguns minutos.',
  '109': 'Serviço SEFAZ em manutenção. Tente novamente mais tarde.',
  // Erros de ambiente
  '204': 'Documento duplicado. Já existe uma nota com estes dados.',
  '218': 'NF-e já está cancelada.',
  '220': 'Informe o CPF/CNPJ do destinatário.',
};

export function FiscalErrorDialog({
  open,
  onOpenChange,
  error,
  documentType = 'nfce',
  onRetry,
  isRetrying,
}: FiscalErrorDialogProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const suggestion = error.suggestion || SEFAZ_ERROR_SUGGESTIONS[error.code] || 
    'Verifique os dados informados e tente novamente. Se o erro persistir, entre em contato com o suporte.';

  const getDocumentTypeName = () => {
    switch (documentType) {
      case 'nfe': return 'NF-e';
      case 'nfce': return 'NFC-e';
      case 'nfse': return 'NFS-e';
      default: return 'Documento Fiscal';
    }
  };

  const handleCopyError = () => {
    const errorText = `
Erro na Emissão Fiscal
======================
Tipo: ${getDocumentTypeName()}
Código: ${error.code}
Mensagem: ${error.message}
${error.details ? `Detalhes: ${error.details}` : ''}
    `.trim();

    navigator.clipboard.writeText(errorText);
    toast.success('Erro copiado para a área de transferência');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Erro na Emissão - {getDocumentTypeName()}
          </DialogTitle>
          <DialogDescription>
            A emissão do documento fiscal não foi autorizada pela SEFAZ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Código e Mensagem Principal */}
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-destructive/20 rounded-full shrink-0">
                <X className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive" className="text-xs">
                    Código {error.code}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {error.message}
                </p>
              </div>
            </div>
          </div>

          {/* Sugestão */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 rounded-full shrink-0">
                <HelpCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                  O que fazer?
                </p>
                <p className="text-sm text-muted-foreground">
                  {suggestion}
                </p>
              </div>
            </div>
          </div>

          {/* Detalhes Técnicos (expansível) */}
          {error.details && (
            <>
              <Separator />
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {showDetails ? 'Ocultar' : 'Ver'} detalhes técnicos
                </Button>
                
                {showDetails && (
                  <ScrollArea className="h-32 mt-2">
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {error.details}
                    </pre>
                  </ScrollArea>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyError}
            className="w-full sm:w-auto"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Erro
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
            >
              Fechar
            </Button>
            {onRetry && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                className="flex-1 sm:flex-none"
              >
                {isRetrying ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {isRetrying ? 'Tentando...' : 'Tentar Novamente'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
