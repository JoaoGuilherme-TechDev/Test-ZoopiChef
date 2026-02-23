import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Hash, Save, FileInput, Package, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const numerationSchema = z.object({
  nfe_series: z.coerce.number().min(1, 'Série deve ser maior que 0'),
  nfce_series: z.coerce.number().min(1, 'Série deve ser maior que 0'),
  nfse_series: z.coerce.number().min(1, 'Série deve ser maior que 0'),
  next_nfe_number: z.coerce.number().min(1, 'Número deve ser maior que 0'),
  next_nfce_number: z.coerce.number().min(1, 'Número deve ser maior que 0'),
  next_nfse_number: z.coerce.number().min(1, 'Número deve ser maior que 0'),
  auto_update_cost: z.boolean(),
  auto_generate_stock: z.boolean(),
  auto_generate_payable: z.boolean(),
});

type NumerationFormData = z.infer<typeof numerationSchema>;

export function FiscalNumerationConfig() {
  const { data: company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch fiscal config
  const { data: fiscalConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['fiscal-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('fiscal_config')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const form = useForm<NumerationFormData>({
    resolver: zodResolver(numerationSchema),
    defaultValues: {
      nfe_series: 1,
      nfce_series: 1,
      nfse_series: 1,
      next_nfe_number: 1,
      next_nfce_number: 1,
      next_nfse_number: 1,
      auto_update_cost: true,
      auto_generate_stock: true,
      auto_generate_payable: true,
    },
  });

  // Update form when config loads
  useEffect(() => {
    if (fiscalConfig) {
      form.reset({
        nfe_series: fiscalConfig.nfe_series || 1,
        nfce_series: fiscalConfig.nfce_series || 1,
        nfse_series: fiscalConfig.nfse_series || 1,
        next_nfe_number: fiscalConfig.next_nfe_number || 1,
        next_nfce_number: fiscalConfig.next_nfce_number || 1,
        next_nfse_number: fiscalConfig.next_nfse_number || 1,
        auto_update_cost: fiscalConfig.auto_update_cost ?? true,
        auto_generate_stock: fiscalConfig.auto_generate_stock ?? true,
        auto_generate_payable: fiscalConfig.auto_generate_payable ?? true,
      });
    }
  }, [fiscalConfig, form]);

  const onSubmit = async (data: NumerationFormData) => {
    if (!company?.id) return;

    setIsLoading(true);
    try {
      const updateData = {
        nfe_series: data.nfe_series,
        nfce_series: data.nfce_series,
        nfse_series: data.nfse_series,
        next_nfe_number: data.next_nfe_number,
        next_nfce_number: data.next_nfce_number,
        next_nfse_number: data.next_nfse_number,
        auto_update_cost: data.auto_update_cost,
        auto_generate_stock: data.auto_generate_stock,
        auto_generate_payable: data.auto_generate_payable,
        updated_at: new Date().toISOString(),
      };

      if (fiscalConfig) {
        const { error } = await supabase
          .from('fiscal_config')
          .update(updateData)
          .eq('id', fiscalConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fiscal_config')
          .insert({
            company_id: company.id,
            ...updateData,
            environment: 'homologation',
            provider: 'focus_nfe',
          });

        if (error) throw error;
      }

      toast({
        title: 'Configurações salvas',
        description: 'Numeração e configurações de entrada atualizadas.',
      });

      queryClient.invalidateQueries({ queryKey: ['fiscal-config'] });
    } catch (error) {
      console.error('Error saving numeration config:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingConfig) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            <CardTitle>Séries e Numeração</CardTitle>
          </div>
          <CardDescription>
            Configure as séries e o próximo número para cada tipo de documento fiscal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* NF-e Section */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nfe_series"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Série NF-e</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        Série utilizada na emissão de NF-e
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_nfe_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Próximo Número NF-e</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        Próximo número a ser utilizado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* NFC-e Section */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nfce_series"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Série NFC-e</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        Série utilizada na emissão de NFC-e
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_nfce_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Próximo Número NFC-e</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        Próximo número a ser utilizado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* NFS-e Section */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nfse_series"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Série NFS-e</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        Série utilizada na emissão de NFS-e
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_nfse_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Próximo Número NFS-e</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        Próximo número a ser utilizado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Incoming Invoice Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileInput className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Entrada de Nota Fiscal</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure o que o sistema deve fazer automaticamente ao registrar uma nota de entrada
                </p>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="auto_update_cost"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Atualizar Preço de Custo
                          </FormLabel>
                          <FormDescription>
                            Atualiza automaticamente o custo médio dos itens
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_generate_stock"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Gerar Entrada de Estoque
                          </FormLabel>
                          <FormDescription>
                            Registra automaticamente a movimentação de estoque
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_generate_payable"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Gerar Contas a Pagar
                          </FormLabel>
                          <FormDescription>
                            Cria automaticamente o lançamento financeiro
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
