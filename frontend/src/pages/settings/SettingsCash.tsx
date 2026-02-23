import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompanyGeneralSettings } from '@/hooks/useCompanyGeneralSettings';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, Save } from 'lucide-react';

export default function SettingsCash() {
  const { data: settings, isLoading, upsert, isPending } = useCompanyGeneralSettings();
  const { accounts: bankAccounts } = useBankAccounts();
  const { accounts: chartAccounts } = useChartOfAccounts();

  const [formData, setFormData] = useState({
    default_payable_bank_account_id: '' as string,
    cash_shortage_chart_account_id: '' as string,
    cash_surplus_chart_account_id: '' as string,
    fee_reconciliation_chart_account_id: '' as string,
    fiado_mode: 'post_paid' as 'post_paid' | 'pre_paid' | 'both',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        default_payable_bank_account_id: settings.default_payable_bank_account_id || '',
        cash_shortage_chart_account_id: settings.cash_shortage_chart_account_id || '',
        cash_surplus_chart_account_id: settings.cash_surplus_chart_account_id || '',
        fee_reconciliation_chart_account_id: settings.fee_reconciliation_chart_account_id || '',
        fiado_mode: settings.fiado_mode || 'post_paid',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await upsert({
        default_payable_bank_account_id: formData.default_payable_bank_account_id || null,
        cash_shortage_chart_account_id: formData.cash_shortage_chart_account_id || null,
        cash_surplus_chart_account_id: formData.cash_surplus_chart_account_id || null,
        fee_reconciliation_chart_account_id: formData.fee_reconciliation_chart_account_id || null,
        fiado_mode: formData.fiado_mode,
      });
      toast.success('Configurações de caixa salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configurações de Caixa">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações de Caixa">
      <div className="max-w-2xl space-y-6 animate-fade-in">
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Configurações de Valores do Caixa</CardTitle>
                <CardDescription>
                  Configure as contas padrão para movimentações de caixa
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bank account for payables */}
            <div className="space-y-2">
              <Label>Origem dos recursos padrão (contas a pagar)</Label>
              <Select
                value={formData.default_payable_bank_account_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, default_payable_bank_account_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta bancária" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {bankAccounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chart accounts */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Conta padrão para valores faltantes no caixa</Label>
                <Select
                  value={formData.cash_shortage_chart_account_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cash_shortage_chart_account_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {chartAccounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conta padrão para valores sobrando no caixa</Label>
                <Select
                  value={formData.cash_surplus_chart_account_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cash_surplus_chart_account_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {chartAccounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conta padrão para lançamento de taxa na conciliação</Label>
                <Select
                  value={formData.fee_reconciliation_chart_account_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, fee_reconciliation_chart_account_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {chartAccounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fiado mode */}
            <div className="space-y-2 pt-4 border-t">
              <Label>Modo de uso do Conta Corrente/Fiado</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Defina o comportamento do Conta Corrente / Fiado.
                Escolha entre os modos: Conta Corrente/Fiado tradicional (Pós-Pago), 
                ou Conta Corrente/Fiado com Pagamento Antecipado (Pré-pago).
              </p>
              <Select
                value={formData.fiado_mode}
                onValueChange={(value: 'post_paid' | 'pre_paid' | 'both') => 
                  setFormData(prev => ({ ...prev, fiado_mode: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post_paid">Somente Conta Corrente/Fiado tradicional (Pós-Pago)</SelectItem>
                  <SelectItem value="pre_paid">Somente Conta Corrente/Fiado com Pagamento Antecipado (Pré-pago)</SelectItem>
                  <SelectItem value="both">Ambos os modos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={isPending} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
