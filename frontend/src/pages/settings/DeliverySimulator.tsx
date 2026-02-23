import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin, Truck, Calculator, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useDeliveryConfig } from '@/hooks/useDeliveryConfig';
import { calculateDelivery, fromCents, DeliveryCalculationResult } from '@/lib/delivery/calculateDelivery';
import { fetchAddressByCep } from '@/hooks/useCustomerAddresses';
import { toast } from 'sonner';

export default function DeliverySimulator() {
  const { data: profile } = useProfile();
  const { config, neighborhoods, ranges } = useDeliveryConfig();
  
  const [cep, setCep] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [result, setResult] = useState<DeliveryCalculationResult | null>(null);

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const data = await fetchAddressByCep(cleanCep);
      if (data) {
        setNeighborhood(data.bairro);
        setCity(data.localidade);
        toast.success('Endereço encontrado!');
      }
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleSimulate = async () => {
    if (!profile?.company_id) {
      toast.error('Empresa não encontrada');
      return;
    }

    if (!neighborhood.trim()) {
      toast.error('Informe o bairro');
      return;
    }

    setIsCalculating(true);
    try {
      const calcResult = await calculateDelivery(profile.company_id, {
        cep: cep.replace(/\D/g, ''),
        neighborhood: neighborhood.trim(),
        city: city.trim() || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      });

      setResult(calcResult);

      if (calcResult.ok) {
        toast.success('Cálculo realizado com sucesso!');
      } else if (calcResult.needs_fallback) {
        toast.warning('Fallback aplicado - verifique configuração');
      } else {
        toast.error(calcResult.reason_if_fail || 'Não foi possível calcular');
      }
    } catch (error) {
      console.error('Erro no cálculo:', error);
      toast.error('Erro ao simular entrega');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleClear = () => {
    setCep('');
    setNeighborhood('');
    setCity('');
    setLatitude('');
    setLongitude('');
    setResult(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Simulador de Entrega
          </h1>
          <p className="text-muted-foreground">
            Teste o cálculo de taxa de entrega sem precisar fazer um pedido
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Formulário de Simulação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dados do Destino
              </CardTitle>
              <CardDescription>
                Informe os dados do endereço para simular o cálculo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="flex gap-2">
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    onBlur={handleCepBlur}
                    maxLength={9}
                  />
                  {isFetchingCep && <Loader2 className="h-5 w-5 animate-spin" />}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  placeholder="Nome do bairro"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  placeholder="Cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="-23.5505"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="-46.6333"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSimulate}
                  disabled={isCalculating || !neighborhood.trim()}
                  className="flex-1"
                >
                  {isCalculating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Truck className="h-4 w-4 mr-2" />
                  )}
                  Simular
                </Button>
                <Button variant="outline" onClick={handleClear}>
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultado */}
          <div className="space-y-4">
            {/* Configuração Atual */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Configuração Atual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modo:</span>
                  <Badge variant="outline">
                    {config?.mode === 'neighborhood' ? 'Por Bairro' : config?.mode === 'radius' ? 'Por Raio' : 'Não configurado'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bairros cadastrados:</span>
                  <span>{neighborhoods.filter(n => n.active).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Faixas de raio:</span>
                  <span>{ranges.filter(r => r.active).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa fallback:</span>
                  <span>R$ {config?.fallback_fee?.toFixed(2) || '0,00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Permite manual:</span>
                  <span>{config?.allow_manual_override ? 'Sim' : 'Não'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Resultado do Cálculo */}
            {result && (
              <Card className={result.ok ? 'border-green-500' : result.needs_fallback ? 'border-yellow-500' : 'border-red-500'}>
                <CardHeader className="py-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {result.ok ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : result.needs_fallback ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    Resultado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Status */}
                  <Alert variant={result.ok ? 'default' : 'destructive'}>
                    <AlertTitle>
                      {result.ok ? 'Entrega Possível' : result.needs_fallback ? 'Fallback Aplicado' : 'Entrega Bloqueada'}
                    </AlertTitle>
                    {result.reason_if_fail && (
                      <AlertDescription>{result.reason_if_fail}</AlertDescription>
                    )}
                  </Alert>

                  {/* Valores */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Taxa de Entrega:</span>
                      <span className="text-primary">
                        R$ {fromCents(result.fee_cents).toFixed(2)}
                      </span>
                    </div>
                    
                    {result.distance_km !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Distância:</span>
                        <span>{result.distance_km.toFixed(2)} km</span>
                      </div>
                    )}
                    
                    {result.eta_minutes && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tempo estimado:</span>
                        <span>{result.eta_minutes} min</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Modo usado:</span>
                      <Badge variant="secondary">
                        {result.mode_used === 'neighborhood' ? 'Bairro' : 
                         result.mode_used === 'radius' ? 'Raio' : 
                         result.mode_used === 'manual' ? 'Manual' : 'N/A'}
                      </Badge>
                    </div>

                    {result.needs_fallback && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Permite taxa manual:</span>
                        <span>{result.allowed_manual_fee ? 'Sim' : 'Não'}</span>
                      </div>
                    )}
                  </div>

                  {/* Faixas disponíveis (se modo raio com fallback) */}
                  {result.available_ranges && result.available_ranges.length > 0 && result.needs_fallback && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Faixas disponíveis para seleção manual:</h4>
                      <div className="space-y-1">
                        {result.available_ranges.map((range) => (
                          <div
                            key={range.id}
                            className="flex justify-between text-sm bg-muted/30 p-2 rounded"
                          >
                            <span>{range.min_km} - {range.max_km} km</span>
                            <span className="font-medium">R$ {range.fee.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Snapshot para auditoria */}
                  {result.rule_snapshot && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        Ver snapshot (auditoria)
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                        {JSON.stringify(result.rule_snapshot, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
