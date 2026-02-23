import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  Users, 
  Package,
  Sparkles,
  RefreshCw,
  Check,
  X,
  Send,
  Instagram,
  MessageSquare,
  ChevronRight,
  Zap,
  Target
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ProactiveAlert, SuggestedCampaign } from '@/hooks/useProactiveAgent';
import { cn } from '@/lib/utils';

interface ProactiveAlertModalProps {
  alert: ProactiveAlert | null;
  open: boolean;
  onClose: () => void;
  onAccept: (alertId: string, campaignIndex: number) => void;
  onDismiss: (alertId: string, reason?: string) => void;
  onRegenerate: (alertId: string) => void;
  isAccepting: boolean;
  isRegenerating: boolean;
}

const triggerIcons = {
  low_revenue: TrendingDown,
  peak_no_movement: Clock,
  inactive_customers: Users,
  stale_inventory: Package,
};

const triggerLabels = {
  low_revenue: 'Faturamento Baixo',
  peak_no_movement: 'Horário de Pico Parado',
  inactive_customers: 'Clientes Inativos',
  stale_inventory: 'Estoque Parado',
};

const severityColors = {
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  critical: 'bg-red-500/10 text-red-600 border-red-500/30',
};

const severityBgGradient = {
  info: 'from-blue-500/5 via-transparent',
  warning: 'from-amber-500/10 via-transparent',
  critical: 'from-red-500/10 via-transparent',
};

export function ProactiveAlertModal({
  alert,
  open,
  onClose,
  onAccept,
  onDismiss,
  onRegenerate,
  isAccepting,
  isRegenerating,
}: ProactiveAlertModalProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  
  if (!alert) return null;

  const TriggerIcon = triggerIcons[alert.trigger_type];
  const triggerLabel = triggerLabels[alert.trigger_type];

  const handleAccept = () => {
    if (selectedCampaign !== null) {
      onAccept(alert.id, selectedCampaign);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0">
        {/* Header com gradiente baseado na severidade */}
        <div className={cn(
          "relative p-6 bg-gradient-to-b",
          severityBgGradient[alert.severity]
        )}>
          {/* Efeito de brilho animado */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 right-4"
          >
            <div className="relative">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
              />
            </div>
          </motion.div>

          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15 }}
                className={cn(
                  "p-3 rounded-2xl border-2",
                  severityColors[alert.severity]
                )}
              >
                <TriggerIcon className="w-6 h-6" />
              </motion.div>
              
              <div className="flex-1">
                <Badge variant="outline" className={cn("mb-1", severityColors[alert.severity])}>
                  {triggerLabel}
                </Badge>
                <DialogTitle className="text-xl font-bold">
                  {alert.title}
                </DialogTitle>
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base text-muted-foreground leading-relaxed"
            >
              {alert.message}
            </motion.p>
          </DialogHeader>

          {/* Métricas de análise */}
          {alert.analysis_data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 grid grid-cols-3 gap-3"
            >
              {alert.analysis_data.current_value !== undefined && (
                <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3 border">
                  <p className="text-xs text-muted-foreground">Atual</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(alert.analysis_data.current_value)}
                  </p>
                </div>
              )}
              {alert.analysis_data.expected_value !== undefined && (
                <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3 border">
                  <p className="text-xs text-muted-foreground">Esperado</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(alert.analysis_data.expected_value)}
                  </p>
                </div>
              )}
              {alert.analysis_data.variation_percent !== undefined && (
                <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3 border">
                  <p className="text-xs text-muted-foreground">Variação</p>
                  <p className={cn(
                    "text-lg font-bold",
                    alert.analysis_data.variation_percent >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatPercent(alert.analysis_data.variation_percent)}
                  </p>
                </div>
              )}
              {alert.analysis_data.affected_count !== undefined && (
                <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3 border col-span-3">
                  <p className="text-xs text-muted-foreground">Clientes/Itens Afetados</p>
                  <p className="text-lg font-bold">{alert.analysis_data.affected_count}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <Separator />

        {/* Campanhas sugeridas */}
        <div className="p-6 overflow-y-auto max-h-[45vh]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Campanhas Sugeridas</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerate(alert.id)}
              disabled={isRegenerating}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRegenerating && "animate-spin")} />
              Gerar outras
            </Button>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {alert.suggested_campaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <CampaignCard
                    campaign={campaign}
                    isSelected={selectedCampaign === index}
                    onSelect={() => setSelectedCampaign(index)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <Separator />

        {/* Footer com ações */}
        <div className="p-4 bg-muted/30 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => onDismiss(alert.id)}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Ignorar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Decidir depois
            </Button>
            <Button
              onClick={handleAccept}
              disabled={selectedCampaign === null || isAccepting}
              className="min-w-[160px]"
            >
              {isAccepting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Executar Campanha
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente de card de campanha
function CampaignCard({
  campaign,
  isSelected,
  onSelect,
}: {
  campaign: SuggestedCampaign;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary border-primary bg-primary/5"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {campaign.title}
              {campaign.discount_percent && (
                <Badge variant="secondary" className="text-xs">
                  {campaign.discount_percent}% OFF
                </Badge>
              )}
            </CardTitle>
            {campaign.product_name && (
              <CardDescription className="text-xs mt-1">
                Produto: {campaign.product_name}
              </CardDescription>
            )}
          </div>
          
          <div className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
            isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
          )}>
            {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {campaign.message}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Target className="w-3.5 h-3.5" />
            <span>{campaign.target_count} clientes</span>
          </div>
          
          <div className="flex items-center gap-2">
            {(campaign.channel === 'whatsapp' || campaign.channel === 'both') && (
              <div className="flex items-center gap-1 text-green-600">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </div>
            )}
            {(campaign.channel === 'instagram' || campaign.channel === 'both') && (
              <div className="flex items-center gap-1 text-pink-600">
                <Instagram className="w-3.5 h-3.5" />
                <span>Instagram</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
