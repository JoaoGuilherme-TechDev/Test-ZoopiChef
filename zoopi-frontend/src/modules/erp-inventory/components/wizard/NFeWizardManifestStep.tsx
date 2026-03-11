import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  FileCheck, Building2, FileText, Calendar, 
  DollarSign, Package, CheckCircle2, AlertCircle
} from 'lucide-react';
import type { NFeWizardData, ManifestStatus } from '../../types/nfe-wizard';
import { MANIFEST_STATUS_LABELS } from '../../types/nfe-wizard';

interface NFeWizardManifestStepProps {
  data: NFeWizardData;
  onManifestChange: (status: ManifestStatus) => void;
  onNext: () => void;
}

export function NFeWizardManifestStep({ data, onManifestChange, onNext }: NFeWizardManifestStepProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const canProceed = data.manifest_status === 'ciencia' || data.manifest_status === 'confirmacao';

  return (
    <div className="space-y-6">
      {/* Invoice Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-xs">Fornecedor</span>
            </div>
            <p className="font-medium text-sm truncate">{data.supplier.name}</p>
            <p className="text-xs text-muted-foreground">{data.supplier.cnpj}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs">Nota Fiscal</span>
            </div>
            <p className="font-medium text-sm">Nº {data.invoice.number}</p>
            <p className="text-xs text-muted-foreground">Série {data.invoice.series}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Data Emissão</span>
            </div>
            <p className="font-medium text-sm">{formatDate(data.invoice.date)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Valor Total</span>
            </div>
            <p className="font-bold text-lg text-primary">{formatCurrency(data.totals.total)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Totals breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" />
            Resumo dos Valores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Produtos</p>
              <p className="font-medium">{formatCurrency(data.totals.products)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Frete</p>
              <p className="font-medium">{formatCurrency(data.totals.freight)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Desconto</p>
              <p className="font-medium text-green-600">-{formatCurrency(data.totals.discount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Outros</p>
              <p className="font-medium">{formatCurrency(data.totals.other)}</p>
            </div>
            <div className="border-l pl-4">
              <p className="text-muted-foreground">Total NF-e</p>
              <p className="font-bold text-primary">{formatCurrency(data.totals.total)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>{data.items.length}</strong> itens na nota
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Manifest Selection */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Manifestação do Destinatário
          </CardTitle>
          <CardDescription>
            Informe o status da manifestação da NF-e junto à SEFAZ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.manifest_status}
            onValueChange={(value) => onManifestChange(value as ManifestStatus)}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
              data.manifest_status === 'ciencia' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}>
              <RadioGroupItem value="ciencia" id="ciencia" />
              <Label htmlFor="ciencia" className="flex-1 cursor-pointer">
                <p className="font-medium">Ciência da Operação</p>
                <p className="text-xs text-muted-foreground">Confirma que tomou conhecimento da NF-e</p>
              </Label>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>

            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
              data.manifest_status === 'confirmacao' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}>
              <RadioGroupItem value="confirmacao" id="confirmacao" />
              <Label htmlFor="confirmacao" className="flex-1 cursor-pointer">
                <p className="font-medium">Confirmação da Operação</p>
                <p className="text-xs text-muted-foreground">Confirma que recebeu a mercadoria</p>
              </Label>
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
            </div>

            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors opacity-60 ${
              data.manifest_status === 'desconhecimento' ? 'border-orange-500 bg-orange-50' : 'hover:bg-muted/50'
            }`}>
              <RadioGroupItem value="desconhecimento" id="desconhecimento" />
              <Label htmlFor="desconhecimento" className="flex-1 cursor-pointer">
                <p className="font-medium">Desconhecimento</p>
                <p className="text-xs text-muted-foreground">Desconhece a operação</p>
              </Label>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>

            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors opacity-60 ${
              data.manifest_status === 'nao_realizada' ? 'border-red-500 bg-red-50' : 'hover:bg-muted/50'
            }`}>
              <RadioGroupItem value="nao_realizada" id="nao_realizada" />
              <Label htmlFor="nao_realizada" className="flex-1 cursor-pointer">
                <p className="font-medium">Operação não Realizada</p>
                <p className="text-xs text-muted-foreground">A operação não foi realizada</p>
              </Label>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          </RadioGroup>

          {data.manifest_status !== 'none' && (
            <div className="mt-4 p-3 rounded-lg bg-muted">
              <p className="text-sm">
                <strong>Status selecionado:</strong>{' '}
                <Badge variant={canProceed ? 'default' : 'destructive'}>
                  {MANIFEST_STATUS_LABELS[data.manifest_status]}
                </Badge>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button 
          onClick={onNext} 
          disabled={!canProceed}
          size="lg"
        >
          Próximo: Entrada de Itens
        </Button>
      </div>

      {!canProceed && data.manifest_status !== 'none' && (
        <p className="text-sm text-destructive text-center">
          Não é possível dar entrada em notas com status de desconhecimento ou não realização.
        </p>
      )}
    </div>
  );
}
