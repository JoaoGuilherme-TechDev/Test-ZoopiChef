import { useState, useEffect } from 'react';
import { useCompany, useUpdateCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save, FileText, Phone, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase-shim';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function SettingsFooter() {
  const { data: company, isLoading: companyLoading } = useCompany();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  
  const [footerText, setFooterText] = useState('');
  const [supportPhone, setSupportPhone] = useState('');

  // Fetch current footer settings
  const { data: footerSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['company-footer-settings-edit', company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('footer_text, support_phone')
        .eq('id', company.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching footer settings:', error);
        return null;
      }
      
      return data as { footer_text: string | null; support_phone: string | null } | null;
    },
  });

  // Initialize form when data loads
  useEffect(() => {
    if (footerSettings) {
      setFooterText(footerSettings.footer_text || '');
      setSupportPhone(footerSettings.support_phone || '');
    }
  }, [footerSettings]);

  const handleSave = async () => {
    if (!company?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          footer_text: footerText.trim() || null,
          support_phone: supportPhone.trim() || null,
        })
        .eq('id', company.id);

      if (error) throw error;

      toast.success('Configurações de rodapé salvas!');
      queryClient.invalidateQueries({ queryKey: ['company-footer-settings'] });
      queryClient.invalidateQueries({ queryKey: ['company-footer-settings-edit'] });
    } catch (error) {
      console.error('Error saving footer settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (companyLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
          <FileText className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Rodapé do Sistema</h1>
          <p className="text-muted-foreground">
            Configure o texto e telefone de suporte exibido no rodapé
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Configurações do Rodapé
          </CardTitle>
          <CardDescription>
            Personalize as informações exibidas no rodapé de todos os aplicativos (Web, Delivery, Totem, Tablet, PDV, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="footerText">Texto do Rodapé</Label>
            <Textarea
              id="footerText"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Zoopi Tecnologia"
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Se vazio, será exibido "Zoopi Tecnologia – www.zoopi.app.br"
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportPhone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Telefone de Suporte
            </Label>
            <Input
              id="supportPhone"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
            <p className="text-xs text-muted-foreground">
              Será exibido como link para WhatsApp no rodapé
            </p>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Pré-visualização</h4>
            <div className="border rounded-lg p-4 bg-card/50">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="font-semibold text-foreground">
                  {footerText.trim() || 'Zoopi Tecnologia'}
                </span>
                
                {!footerText.trim() && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-primary">
                      www.zoopi.app.br
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  </>
                )}
                
                {supportPhone.trim() && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-primary">
                      <Phone className="h-3 w-3" />
                      {supportPhone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}