import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompany, useUpdateCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Layout, Grid, Sparkles, Save } from 'lucide-react';

const layouts = [
  {
    id: 'classic',
    name: 'Clássico',
    description: 'Lista simples com acordeões por categoria',
    icon: Layout,
  },
  {
    id: 'grid',
    name: 'Grade',
    description: 'Produtos em cards lado a lado',
    icon: Grid,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Visual moderno com imagens grandes',
    icon: Sparkles,
  },
];

export default function SettingsLayout() {
  const { data: company, isLoading, refetch } = useCompany();
  const { data: userRole } = useUserRole();
  const updateCompany = useUpdateCompany();

  const [selectedLayout, setSelectedLayout] = useState('classic');

  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  useEffect(() => {
    if (company) {
      setSelectedLayout((company as any).public_menu_layout || 'classic');
    }
  }, [company]);

  const handleSave = async () => {
    if (!company) return;

    try {
      await updateCompany.mutateAsync({
        id: company.id,
        public_menu_layout: selectedLayout,
      } as any);
      
      // Refetch company data to update context
      await refetch();
      
      toast.success('Layout atualizado com sucesso!');
    } catch {
      toast.error('Erro ao salvar layout');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Layout do Cardápio">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Layout do Cardápio">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Configure sua empresa primeiro.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Layout do Cardápio">
      <div className="max-w-2xl space-y-6 animate-fade-in">
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Layout className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Layout Público</CardTitle>
                <CardDescription>
                  Escolha como seu cardápio será exibido para os clientes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedLayout}
              onValueChange={setSelectedLayout}
              disabled={!isAdmin}
              className="grid gap-4"
            >
              {layouts.map((layout) => {
                const Icon = layout.icon;
                const isSelected = selectedLayout === layout.id;

                return (
                  <div key={layout.id}>
                    <RadioGroupItem
                      value={layout.id}
                      id={layout.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={layout.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }
                      `}
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center
                        ${isSelected ? 'bg-primary/10' : 'bg-muted'}
                      `}>
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{layout.name}</p>
                        <p className="text-sm text-muted-foreground">{layout.description}</p>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            {isAdmin && (
              <Button 
                onClick={handleSave} 
                disabled={updateCompany.isPending}
                className="w-full mt-6"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateCompany.isPending ? 'Salvando...' : 'Salvar Layout'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-soft bg-muted/30">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              O layout escolhido será aplicado no Cardápio Delivery.
              <br />
              A TV tem layout próprio otimizado para telas grandes.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
