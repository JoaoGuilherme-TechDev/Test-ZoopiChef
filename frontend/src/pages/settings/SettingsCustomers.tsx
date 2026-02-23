import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompanyGeneralSettings } from '@/hooks/useCompanyGeneralSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Users, Save } from 'lucide-react';

export default function SettingsCustomers() {
  const { data: settings, isLoading, upsert, isPending } = useCompanyGeneralSettings();

  const [formData, setFormData] = useState({
    default_customer_profile: 'Cliente Padrão',
    default_legal_profile: 'Cliente Padrão',
    allow_duplicate_cpf_cnpj: false,
    require_cpf_cnpj: false,
    show_extra_phones: false,
    allow_invalid_cep: false,
    allow_duplicate_email: false,
    phone_confirmation_required: false,
    birthdate_behavior: 'show' as 'show' | 'require' | 'hide',
    cpf_behavior: 'show_optional' as 'show_optional' | 'hide' | 'show_required',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        default_customer_profile: settings.default_customer_profile || 'Cliente Padrão',
        default_legal_profile: settings.default_legal_profile || 'Cliente Padrão',
        allow_duplicate_cpf_cnpj: settings.allow_duplicate_cpf_cnpj ?? false,
        require_cpf_cnpj: settings.require_cpf_cnpj ?? false,
        show_extra_phones: settings.show_extra_phones ?? false,
        allow_invalid_cep: settings.allow_invalid_cep ?? false,
        allow_duplicate_email: settings.allow_duplicate_email ?? false,
        phone_confirmation_required: settings.phone_confirmation_required ?? false,
        birthdate_behavior: settings.birthdate_behavior || 'show',
        cpf_behavior: settings.cpf_behavior || 'show_optional',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await upsert(formData);
      toast.success('Configurações de clientes salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configurações de Clientes">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações de Clientes">
      <div className="max-w-2xl space-y-6 animate-fade-in">
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Configurações de Clientes</CardTitle>
                <CardDescription>
                  Defina como os dados dos clientes serão tratados no sistema
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Perfis padrão */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Perfil padrão*</Label>
                <Input
                  value={formData.default_customer_profile}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_customer_profile: e.target.value }))}
                  placeholder="Cliente Padrão"
                />
              </div>

              <div className="space-y-2">
                <Label>Perfil padrão (jurídico)</Label>
                <Input
                  value={formData.default_legal_profile}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_legal_profile: e.target.value }))}
                  placeholder="Cliente Padrão"
                />
              </div>
            </div>

            {/* Toggle options */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Permitir CPF/CNPJ duplicado</p>
                  <p className="text-sm text-muted-foreground">Permite cadastrar clientes com mesmo CPF/CNPJ</p>
                </div>
                <Switch
                  checked={formData.allow_duplicate_cpf_cnpj}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_duplicate_cpf_cnpj: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Exigir CPF/CNPJ no cadastro de cliente</p>
                  <p className="text-sm text-muted-foreground">O campo CPF/CNPJ será obrigatório</p>
                </div>
                <Switch
                  checked={formData.require_cpf_cnpj}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_cpf_cnpj: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Exibir fones extra?</p>
                  <p className="text-sm text-muted-foreground">Mostrar campos para telefones adicionais</p>
                </div>
                <Switch
                  checked={formData.show_extra_phones}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_extra_phones: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Permite CEP inválido?</p>
                  <p className="text-sm text-muted-foreground">Aceitar cadastro mesmo sem validação de CEP</p>
                </div>
                <Switch
                  checked={formData.allow_invalid_cep}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_invalid_cep: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Permite email duplicado?</p>
                  <p className="text-sm text-muted-foreground">Permite cadastrar clientes com mesmo email</p>
                </div>
                <Switch
                  checked={formData.allow_duplicate_email}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_duplicate_email: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Ativar confirmação de Telefone?</p>
                  <p className="text-sm text-muted-foreground">Exige digitação do telefone 2x para novos cadastros</p>
                </div>
                <Switch
                  checked={formData.phone_confirmation_required}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, phone_confirmation_required: checked }))}
                />
              </div>
            </div>

            {/* Select options */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Escolha o comportamento desejado para o campo de data de nascimento
                </p>
                <Select
                  value={formData.birthdate_behavior}
                  onValueChange={(value: 'show' | 'require' | 'hide') => 
                    setFormData(prev => ({ ...prev, birthdate_behavior: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="show">Não exigir, mas mostrar o campo</SelectItem>
                    <SelectItem value="require">Exigir</SelectItem>
                    <SelectItem value="hide">Não exibir</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>CPF</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Escolha o comportamento desejado para o campo de CPF do cliente
                </p>
                <Select
                  value={formData.cpf_behavior}
                  onValueChange={(value: 'show_optional' | 'hide' | 'show_required') => 
                    setFormData(prev => ({ ...prev, cpf_behavior: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="show_optional">Exibir e opcional</SelectItem>
                    <SelectItem value="hide">Não exibir</SelectItem>
                    <SelectItem value="show_required">Exibir e obrigar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
