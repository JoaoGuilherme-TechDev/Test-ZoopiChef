import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone } from "lucide-react";
import { useVoiceAISettings, useVoiceAIStats } from "@/hooks/useVoiceAI";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function VoiceAISettings() {
  const { settings, isLoading, updateSettings } = useVoiceAISettings();
  const stats = useVoiceAIStats();

  if (isLoading) {
    return <DashboardLayout title="Voice AI"><div className="p-8 text-center">Carregando...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Voice AI Atendente">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Phone className="w-8 h-8" />
              Voice AI Atendente
            </h1>
            <p className="text-muted-foreground">IA que atende ligações, faz reservas e anota pedidos</p>
          </div>
          <Switch
            checked={settings?.enabled || false}
            onCheckedChange={(enabled) => updateSettings.mutate({ enabled })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{stats.totalCalls}</div><p className="text-sm text-muted-foreground">Ligações</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{stats.avgDuration}s</div><p className="text-sm text-muted-foreground">Duração Média</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{stats.reservationsCreated}</div><p className="text-sm text-muted-foreground">Reservas</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{stats.ordersCreated}</div><p className="text-sm text-muted-foreground">Pedidos</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{stats.transferredToHuman}</div><p className="text-sm text-muted-foreground">Transferidas</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{stats.avgSatisfaction}</div><p className="text-sm text-muted-foreground">Satisfação</p></CardContent></Card>
        </div>

        <Tabs defaultValue="config">
          <TabsList><TabsTrigger value="config">Configurações</TabsTrigger><TabsTrigger value="capabilities">Capacidades</TabsTrigger></TabsList>
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Configurações de Voz</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Mensagem de Saudação</Label><Input defaultValue={settings?.greeting_message || ''} onBlur={(e) => updateSettings.mutate({ greeting_message: e.target.value })} /></div>
                <div><Label>Tempo Máximo de Espera (segundos)</Label><Input type="number" defaultValue={settings?.max_wait_seconds || 30} onBlur={(e) => updateSettings.mutate({ max_wait_seconds: parseInt(e.target.value) })} /></div>
                <div className="flex items-center justify-between"><Label>Apenas em Horário Comercial</Label><Switch checked={settings?.business_hours_only || false} onCheckedChange={(v) => updateSettings.mutate({ business_hours_only: v })} /></div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="capabilities" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>O que a IA pode fazer</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><Label>Fazer Reservas</Label><Switch checked={settings?.can_take_reservations || false} onCheckedChange={(v) => updateSettings.mutate({ can_take_reservations: v })} /></div>
                <div className="flex items-center justify-between"><Label>Anotar Pedidos</Label><Switch checked={settings?.can_take_orders || false} onCheckedChange={(v) => updateSettings.mutate({ can_take_orders: v })} /></div>
                <div className="flex items-center justify-between"><Label>Responder sobre Cardápio</Label><Switch checked={settings?.can_answer_menu_questions || false} onCheckedChange={(v) => updateSettings.mutate({ can_answer_menu_questions: v })} /></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
