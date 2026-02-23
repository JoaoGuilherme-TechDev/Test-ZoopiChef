import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOperatorPermissions, OperatorPermission } from '@/hooks/useOperatorPermissions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { Loader2, Shield, Save, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function SettingsOperatorPermissions() {
  const { data: company } = useCompany();
  const { allPermissions, savePermissions, DEFAULT_PERMISSIONS, loadingAll } = useOperatorPermissions();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [permissions, setPermissions] = useState<Partial<OperatorPermission>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Buscar usuários da empresa
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['company-users', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', company.id);

      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!company?.id,
  });

  // Quando selecionar um usuário, carregar suas permissões
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    
    const existing = allPermissions.find(p => p.user_id === userId);
    if (existing) {
      setPermissions(existing);
    } else {
      setPermissions(DEFAULT_PERMISSIONS);
    }
  };

  const handlePermissionChange = (key: keyof OperatorPermission, value: boolean | number) => {
    setPermissions(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      toast.error('Selecione um operador');
      return;
    }

    setIsSaving(true);
    try {
      await savePermissions.mutateAsync({
        userId: selectedUserId,
        permissions,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = loadingUsers || loadingAll;

  return (
    <DashboardLayout title="Permissões de Operadores">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gerenciar Permissões do PDV
            </CardTitle>
            <CardDescription>
              Configure as permissões de cada operador para as funcionalidades do PDV.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seleção de Operador */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Selecione o Operador
              </Label>
              <Select value={selectedUserId} onValueChange={handleUserSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha um operador..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : selectedUserId ? (
              <>
                <Separator />

                {/* Permissões de Caixa */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Operações de Caixa</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_open_cash">Abrir Caixa</Label>
                      <Switch
                        id="can_open_cash"
                        checked={permissions.can_open_cash ?? true}
                        onCheckedChange={v => handlePermissionChange('can_open_cash', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_close_cash">Fechar Caixa</Label>
                      <Switch
                        id="can_close_cash"
                        checked={permissions.can_close_cash ?? true}
                        onCheckedChange={v => handlePermissionChange('can_close_cash', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_supply">Fazer Suprimento</Label>
                      <Switch
                        id="can_supply"
                        checked={permissions.can_supply ?? false}
                        onCheckedChange={v => handlePermissionChange('can_supply', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_withdrawal">Fazer Sangria</Label>
                      <Switch
                        id="can_withdrawal"
                        checked={permissions.can_withdrawal ?? false}
                        onCheckedChange={v => handlePermissionChange('can_withdrawal', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_open_drawer">Abrir Gaveta</Label>
                      <Switch
                        id="can_open_drawer"
                        checked={permissions.can_open_drawer ?? true}
                        onCheckedChange={v => handlePermissionChange('can_open_drawer', v)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Permissões de Vendas */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Operações de Vendas</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_cancel_sale">Cancelar Venda</Label>
                      <Switch
                        id="can_cancel_sale"
                        checked={permissions.can_cancel_sale ?? false}
                        onCheckedChange={v => handlePermissionChange('can_cancel_sale', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_reverse_sale">Estornar Venda</Label>
                      <Switch
                        id="can_reverse_sale"
                        checked={permissions.can_reverse_sale ?? false}
                        onCheckedChange={v => handlePermissionChange('can_reverse_sale', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_apply_discount">Aplicar Desconto</Label>
                      <Switch
                        id="can_apply_discount"
                        checked={permissions.can_apply_discount ?? false}
                        onCheckedChange={v => handlePermissionChange('can_apply_discount', v)}
                      />
                    </div>
                    {permissions.can_apply_discount && (
                      <div className="space-y-2">
                        <Label htmlFor="max_discount">Desconto Máximo (%)</Label>
                        <Input
                          id="max_discount"
                          type="number"
                          min="0"
                          max="100"
                          value={permissions.max_discount_percent ?? 0}
                          onChange={e => handlePermissionChange('max_discount_percent', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Permissões Fiscais */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Operações Fiscais (NFC-e)</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_issue_nfce">Emitir NFC-e</Label>
                      <Switch
                        id="can_issue_nfce"
                        checked={permissions.can_issue_nfce ?? false}
                        onCheckedChange={v => handlePermissionChange('can_issue_nfce', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_cancel_nfce">Cancelar NFC-e</Label>
                      <Switch
                        id="can_cancel_nfce"
                        checked={permissions.can_cancel_nfce ?? false}
                        onCheckedChange={v => handlePermissionChange('can_cancel_nfce', v)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Permissões de Relatórios */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Relatórios</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_view_x_report">Ver Relatório X</Label>
                      <Switch
                        id="can_view_x_report"
                        checked={permissions.can_view_x_report ?? true}
                        onCheckedChange={v => handlePermissionChange('can_view_x_report', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_view_z_report">Ver Relatório Z (Fechamento)</Label>
                      <Switch
                        id="can_view_z_report"
                        checked={permissions.can_view_z_report ?? false}
                        onCheckedChange={v => handlePermissionChange('can_view_z_report', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="can_view_cash_history">Ver Histórico de Caixas</Label>
                      <Switch
                        id="can_view_cash_history"
                        checked={permissions.can_view_cash_history ?? false}
                        onCheckedChange={v => handlePermissionChange('can_view_cash_history', v)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Botão Salvar */}
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Permissões
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Selecione um operador para configurar suas permissões.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
