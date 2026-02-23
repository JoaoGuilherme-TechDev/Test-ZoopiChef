import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useCRMPipelineStages } from '@/hooks/useCRMAdvanced';
import { useCRMLeads } from '../hooks';
import { CRMLead } from '../types';
import { ArrowLeft, Phone, DollarSign, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CRMPipelinePage() {
  const { data: stages, isLoading: stagesLoading } = useCRMPipelineStages();
  const { leads, isLoading: leadsLoading } = useCRMLeads();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (stagesLoading || leadsLoading) {
    return (
      <DashboardLayout title="CRM - Pipeline">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Group leads by pipeline stage
  const leadsByStage = stages?.reduce((acc, stage) => {
    acc[stage.id] = leads.filter(l => l.pipeline_stage_id === stage.id);
    return acc;
  }, {} as Record<string, CRMLead[]>) || {};

  // Leads without stage
  const unassignedLeads = leads.filter(l => !l.pipeline_stage_id);

  return (
    <DashboardLayout title="CRM - Pipeline">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/crm">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
              <p className="text-muted-foreground">Visualize e gerencie o funil de vendas</p>
            </div>
          </div>
        </div>

        {/* Pipeline Kanban */}
        <ScrollArea className="w-full pb-4">
          <div className="flex gap-4 min-w-max">
            {/* Unassigned Column */}
            {unassignedLeads.length > 0 && (
              <div className="w-72 shrink-0">
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Sem Etapa</CardTitle>
                      <Badge variant="outline">{unassignedLeads.length}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(unassignedLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0))}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {unassignedLeads.slice(0, 5).map((lead) => (
                      <LeadCard key={lead.id} lead={lead} />
                    ))}
                    {unassignedLeads.length > 5 && (
                      <div className="text-center text-sm text-muted-foreground py-2">
                        +{unassignedLeads.length - 5} mais
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Pipeline Stages */}
            {stages?.map((stage) => {
              const stageLeads = leadsByStage[stage.id] || [];
              const totalValue = stageLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

              return (
                <div key={stage.id} className="w-72 shrink-0">
                  <Card className={`${stage.is_won ? 'border-green-500/50 bg-green-500/5' : stage.is_lost ? 'border-red-500/50 bg-red-500/5' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                          <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
                        </div>
                        <Badge variant="outline">{stageLeads.length}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(totalValue)}</div>
                    </CardHeader>
                    <CardContent className="space-y-2 min-h-[200px]">
                      {stageLeads.length > 0 ? (
                        stageLeads.slice(0, 10).map((lead) => (
                          <LeadCard key={lead.id} lead={lead} />
                        ))
                      ) : (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          Nenhum lead nesta etapa
                        </div>
                      )}
                      {stageLeads.length > 10 && (
                        <div className="text-center text-sm text-muted-foreground py-2">
                          +{stageLeads.length - 10} mais
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{leads.length}</div>
              <p className="text-sm text-muted-foreground">Total de Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-400">
                {leads.filter(l => l.pipeline_stage_id && stages?.find(s => s.id === l.pipeline_stage_id)?.is_won).length}
              </div>
              <p className="text-sm text-muted-foreground">Ganhos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-400">
                {leads.filter(l => l.pipeline_stage_id && stages?.find(s => s.id === l.pipeline_stage_id)?.is_lost).length}
              </div>
              <p className="text-sm text-muted-foreground">Perdidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {formatCurrency(leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0))}
              </div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function LeadCard({ lead }: { lead: CRMLead }) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Card className="bg-background cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{lead.name}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {lead.phone}
                </span>
              )}
            </div>
            {lead.estimated_value && (
              <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                <DollarSign className="w-3 h-3" />
                {formatCurrency(lead.estimated_value)}
              </div>
            )}
            {lead.score && lead.score > 0 && (
              <Badge variant="outline" className="mt-2 text-xs">
                Score: {lead.score}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
