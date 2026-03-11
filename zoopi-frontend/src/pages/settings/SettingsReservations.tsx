import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Receipt, Clock, UtensilsCrossed, Settings2, CalendarOff, LayoutPanelLeft, ShieldCheck, CreditCard, Save, Bath, ChefHat, DoorOpen, Grid3X3, Mic2, MousePointer2, Move, Music, PenTool, Trees, Type, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

export default function SettingsReservationsPage() {
  const [reserveTab, setReserveTab] = useState<string>("geral");
  const [moduleActive, setModuleActive] = useState(true);
  
  // State for various settings
  const [requireCPF, setRequireCPF] = useState(false);
  const [requireEmail, setRequireEmail] = useState(false);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [clientConfirm, setClientConfirm] = useState(false);
  const [sendConfirmation, setSendConfirmation] = useState(false);
  const [sendReminder, setSendReminder] = useState(false);
  const [allDayBlock, setAllDayBlock] = useState(true);
  const [requirePhoneVerification, setRequirePhoneVerification] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<string>("");
  const [requirePrepayment, setRequirePrepayment] = useState(false);

  const cardStyle = "glass-card border-[hsla(270,100%,65%,0.22)] shadow-[0_0_4px_hsla(270,100%,65%,0.5),0_0_16px_hsla(270,100%,65%,0.2)]";

  return (
    <DashboardLayout title="Configurações - Reservas">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Module Toggle Header */}
        <Card className={cardStyle}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-primary" />
                  Módulo de Reservas
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gerencie capacidade, regras de antecipação e confirmações automáticas.
                </p>
              </div>
              <Switch
                checked={moduleActive}
                onCheckedChange={setModuleActive}
              />
            </div>
          </CardHeader>
        </Card>

        {moduleActive && (
          <Tabs value={reserveTab} onValueChange={setReserveTab} className="space-y-6">
            <div className="overflow-x-auto pb-2 no-scrollbar">
              <TabsList className="h-auto p-1 bg-background/50 border border-primary/20 rounded-full inline-flex w-max sm:w-auto">
                <TabsTrigger value="geral" className="rounded-full px-4 py-2 text-xs uppercase tracking-wider gap-2">
                  <Settings2 className="h-3.5 w-3.5" /> Geral
                </TabsTrigger>
                <TabsTrigger value="horarios" className="rounded-full px-4 py-2 text-xs uppercase tracking-wider gap-2">
                  <Clock className="h-3.5 w-3.5" /> Horários
                </TabsTrigger>
                <TabsTrigger value="notificacoes" className="rounded-full px-4 py-2 text-xs uppercase tracking-wider gap-2">
                  <Receipt className="h-3.5 w-3.5" /> Notificações
                </TabsTrigger>
                <TabsTrigger value="bloqueios" className="rounded-full px-4 py-2 text-xs uppercase tracking-wider gap-2">
                  <CalendarOff className="h-3.5 w-3.5" /> Bloqueios
                </TabsTrigger>
                <TabsTrigger value="layoutSalao" className="rounded-full px-4 py-2 text-xs uppercase tracking-wider gap-2">
                  <LayoutPanelLeft className="h-3.5 w-3.5" /> Layout
                </TabsTrigger>
                <TabsTrigger value="verificacao" className="rounded-full px-4 py-2 text-xs uppercase tracking-wider gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verificação
                </TabsTrigger>
                <TabsTrigger value="pagamento" className="rounded-full px-4 py-2 text-xs uppercase tracking-wider gap-2">
                  <CreditCard className="h-3.5 w-3.5" /> Pagamento
                </TabsTrigger>
              </TabsList>
            </div>

            <Card className={`${cardStyle} min-h-[400px]`}>
              <CardContent className="p-6">
                {/* GERAL */}
                <TabsContent value="geral" className="mt-0 space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold">Configurações Gerais</h3>
                    <p className="text-sm text-muted-foreground">Regras básicas e limites de ocupação.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="minAnticipation">Antecedência Mínima (horas)</Label>
                      <Input id="minAnticipation" type="number" placeholder="2" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxAnticipation">Antecedência Máxima (dias)</Label>
                      <Input id="maxAnticipation" type="number" placeholder="30" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="defaultDuration">Duração Padrão (minutos)</Label>
                      <Input id="defaultDuration" type="number" placeholder="90" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minPeople">Mínimo de Pessoas</Label>
                      <Input id="minPeople" type="number" placeholder="1" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxPeople">Máximo de Pessoas</Label>
                      <Input id="maxPeople" type="number" placeholder="10" />
                    </div>
                  </div>

                  <Separator className="bg-primary/10" />

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Confirmação Automática</Label>
                        <p className="text-sm text-muted-foreground">Aprovar reservas instantaneamente.</p>
                      </div>
                      <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
                    </div>

                    {!autoConfirm && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-base">Exigir Confirmação do Cliente</Label>
                            <p className="text-sm text-muted-foreground">O cliente deve confirmar via link antes da data.</p>
                          </div>
                          <Switch checked={clientConfirm} onCheckedChange={setClientConfirm} />
                        </div>
                        
                        {clientConfirm && (
                          <div className="max-w-xs space-y-2 animate-in zoom-in-95">
                            <Label>Prazo para Confirmação (horas antes)</Label>
                            <Input type="number" placeholder="24" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* HORARIOS */}
                <TabsContent value="horarios" className="mt-0 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold">Horário de Funcionamento</h3>
                    <p className="text-sm text-muted-foreground">Defina a janela de tempo permitida para reservas.</p>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    <div className="w-full sm:w-40 space-y-2">
                      <Label>Abertura</Label>
                      <Input type="time" />
                    </div>
                    <div className="w-full sm:w-40 space-y-2">
                      <Label>Fechamento</Label>
                      <Input type="time" />
                    </div>
                  </div>
                  <p className="text-sm bg-primary/5 p-4 rounded-lg border border-primary/10 text-muted-foreground">
                    Nota: Os horários disponíveis serão gerados automaticamente em intervalos de 30 minutos.
                  </p>
                </TabsContent>

                {/* NOTIFICACOES */}
                <TabsContent value="notificacoes" className="mt-0 space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold">WhatsApp & Notificações</h3>
                    <p className="text-sm text-muted-foreground">Configure a comunicação automática com seus clientes.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Mensagem de Confirmação</Label>
                        <p className="text-sm text-muted-foreground">Enviada assim que a reserva é aprovada.</p>
                      </div>
                      <Switch checked={sendConfirmation} onCheckedChange={setSendConfirmation} />
                    </div>

                    {sendConfirmation && (
                      <div className="space-y-2 animate-in fade-in">
                        <Textarea placeholder="Olá {name}, sua reserva para o dia {date} às {time} foi confirmada!" className="min-h-[100px]" />
                        <p className="text-[11px] text-primary/60 font-medium">Variáveis disponíveis: &#123;name&#125;, &#123;date&#125;, &#123;time&#125;, &#123;party_size&#125;</p>
                      </div>
                    )}

                    <Separator className="bg-primary/10" />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Mensagem de Lembrete</Label>
                        <p className="text-sm text-muted-foreground">Enviar lembrete automático antes do evento.</p>
                      </div>
                      <Switch checked={sendReminder} onCheckedChange={setSendReminder} />
                    </div>

                    {sendReminder && (
                      <div className="space-y-4 animate-in fade-in">
                        <div className="max-w-[200px] space-y-2">
                          <Label>Horas de Antecedência</Label>
                          <Input type="number" placeholder="2" />
                        </div>
                        <Textarea placeholder="Oi {name}, estamos te esperando em breve!" className="min-h-[100px]" />
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* BLOQUEIOS */}
                <TabsContent value="bloqueios" className="mt-0 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold">Bloqueios de Agenda</h3>
                    <p className="text-sm text-muted-foreground">Impeça reservas em datas ou horários específicos.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Data</Label>
                        <Input type="date" />
                      </div>
                      <div className="flex items-center gap-2 h-10">
                        <Switch checked={allDayBlock} onCheckedChange={setAllDayBlock} id="all-day" />
                        <Label htmlFor="all-day">Dia todo</Label>
                      </div>
                      {!allDayBlock && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase">Início</Label>
                            <Input type="time" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase">Fim</Label>
                            <Input type="time" />
                          </div>
                        </div>
                      )}
                      <div className="md:col-span-1">
                        <Button className="w-full">Adicionar Bloqueio</Button>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-8 text-center text-muted-foreground bg-black/20">
                    Nenhum bloqueio ativo para os próximos 30 dias.
                  </div>
                </TabsContent>
                <TabsContent value="layoutSalao" className="mt-0 outline-none">
                      <div className="flex flex-col gap-4">
                        
                        {/* --- EDITOR TOOLBAR --- */}
                        <Card className="glass-card border-primary/20 bg-black/40 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            
                            {/* Zoom & Grid Controls */}
                            <div className="flex items-center gap-1 bg-background/50 p-1 rounded-md border border-white/10">
                              <Button variant="ghost" size="icon" className="h-8 w-8"><ZoomOut className="h-4 w-4" /></Button>
                              <span className="text-xs font-mono px-2">100%</span>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><ZoomIn className="h-4 w-4" /></Button>
                              <Separator orientation="vertical" className="h-4 mx-1" />
                              <Button variant="secondary" size="icon" className="h-8 w-8 bg-primary/20 text-primary"><Grid3X3 className="h-4 w-4" /></Button>
                            </div>

                            {/* Add Elements Section */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Adicionar:</span>
                              <Button variant="outline" size="sm" className="h-8 gap-2 border-amber-600/50 hover:bg-amber-600/20">
                                <DoorOpen className="h-3.5 w-3.5 text-amber-500" /> Porta
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 gap-2 border-blue-400/50 hover:bg-blue-400/20">
                                <Bath className="h-3.5 w-3.5 text-blue-400" /> Banheiro
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 gap-2 border-orange-500/50 hover:bg-orange-500/20">
                                <ChefHat className="h-3.5 w-3.5 text-orange-500" /> Cozinha
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 gap-2 border-purple-500/50 hover:bg-purple-500/20">
                                <Mic2 className="h-3.5 w-3.5 text-purple-500" /> Bar
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 gap-2 border-rose-500/50 hover:bg-rose-500/20">
                                <Music className="h-3.5 w-3.5 text-rose-500" /> Palco/Banda
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 gap-2 border-emerald-500/50 hover:bg-emerald-500/20">
                                <Trees className="h-3.5 w-3.5 text-emerald-500" /> Playground
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 gap-2 border-gray-500/50 hover:bg-gray-500/20">
                                <Type className="h-3.5 w-3.5 text-gray-400" /> Texto
                              </Button>
                            </div>

                            {/* Tool Selector */}
                            <div className="flex items-center gap-2 ml-auto">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">Ferramenta:</span>
                              <div className="flex bg-background/50 p-1 rounded-md border border-white/10">
                                <Button size="sm" className="h-7 px-3 gap-2 rounded-sm bg-primary text-xs">
                                  <MousePointer2 className="h-3 w-3" /> Selecionar
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-3 gap-2 rounded-sm text-xs hover:bg-primary/10">
                                  <PenTool className="h-3 w-3" /> Desenhar Área
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-3">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Texto do rótulo:</Label>
                            <Input placeholder="Digite o texto..." className="max-w-[200px] h-8 bg-black/20 text-xs" />
                          </div>
                        </Card>

                        {/* --- MAIN EDITOR AREA --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
                          
                          {/* THE CANVAS */}
                          <div className="lg:col-span-3 relative bg-[#1a1b26] rounded-xl border border-primary/20 overflow-hidden shadow-inner flex flex-col">
                            {/* Drawing Grid Background */}
                            <div 
                              className="absolute inset-0 opacity-10" 
                                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                            />
                            
                            {/* Mock Elements (Visual representation) */}
                            <div className="relative flex-1 p-10">
                              <div className="w-full h-full border border-dashed border-white/20 rounded-lg flex items-center justify-center relative">
                                
                                {/* Example Table Element */}
                                <div className="absolute top-20 left-40 w-12 h-12 bg-blue-600 rounded-full flex flex-col items-center justify-center shadow-lg cursor-move">
                                  <span className="text-[10px] font-bold">2</span>
                                  <div className="flex items-center gap-0.5 opacity-70"><span className="text-[8px]">👤4</span></div>
                                </div>

                                {/* Example Kitchen Element */}
                                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-32 h-20 bg-orange-500/80 rounded-md border-2 border-orange-400 flex items-center justify-center">
                                  <ChefHat className="h-8 w-8 text-white/80" />
                                </div>

                                {/* Example Bar Element */}
                                <div className="absolute top-10 right-20 w-10 h-32 bg-purple-500/80 rounded-md border-2 border-purple-400 flex items-center justify-center">
                                  <Mic2 className="h-6 w-6 text-white/80 rotate-90" />
                                </div>

                                {/* Stage Element */}
                                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-10 h-32 bg-rose-500/80 rounded-r-md border-y-2 border-r-2 border-rose-400 flex items-center justify-center">
                                  <Music className="h-6 w-6 text-white/80" />
                                </div>
                              </div>
                            </div>

                            {/* Bottom Hint */}
                            <div className="p-2 text-center bg-black/40 border-t border-primary/10">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                                Use "Desenhar Área" para criar paredes arrastando o mouse. Selecione mesas/elementos para mover e redimensionar pelos cantos.
                              </p>
                            </div>
                          </div>

                          {/* PROPERTIES SIDEBAR */}
                          <Card className="glass-card border-primary/20 flex flex-col">
                            <CardHeader className="p-4 border-b border-primary/10">
                              <CardTitle className="text-sm font-bold uppercase tracking-wider">Propriedades</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 flex-1 flex flex-col items-center justify-center text-center">
                              <Move className="h-10 w-10 text-muted-foreground/20 mb-3" />
                              <p className="text-xs text-muted-foreground">Selecione uma mesa ou elemento para editar suas propriedades</p>
                              
                              <div className="w-full mt-auto pt-4 border-t border-primary/10">
                                <h4 className="text-[10px] font-bold uppercase text-left text-muted-foreground mb-4">Mesas não posicionadas</h4>
                                <p className="text-[11px] text-muted-foreground italic">Todas as mesas estão posicionadas</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                </TabsContent>

                {/* VERIFICACAO */}
                <TabsContent value="verificacao" className="mt-0 space-y-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-lg">Validar WhatsApp (OTP)</Label>
                        <p className="text-sm text-muted-foreground">Exigir código via SMS/WhatsApp para validar o número do cliente.</p>
                      </div>
                      <Switch checked={requirePhoneVerification} onCheckedChange={setRequirePhoneVerification} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-lg">Exigir CPF</Label>
                        <p className="text-sm text-muted-foreground">Obrigatório para emissão de pré-pagamentos.</p>
                      </div>
                      <Switch checked={requireCPF} onCheckedChange={setRequireCPF} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-lg">Exigir E-mail</Label>
                        <p className="text-sm text-muted-foreground">Enviar voucher de confirmação por e-mail.</p>
                      </div>
                      <Switch checked={requireEmail} onCheckedChange={setRequireEmail} />
                    </div>
                  </div>
                </TabsContent>

                {/* PAGAMENTO */}
                <TabsContent value="pagamento" className="mt-0 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-lg font-semibold">Pagamento Antecipado</h3>
                      <p className="text-sm text-muted-foreground">Cobrar taxa de reserva para evitar No-Shows.</p>
                    </div>
                    <Switch checked={requirePrepayment} onCheckedChange={setRequirePrepayment} />
                  </div>

                  {requirePrepayment && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 animate-in slide-in-from-left-2">
                      <div className="space-y-2">
                        <Label>Valor por Reserva (R$)</Label>
                        <Input type="number" placeholder="50.00" />
                      </div>
                      <div className="space-y-2">
                        <Label>Provedor de Pagamento</Label>
                        <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o gateway" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stripe">Stripe</SelectItem>
                            <SelectItem value="mercado-pago">Mercado Pago</SelectItem>
                            <SelectItem value="pix">PIX Direto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button size="lg" className="px-8 shadow-lg shadow-primary/20 gap-2">
                <Save className="h-4 w-4" />
                Salvar Alterações
              </Button>
            </div>
          </Tabs>
        )}

        {!moduleActive && (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5">
            <Settings2 className="h-12 w-12 text-primary/40 mb-4" />
            <h3 className="text-xl font-medium text-muted-foreground">O módulo de reservas está desativado</h3>
            <p className="text-sm text-muted-foreground mt-2">Ative o módulo no topo para configurar sua agenda.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}