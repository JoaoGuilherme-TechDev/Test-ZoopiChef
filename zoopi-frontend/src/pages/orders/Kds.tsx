/* eslint-disable @typescript-eslint/no-explicit-any */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Clock, Truck, CheckCircle2, Filter } from "lucide-react";
import { useRecentActiveOrders } from "@/hooks/useSalonOverview";

const MOCK_ORDERS = [
  { id: "101", customer: "Mesa 1 · Comanda Migueleson", total: 89.90, status: "Novo", time: "5 min", type: "Cozinha", items: [{q:1,n:"X-Tudo Supremo do Chef"},{q:1,n:"Esfiha de Carne Artesanal"}] },
  { id: "102", customer: "Comanda 1", total: 45.00, status: "Preparando", time: "12 min", type: "Cozinha", items: [{q:1,n:"Açaí com pessego"},{q:1,n:"Bolo caseiro"}] },
  { id: "103", customer: "Balcão #310", total: 120.50, status: "Pronto", time: "20 min", type: "Balcão", items: [{q:1,n:"Vinho Argentino Malbec 750ml"}] },
];

export default function KDS() {
  return (
    <DashboardLayout title="KDS Cozinha">
      <div className="flex flex-col gap-6">
        {/* Topo da Página: Filtros e Ações */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">KDS Cozinha</h2>
              <ActiveCount />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white h-9">
              <Filter className="h-4 w-4 mr-2" /> Filtrar
            </Button>
            <Button size="sm" className="btn-neon h-9">
              Novo Pedido Manual
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest">Todos</Button>
          <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest">Bar</Button>
          <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest">Cozinha</Button>
          <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest">Migueleson</Button>
          <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest">Caixa</Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-black/40 border border-white/5 p-1 h-12 w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="px-6">Todos</TabsTrigger>
            <TabsTrigger value="new" className="px-6 flex items-center gap-2">
              Novos <Badge className="bg-blue-500 h-5 min-w-5">1</Badge>
            </TabsTrigger>
            <TabsTrigger value="prep" className="px-6 flex items-center gap-2">
              Preparando <Badge className="bg-orange-500 h-5 min-w-5">1</Badge>
            </TabsTrigger>
            <TabsTrigger value="ready" className="px-6 flex items-center gap-2">
              Prontos <Badge className="bg-green-500 h-5 min-w-5">1</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCK_ORDERS.map((order) => (
                <Card key={order.id} className="bg-white/5 border-white/10 hover:border-primary/50 transition-all group">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">#{order.id}</span>
                        <h3 className="text-lg font-bold text-white truncate">{order.customer}</h3>
                      </div>
                      <Badge variant="outline" className={cn(
                        "uppercase text-[9px] font-bold",
                        order.status === "Novo" && "border-blue-500 text-blue-400",
                        order.status === "Preparando" && "border-orange-500 text-orange-400",
                        order.status === "Pronto" && "border-green-500 text-green-400"
                      )}>
                        {order.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {order.time}
                      </div>
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3" /> {order.type}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      {(order as any).items?.map((it: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between rounded-md bg-white/5 border border-white/10 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="h-5">{it.q}x</Badge>
                            <span className="text-sm text-white">{it.n}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">Pendente</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-lg font-black text-white">
                        R$ {order.total.toFixed(2)}
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white">
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar Pronto
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

function ActiveCount() {
  const { data: recent = [] } = useRecentActiveOrders(10);
  return <p className="text-xs text-gray-500 font-medium">{recent.length} pedidos ativos no momento</p>;
}
