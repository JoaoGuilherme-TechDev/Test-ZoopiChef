import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Clock, Truck, Filter } from "lucide-react";

type OrderCard = {
  id: string;
  customer: string;
  total: number;
  time: string;
  type: string;
  status: "Preparando" | "Pronto" | "Em Rota" | "Entregue";
};

const MOCK: OrderCard[] = [
  { id: "8316", customer: "Balcão", total: 44.0, time: "18min", type: "Balcão", status: "Preparando" },
  { id: "8315", customer: "Online Ligação", total: 30.0, time: "19min", type: "Online", status: "Em Rota" },
  { id: "8277", customer: "Online", total: 25.5, time: "22min", type: "Online", status: "Entregue" },
];

export default function OrdersPage() {
  const [data, setData] = useState<OrderCard[]>(MOCK);
  const groups = useMemo(() => {
    return {
      Preparando: data.filter(d => d.status === "Preparando"),
      Pronto: data.filter(d => d.status === "Pronto"),
      "Em Rota": data.filter(d => d.status === "Em Rota"),
      Entregue: data.filter(d => d.status === "Entregue"),
    };
  }, [data]);

  const moveTo = (id: string, status: OrderCard["status"]) => {
    setData(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const Column = ({ title, color, items }: { title: keyof typeof groups; color: string; items: OrderCard[] }) => (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3 min-h-[500px]">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${color}`} />
          <span className="text-sm font-bold uppercase tracking-widest">{title}</span>
        </div>
        <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <div className="h-[420px] rounded-lg border border-dashed border-white/10 flex items-center justify-center text-xs text-muted-foreground">
          Nenhum pedido
        </div>
      ) : items.map(order => (
        <Card key={order.id} className="bg-white/5 border-white/10">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500">#{order.id}</Badge>
                <span className="text-xs uppercase tracking-widest">{order.customer}</span>
              </div>
              <span className="text-xs text-muted-foreground">{order.time}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-3 w-3" />
                <span>{order.type}</span>
              </div>
              <span className="text-base font-black text-white">R$ {order.total.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              {title !== "Preparando" && (
                <Button size="sm" variant="outline" className="h-8" onClick={() => moveTo(order.id, "Preparando")}>
                  Mover para Preparo
                </Button>
              )}
              {title !== "Pronto" && (
                <Button size="sm" variant="outline" className="h-8" onClick={() => moveTo(order.id, "Pronto")}>
                  Marcar Pronto
                </Button>
              )}
              {title !== "Em Rota" && (
                <Button size="sm" variant="outline" className="h-8" onClick={() => moveTo(order.id, "Em Rota")}>
                  Em Rota
                </Button>
              )}
              {title !== "Entregue" && (
                <Button size="sm" className="h-8" onClick={() => moveTo(order.id, "Entregue")}>
                  Entregar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <DashboardLayout title="Gestão de Pedidos">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Pedidos</h2>
              <p className="text-xs text-gray-500 font-medium">{data.length} ativos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white h-9">
              <Filter className="h-4 w-4 mr-2" /> Filtrar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <Column title="Preparando" color="bg-amber-500" items={groups.Preparando} />
          <Column title="Pronto" color="bg-emerald-500" items={groups.Pronto} />
          <Column title="Em Rota" color="bg-violet-500" items={groups["Em Rota"]} />
          <Column title="Entregue" color="bg-sky-500" items={groups.Entregue} />
        </div>
      </div>
    </DashboardLayout>
  );
}
