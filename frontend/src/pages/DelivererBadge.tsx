/**
 * Deliverer Badge Generator
 * 
 * Componente para gerar crachá de entregador com código de barras
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Printer, 
  QrCode, 
  Phone,
  Truck,
  Loader2
} from 'lucide-react';
import Barcode from 'react-barcode';

interface Deliverer {
  id: string;
  name: string;
  whatsapp: string | null;
  access_token: string | null;
  active: boolean;
}

export default function DelivererBadge() {
  const { company } = useCompanyContext();
  const [selectedDeliverer, setSelectedDeliverer] = useState<Deliverer | null>(null);

  const { data: deliverers = [], isLoading } = useQuery({
    queryKey: ['deliverers-badge', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('deliverers')
        .select('id, name, whatsapp, access_token, active')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data as Deliverer[];
    },
    enabled: !!company?.id,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Gerar Crachá">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Gerar Crachá de Entregador">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Crachá de Entregador</h1>
          <p className="text-muted-foreground">
            Gere crachás com código de barras para expedição
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Deliverer List */}
          <Card>
            <CardHeader>
              <CardTitle>Selecione o Entregador</CardTitle>
            </CardHeader>
            <CardContent>
              {deliverers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum entregador cadastrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliverers.map((deliverer) => (
                    <div
                      key={deliverer.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedDeliverer?.id === deliverer.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-muted-foreground'
                      }`}
                      onClick={() => setSelectedDeliverer(deliverer)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{deliverer.name}</p>
                          {deliverer.whatsapp && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {deliverer.whatsapp}
                            </p>
                          )}
                        </div>
                        <Badge variant={deliverer.active ? 'default' : 'secondary'}>
                          {deliverer.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Badge Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pré-visualização do Crachá</span>
                {selectedDeliverer && (
                  <Button size="sm" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDeliverer ? (
                <div className="text-center py-12 text-muted-foreground">
                  <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione um entregador para gerar o crachá</p>
                </div>
              ) : (
                <div 
                  id="badge-print-area"
                  className="bg-white dark:bg-zinc-900 border-2 border-dashed rounded-lg p-6 print:border-solid"
                >
                  {/* Badge Content */}
                  <div className="text-center space-y-4">
                    {/* Company Logo/Name */}
                    <div className="border-b pb-4">
                      <h2 className="text-xl font-bold text-primary">
                        {company?.name || 'Empresa'}
                      </h2>
                      <p className="text-sm text-muted-foreground">ENTREGADOR</p>
                    </div>

                    {/* Photo placeholder */}
                    <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>

                    {/* Name */}
                    <div>
                      <h3 className="text-2xl font-bold">{selectedDeliverer.name}</h3>
                      {selectedDeliverer.whatsapp && (
                        <p className="text-muted-foreground">{selectedDeliverer.whatsapp}</p>
                      )}
                    </div>

                    {/* Barcode */}
                    <div className="pt-4 border-t">
                      <Barcode 
                        value={selectedDeliverer.access_token || selectedDeliverer.id}
                        width={2}
                        height={60}
                        fontSize={12}
                        displayValue={true}
                      />
                    </div>

                    {/* ID */}
                    <p className="text-xs text-muted-foreground">
                      ID: {selectedDeliverer.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #badge-print-area, #badge-print-area * {
            visibility: visible;
          }
          #badge-print-area {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 8cm;
            height: 12cm;
            padding: 1cm;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
