import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet, Building, Calendar, FileText, 
  CreditCard, Loader2, CheckCircle2
} from 'lucide-react';
import type { NFeWizardData } from '../../types/nfe-wizard';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { useCostCenters } from '@/hooks/useCostCenters';

interface NFeWizardFinancialStepProps {
  data: NFeWizardData;
  onSetFinancialData: (data: {
    category_id?: string;
    cost_center_id?: string;
    payment_conditions?: {
      installments: number;
      first_due_date: string;
      interval_days: number;
    };
    notes?: string;
  }) => void;
  onFinalize: () => Promise<void>;
  onPrev: () => void;
  isProcessing: boolean;
}

export function NFeWizardFinancialStep({ 
  data, 
  onSetFinancialData, 
  onFinalize, 
  onPrev,
  isProcessing 
}: NFeWizardFinancialStepProps) {
  const { expenseAccounts } = useChartOfAccounts();
  const { data: costCenters } = useCostCenters();

  const [categoryId, setCategoryId] = useState(data.category_id || '');
  const [costCenterId, setCostCenterId] = useState(data.cost_center_id || '');
  const [installments, setInstallments] = useState(data.payment_conditions?.installments || 1);
  const [firstDueDate, setFirstDueDate] = useState(
    data.payment_conditions?.first_due_date || data.invoice.date
  );
  const [intervalDays, setIntervalDays] = useState(data.payment_conditions?.interval_days || 30);
  const [notes, setNotes] = useState(data.notes || '');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const installmentValue = data.totals.total / installments;

  const handleFinalize = async () => {
    onSetFinancialData({
      category_id: categoryId || undefined,
      cost_center_id: costCenterId || undefined,
      payment_conditions: {
        installments,
        first_due_date: firstDueDate,
        interval_days: intervalDays,
      },
      notes: notes || undefined,
    });
    
    await onFinalize();
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Resumo da Importação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Fornecedor</p>
              <p className="font-medium">{data.supplier.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">NF-e</p>
              <p className="font-medium">Nº {data.invoice.number}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Itens</p>
              <p className="font-medium">{data.items.length} produtos</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor Total</p>
              <p className="font-bold text-primary">{formatCurrency(data.totals.total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart of Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Plano de Contas
            </CardTitle>
            <CardDescription>
              Categorize esta compra para controle financeiro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Conta de Despesa</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {expenseAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Centro de Custo</Label>
              <Select value={costCenterId} onValueChange={setCostCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {costCenters?.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.code ? `${cc.code} - ` : ''}{cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payment Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Condições de Pagamento
            </CardTitle>
            <CardDescription>
              Configure as parcelas do contas a pagar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Parcelas</Label>
                <Select 
                  value={installments.toString()} 
                  onValueChange={(v) => setInstallments(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>1º Vencimento</Label>
                <Input
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                />
              </div>

              <div>
                <Label>Intervalo</Label>
                <Select
                  value={intervalDays.toString()}
                  onValueChange={(v) => setIntervalDays(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="14">14 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {installments > 1 && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p className="font-medium mb-2">Parcelas:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Array.from({ length: Math.min(installments, 6) }).map((_, i) => {
                    const dueDate = new Date(firstDueDate);
                    dueDate.setDate(dueDate.getDate() + (i * intervalDays));
                    return (
                      <div key={i} className="flex justify-between">
                        <span>{i + 1}ª - {dueDate.toLocaleDateString('pt-BR')}</span>
                        <span>{formatCurrency(installmentValue)}</span>
                      </div>
                    );
                  })}
                  {installments > 6 && (
                    <p className="text-muted-foreground col-span-2">...e mais {installments - 6} parcelas</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Observações adicionais sobre esta importação..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* What will happen */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Ao finalizar, será gerado:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            <li>✓ Entrada de compra com {data.items.length} itens</li>
            <li>✓ Movimentação de estoque (entrada)</li>
            <li>✓ Atualização de custos médios</li>
            {categoryId && (
              <li>✓ Conta a pagar ({installments > 1 ? `${installments} parcelas` : 'à vista'})</li>
            )}
            <li>✓ Atualização automática de fichas técnicas afetadas</li>
            <li>✓ Vínculos salvos para próximas importações</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <Separator />
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isProcessing}>
          Voltar
        </Button>
        <Button 
          onClick={handleFinalize} 
          disabled={isProcessing}
          size="lg"
          className="min-w-[200px]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Finalizar Importação
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
