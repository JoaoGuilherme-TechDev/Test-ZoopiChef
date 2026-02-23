import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bot } from "lucide-react";
import { useAIConciergeSettings, useConciergeStats } from "@/hooks/useAIConcierge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function AIConciergeSettings() {
  const { settings, isLoading, updateSettings } = useAIConciergeSettings();
  const stats = useConciergeStats();

  if (isLoading) return <DashboardLayout title="AI Concierge"><div className="p-8 text-center">Carregando...</div></DashboardLayout>;

  return (
    <DashboardLayout title="AI Concierge Chat">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Bot className="w-8 h-8" />AI Concierge Chat</h1>
            <p className="text-muted-foreground">Assistente virtual para clientes via chat</p>
          </div>
          <Switch checked={settings?.enabled || false} onCheckedChange={(enabled) => updateSettings.mutate({ enabled })} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats.totalConversations}</div><p className="text-xs text-muted-foreground">Conversas</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats.resolved}</div><p className="text-xs text-muted-foreground">Resolvidas</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats.escalated}</div><p className="text-xs text-muted-foreground">Escaladas</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats.reservationsCreated}</div><p className="text-xs text-muted-foreground">Reservas</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats.ordersCreated}</div><p className="text-xs text-muted-foreground">Pedidos</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats.avgMessages}</div><p className="text-xs text-muted-foreground">Msgs/Conv</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats.avgSatisfaction}</div><p className="text-xs text-muted-foreground">Satisfação</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Configurações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Mensagem de Boas-vindas</Label><Input defaultValue={settings?.welcome_message || ''} onBlur={(e) => updateSettings.mutate({ welcome_message: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between"><Label>Fazer Reservas</Label><Switch checked={settings?.can_make_reservations || false} onCheckedChange={(v) => updateSettings.mutate({ can_make_reservations: v })} /></div>
              <div className="flex items-center justify-between"><Label>Recomendar Pratos</Label><Switch checked={settings?.can_recommend_dishes || false} onCheckedChange={(v) => updateSettings.mutate({ can_recommend_dishes: v })} /></div>
              <div className="flex items-center justify-between"><Label>Responder Alérgenos</Label><Switch checked={settings?.can_answer_allergens || false} onCheckedChange={(v) => updateSettings.mutate({ can_answer_allergens: v })} /></div>
              <div className="flex items-center justify-between"><Label>Mostrar Tempo de Espera</Label><Switch checked={settings?.can_show_wait_time || false} onCheckedChange={(v) => updateSettings.mutate({ can_show_wait_time: v })} /></div>
              <div className="flex items-center justify-between"><Label>Anotar Pedidos</Label><Switch checked={settings?.can_take_orders || false} onCheckedChange={(v) => updateSettings.mutate({ can_take_orders: v })} /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
