import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check, X, AlertTriangle, ChefHat } from 'lucide-react';
import { AIModuleHeader, AI_MODULE_DESCRIPTIONS } from "@/components/ai/AIModuleHeader";
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MenuSuggestion {
  id: string;
  suggestion_type: string;
  product_id: string | null;
  title: string;
  current_value: string | null;
  suggested_value: string;
  reason: string;
  risk_if_ignored: string | null;
  confidence: string | null;
  priority: number | null;
  status: string | null;
  created_at: string;
}

export default function AIMenuCreative() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['menu-creative-suggestions', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_creative_suggestions')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as MenuSuggestion[];
    },
    enabled: !!profile?.company_id,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-menu-creative', {
        body: { company_id: profile!.company_id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(`${data.result?.suggestions?.length || 0} sugestões geradas!`);
        queryClient.invalidateQueries({ queryKey: ['menu-creative-suggestions'] });
      } else {
        toast.error(data.errors?.[0] || 'Erro ao gerar sugestões');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('menu_creative_suggestions')
        .update({ status, applied_at: status === 'applied' ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-creative-suggestions'] });
      toast.success('Status atualizado');
    },
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rename: 'Renomear', description: 'Descrição', combo: 'Combo',
      promo: 'Promoção', highlight: 'Destaque', remove: 'Remover'
    };
    return labels[type] || type;
  };

  const getConfidenceBadge = (confidence: string | null) => {
    if (!confidence) return null;
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      high: 'default', medium: 'secondary', low: 'destructive'
    };
    return <Badge variant={variants[confidence] || 'secondary'}>{confidence}</Badge>;
  };

  const pendingSuggestions = suggestions?.filter(s => s.status === 'new' || !s.status) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header com descrição clara */}
        <AIModuleHeader
          title={AI_MODULE_DESCRIPTIONS.menuCreative.title}
          icon={ChefHat}
          description={AI_MODULE_DESCRIPTIONS.menuCreative.description}
          purpose={AI_MODULE_DESCRIPTIONS.menuCreative.purpose}
          whenToUse={AI_MODULE_DESCRIPTIONS.menuCreative.whenToUse}
          doesNot={AI_MODULE_DESCRIPTIONS.menuCreative.doesNot}
        />

        {/* Actions */}
        <div className="flex justify-end">
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar Sugestões
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : pendingSuggestions.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma sugestão pendente. Clique em "Gerar Sugestões" para começar.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {pendingSuggestions.map((suggestion) => (
              <Card key={suggestion.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="mb-2">{getTypeLabel(suggestion.suggestion_type)}</Badge>
                      <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                    </div>
                    {getConfidenceBadge(suggestion.confidence)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {suggestion.current_value && (
                    <div><span className="text-sm text-muted-foreground">Atual:</span> <span className="line-through">{suggestion.current_value}</span></div>
                  )}
                  <div><span className="text-sm text-muted-foreground">Sugerido:</span> <span className="font-medium">{suggestion.suggested_value}</span></div>
                  <div className="text-sm text-muted-foreground">{suggestion.reason}</div>
                  {suggestion.risk_if_ignored && (
                    <div className="flex items-start gap-2 text-sm text-amber-600">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <span>{suggestion.risk_if_ignored}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: 'applied' })}>
                      <Check className="h-4 w-4 mr-1" /> Aplicar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: 'dismissed' })}>
                      <X className="h-4 w-4 mr-1" /> Ignorar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
