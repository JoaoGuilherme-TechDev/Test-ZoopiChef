import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, Loader2, Upload, Save } from 'lucide-react';
import { useMyReseller, useUpdateReseller } from '@/hooks/useResellers';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function ResellerBranding() {
  const { isRevendedor, isLoading: rolesLoading } = useUserRoles();
  const { reseller, isLoading: resellerLoading, refetch } = useMyReseller();
  const updateReseller = useUpdateReseller();

  const [formData, setFormData] = useState({
    system_name: '',
    primary_color: '',
    secondary_color: '',
    background_color: '',
    logo_url: '',
  });

  useEffect(() => {
    if (reseller) {
      setFormData({
        system_name: reseller.system_name || '',
        primary_color: reseller.primary_color || '#3b82f6',
        secondary_color: reseller.secondary_color || '#1e40af',
        background_color: reseller.background_color || '#ffffff',
        logo_url: reseller.logo_url || '',
      });
    }
  }, [reseller]);

  const handleSave = async () => {
    if (!reseller) return;

    await updateReseller.mutateAsync({
      id: reseller.id,
      ...formData,
    });

    refetch();
    toast.success('Personalização salva com sucesso!');
  };

  if (rolesLoading || resellerLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isRevendedor) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6" />
            Personalização do Sistema
          </h1>
          <p className="text-muted-foreground">
            Configure a aparência do sistema para seus clientes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Identidade Visual</CardTitle>
              <CardDescription>
                Defina as cores e logo do seu white-label
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Sistema</Label>
                <Input
                  value={formData.system_name}
                  onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
                  placeholder="Ex: Seu Sistema"
                />
              </div>

              <div className="space-y-2">
                <Label>URL do Logo</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://..."
                  />
                  <Button variant="outline" size="icon">
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <div 
                      className="w-10 h-10 rounded border shadow-sm" 
                      style={{ backgroundColor: formData.primary_color }}
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor Secundária</Label>
                  <div className="flex gap-2">
                    <div 
                      className="w-10 h-10 rounded border shadow-sm" 
                      style={{ backgroundColor: formData.secondary_color }}
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={updateReseller.isPending} className="w-full">
                {updateReseller.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização</CardTitle>
              <CardDescription>
                Como seus clientes verão o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border rounded-lg overflow-hidden shadow-lg"
                style={{ backgroundColor: '#f3f4f6' }}
              >
                {/* Mock Header */}
                <div 
                  className="h-14 px-4 flex items-center justify-between"
                  style={{ backgroundColor: formData.background_color === '#ffffff' ? '#ffffff' : formData.background_color }}
                >
                  <div className="flex items-center gap-2">
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="Logo" className="h-8 object-contain" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-200" />
                    )}
                    <span className="font-bold text-lg">{formData.system_name || 'Seu Sistema'}</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                  </div>
                </div>

                {/* Mock Sidebar & Content */}
                <div className="flex h-64">
                  <div 
                    className="w-48 p-4 space-y-2 text-white"
                    style={{ backgroundColor: formData.secondary_color }}
                  >
                    <div className="h-8 rounded bg-white/10 w-full" />
                    <div className="h-8 rounded bg-white/20 w-full" />
                    <div className="h-8 rounded bg-white/10 w-full" />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="h-32 rounded-lg border bg-white p-4 shadow-sm">
                      <h3 className="font-semibold mb-2" style={{ color: formData.primary_color }}>
                        Bem-vindo ao {formData.system_name || 'Sistema'}
                      </h3>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-4 bg-gray-100 rounded w-1/2" />
                      </div>
                      <div className="mt-4">
                        <button 
                          className="px-4 py-2 rounded text-white text-sm"
                          style={{ backgroundColor: formData.primary_color }}
                        >
                          Ação Principal
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
