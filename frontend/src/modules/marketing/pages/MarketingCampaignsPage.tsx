import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  MessageSquare,
  Mail,
  Play,
  Pause,
  MoreVertical,
  Users,
  Calendar,
} from 'lucide-react';
import { useMarketingCampaigns } from '../hooks';
import type { MarketingCampaign } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MarketingCampaignsPage() {
  const {
    campaigns,
    activeCampaigns,
    draftCampaigns,
    completedCampaigns,
    isLoading,
    createCampaign,
    updateCampaignStatus,
  } = useMarketingCampaigns();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'whatsapp' as MarketingCampaign['type'],
    audience_rule: 'all',
    message_template: '',
  });

  const handleCreateCampaign = () => {
    createCampaign.mutate(newCampaign, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setNewCampaign({
          name: '',
          type: 'whatsapp',
          audience_rule: 'all',
          message_template: '',
        });
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'paused':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running':
        return 'Ativa';
      case 'completed':
        return 'Concluída';
      case 'paused':
        return 'Pausada';
      case 'scheduled':
        return 'Agendada';
      default:
        return 'Rascunho';
    }
  };

  const renderCampaignCard = (campaign: MarketingCampaign) => (
    <Card key={campaign.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {campaign.type === 'whatsapp' ? (
              <div className="p-2 rounded-lg bg-green-500/10">
                <MessageSquare className="w-5 h-5 text-green-500" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
            )}
            <div>
              <h3 className="font-medium">{campaign.name}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {campaign.audience_count} destinatários
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(campaign.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(campaign.status)}>
              {getStatusLabel(campaign.status)}
            </Badge>
            {campaign.status === 'running' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateCampaignStatus.mutate({ id: campaign.id, status: 'paused' })}
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
            {(campaign.status === 'draft' || campaign.status === 'paused') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateCampaignStatus.mutate({ id: campaign.id, status: 'running' })}
              >
                <Play className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {campaign.message_template && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
            {campaign.message_template.slice(0, 100)}
            {campaign.message_template.length > 100 && '...'}
          </div>
        )}

        {campaign.sent_count !== undefined && (
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
            <div>
              <p className="font-medium">{campaign.sent_count}</p>
              <p className="text-xs text-muted-foreground">Enviados</p>
            </div>
            <div>
              <p className="font-medium">{campaign.delivered_count || 0}</p>
              <p className="text-xs text-muted-foreground">Entregues</p>
            </div>
            <div>
              <p className="font-medium">{campaign.opened_count || 0}</p>
              <p className="text-xs text-muted-foreground">Abertos</p>
            </div>
            <div>
              <p className="font-medium">{campaign.clicked_count || 0}</p>
              <p className="text-xs text-muted-foreground">Cliques</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Campanhas</h1>
            <p className="text-muted-foreground">Gerencie suas campanhas de marketing</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Campanha</DialogTitle>
                <DialogDescription>
                  Configure os detalhes da sua campanha de marketing
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Campanha</Label>
                  <Input
                    placeholder="Ex: Promoção de Verão"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select
                    value={newCampaign.type}
                    onValueChange={(value) =>
                      setNewCampaign({ ...newCampaign, type: value as MarketingCampaign['type'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="push">Push Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Audiência</Label>
                  <Select
                    value={newCampaign.audience_rule}
                    onValueChange={(value) =>
                      setNewCampaign({ ...newCampaign, audience_rule: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      <SelectItem value="active">Clientes ativos</SelectItem>
                      <SelectItem value="inactive">Clientes inativos</SelectItem>
                      <SelectItem value="vip">Clientes VIP</SelectItem>
                      <SelectItem value="new">Novos clientes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    placeholder="Digite a mensagem da campanha..."
                    rows={4}
                    value={newCampaign.message_template}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, message_template: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{{nome}}'} para personalizar com o nome do cliente
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateCampaign} disabled={createCampaign.isPending}>
                  {createCampaign.isPending ? 'Criando...' : 'Criar Campanha'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">
              Todas ({campaigns.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Ativas ({activeCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="draft">
              Rascunhos ({draftCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Concluídas ({completedCampaigns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {campaigns.map(renderCampaignCard)}
            {campaigns.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma campanha criada</p>
                  <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                    Criar primeira campanha
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4 mt-4">
            {activeCampaigns.map(renderCampaignCard)}
            {activeCampaigns.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhuma campanha ativa
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="draft" className="space-y-4 mt-4">
            {draftCampaigns.map(renderCampaignCard)}
            {draftCampaigns.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhum rascunho
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedCampaigns.map(renderCampaignCard)}
            {completedCampaigns.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhuma campanha concluída
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
