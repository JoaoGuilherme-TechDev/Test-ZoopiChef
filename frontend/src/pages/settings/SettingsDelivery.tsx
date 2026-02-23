import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDeliveryConfig, DeliveryNeighborhood, DeliveryRange } from '@/hooks/useDeliveryConfig';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Truck, MapPin, Plus, Trash2, Save, AlertCircle, Loader2 } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function SettingsDelivery() {
  const { config, neighborhoods, ranges, isLoading, saveConfig, addNeighborhood, updateNeighborhood, deleteNeighborhood, addRange, deleteRange } = useDeliveryConfig();
  const { data: userRole } = useUserRole();
  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  // Config state
  const [mode, setMode] = useState<'neighborhood' | 'radius'>('neighborhood');
  const [originAddress, setOriginAddress] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState('10');
  const [fallbackFee, setFallbackFee] = useState('5.00');
  const [allowManualOverride, setAllowManualOverride] = useState(true);

  // Dialog states
  const [neighborhoodDialog, setNeighborhoodDialog] = useState(false);
  const [rangeDialog, setRangeDialog] = useState(false);
  
  // New neighborhood form
  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newNeighborhoodFee, setNewNeighborhoodFee] = useState('');
  const [newNeighborhoodEta, setNewNeighborhoodEta] = useState('');
  
  // New range form
  const [newMinKm, setNewMinKm] = useState('');
  const [newMaxKm, setNewMaxKm] = useState('');
  const [newRangeFee, setNewRangeFee] = useState('');
  const [newRangeEta, setNewRangeEta] = useState('');

  useEffect(() => {
    if (config) {
      setMode(config.mode);
      setOriginAddress(config.origin_address || '');
      setMaxDistanceKm(String(config.max_distance_km || 10));
      setFallbackFee(String(config.fallback_fee || 5));
      setAllowManualOverride(config.allow_manual_override);
    }
  }, [config]);

  const handleSaveConfig = async () => {
    try {
      await saveConfig.mutateAsync({
        mode,
        origin_address: originAddress || null,
        max_distance_km: parseFloat(maxDistanceKm) || 10,
        fallback_fee: parseFloat(fallbackFee) || 5,
        allow_manual_override: allowManualOverride,
      });
    } catch {
      // Error handled in hook
    }
  };

  const handleAddNeighborhood = async () => {
    if (!newNeighborhood.trim() || !newCity.trim()) {
      toast.error('Preencha bairro e cidade');
      return;
    }
    try {
      await addNeighborhood.mutateAsync({
        neighborhood: newNeighborhood.trim(),
        city: newCity.trim(),
        fee: parseFloat(newNeighborhoodFee) || 0,
        estimated_minutes: newNeighborhoodEta ? parseInt(newNeighborhoodEta) : null,
        active: true,
      });
      setNewNeighborhood('');
      setNewCity('');
      setNewNeighborhoodFee('');
      setNewNeighborhoodEta('');
      setNeighborhoodDialog(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleDeleteNeighborhood = async (id: string) => {
    try {
      await deleteNeighborhood.mutateAsync(id);
    } catch {
      // Error handled in hook
    }
  };

  const handleAddRange = async () => {
    const min = parseFloat(newMinKm);
    const max = parseFloat(newMaxKm);
    
    if (isNaN(min) || isNaN(max) || min >= max) {
      toast.error('Faixa inválida: mínimo deve ser menor que máximo');
      return;
    }
    
    // Check overlap
    const hasOverlap = ranges.some(r => 
      (min >= r.min_km && min < r.max_km) ||
      (max > r.min_km && max <= r.max_km) ||
      (min <= r.min_km && max >= r.max_km)
    );
    
    if (hasOverlap) {
      toast.error('Faixa sobrepõe outra existente');
      return;
    }
    
    try {
      await addRange.mutateAsync({
        min_km: min,
        max_km: max,
        fee: parseFloat(newRangeFee) || 0,
        estimated_minutes: newRangeEta ? parseInt(newRangeEta) : null,
        active: true,
      });
      setNewMinKm('');
      setNewMaxKm('');
      setNewRangeFee('');
      setNewRangeEta('');
      setRangeDialog(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleDeleteRange = async (id: string) => {
    try {
      await deleteRange.mutateAsync(id);
    } catch {
      // Error handled in hook
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Taxas de Entrega">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Taxas de Entrega">
      <div className="max-w-4xl space-y-6 animate-fade-in">
        {/* Mode Selection */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Configuração de Taxas</CardTitle>
                <CardDescription>
                  Defina como as taxas de entrega serão calculadas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'neighborhood' | 'radius')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="neighborhood" disabled={!isAdmin}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Por Bairro
                </TabsTrigger>
                <TabsTrigger value="radius" disabled={!isAdmin}>
                  <Truck className="h-4 w-4 mr-2" />
                  Por Raio (km)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="neighborhood" className="mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Configure taxas específicas para cada bairro atendido.
                </p>
              </TabsContent>

              <TabsContent value="radius" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Configure faixas de distância com taxas diferentes.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="origin">Endereço de origem</Label>
                    <Input
                      id="origin"
                      placeholder="Rua, número, cidade..."
                      value={originAddress}
                      onChange={(e) => setOriginAddress(e.target.value)}
                      disabled={!isAdmin}
                    />
                    <p className="text-xs text-muted-foreground">
                      Endereço do seu estabelecimento para calcular distância
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max-distance">Distância máxima (km)</Label>
                    <Input
                      id="max-distance"
                      type="number"
                      step="0.5"
                      value={maxDistanceKm}
                      onChange={(e) => setMaxDistanceKm(e.target.value)}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fallback">Taxa padrão (fallback)</Label>
                <Input
                  id="fallback"
                  type="number"
                  step="0.50"
                  value={fallbackFee}
                  onChange={(e) => setFallbackFee(e.target.value)}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Usada quando não for possível calcular automaticamente
                </p>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Permitir taxa manual</Label>
                  <p className="text-xs text-muted-foreground">
                    Operador pode inserir taxa manualmente
                  </p>
                </div>
                <Switch
                  checked={allowManualOverride}
                  onCheckedChange={setAllowManualOverride}
                  disabled={!isAdmin}
                />
              </div>
            </div>

            {isAdmin && (
              <Button onClick={handleSaveConfig} disabled={saveConfig.isPending} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saveConfig.isPending ? 'Salvando...' : 'Salvar Configuração'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Neighborhoods List */}
        {mode === 'neighborhood' && (
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Bairros Atendidos</CardTitle>
                <CardDescription>{neighborhoods.length} bairros cadastrados</CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={neighborhoodDialog} onOpenChange={setNeighborhoodDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Bairro</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Bairro *</Label>
                          <Input
                            placeholder="Centro"
                            value={newNeighborhood}
                            onChange={(e) => setNewNeighborhood(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cidade *</Label>
                          <Input
                            placeholder="São Paulo"
                            value={newCity}
                            onChange={(e) => setNewCity(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Taxa (R$)</Label>
                          <Input
                            type="number"
                            step="0.50"
                            placeholder="5.00"
                            value={newNeighborhoodFee}
                            onChange={(e) => setNewNeighborhoodFee(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tempo estimado (min)</Label>
                          <Input
                            type="number"
                            placeholder="30"
                            value={newNeighborhoodEta}
                            onChange={(e) => setNewNeighborhoodEta(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNeighborhoodDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddNeighborhood} disabled={addNeighborhood.isPending}>
                        {addNeighborhood.isPending ? 'Salvando...' : 'Adicionar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {neighborhoods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum bairro cadastrado</p>
                  <p className="text-sm">Adicione bairros para calcular taxas automaticamente</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bairro</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                      <TableHead className="text-right">ETA</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {neighborhoods.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium">{n.neighborhood}</TableCell>
                        <TableCell>{n.city}</TableCell>
                        <TableCell className="text-right">{formatCurrency(n.fee)}</TableCell>
                        <TableCell className="text-right">
                          {n.estimated_minutes ? `${n.estimated_minutes} min` : '-'}
                        </TableCell>
                        <TableCell>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteNeighborhood(n.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ranges List */}
        {mode === 'radius' && (
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Faixas de Distância</CardTitle>
                <CardDescription>{ranges.length} faixas cadastradas</CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={rangeDialog} onOpenChange={setRangeDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Faixa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>De (km) *</Label>
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="0"
                            value={newMinKm}
                            onChange={(e) => setNewMinKm(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Até (km) *</Label>
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="5"
                            value={newMaxKm}
                            onChange={(e) => setNewMaxKm(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Taxa (R$)</Label>
                          <Input
                            type="number"
                            step="0.50"
                            placeholder="5.00"
                            value={newRangeFee}
                            onChange={(e) => setNewRangeFee(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tempo estimado (min)</Label>
                          <Input
                            type="number"
                            placeholder="30"
                            value={newRangeEta}
                            onChange={(e) => setNewRangeEta(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRangeDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddRange} disabled={addRange.isPending}>
                        {addRange.isPending ? 'Salvando...' : 'Adicionar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {ranges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma faixa cadastrada</p>
                  <p className="text-sm">Adicione faixas de distância para calcular taxas</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faixa (km)</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                      <TableHead className="text-right">ETA</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranges.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.min_km} - {r.max_km} km
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(r.fee)}</TableCell>
                        <TableCell className="text-right">
                          {r.estimated_minutes ? `${r.estimated_minutes} min` : '-'}
                        </TableCell>
                        <TableCell>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteRange(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Por Bairro:</strong> Taxa fixa baseada no bairro do cliente</li>
                <li><strong>Por Raio:</strong> Taxa baseada na distância em km do estabelecimento</li>
                <li>Se não for possível calcular, a taxa padrão (fallback) será usada</li>
                <li>A taxa é exibida no checkout antes da confirmação do pedido</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
