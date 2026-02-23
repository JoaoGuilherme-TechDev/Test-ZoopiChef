import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Save, Info } from 'lucide-react';
import { TaxRegime, TAX_REGIME_LABELS } from '../types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

const taxRegimeSchema = z.object({
  tax_regime: z.enum(['mei', 'simples_nacional', 'lucro_presumido', 'lucro_real'] as const),
  state_registration: z.string().optional(),
  municipal_registration: z.string().optional(),
});

type TaxRegimeFormData = z.infer<typeof taxRegimeSchema>;

const REGIME_DESCRIPTIONS: Record<TaxRegime, string> = {
  mei: 'Microempreendedor Individual - Faturamento até R$ 81.000/ano',
  simples_nacional: 'Simples Nacional - Faturamento até R$ 4,8 milhões/ano',
  lucro_presumido: 'Lucro Presumido - Base de cálculo presumida',
  lucro_real: 'Lucro Real - Apuração sobre lucro efetivo',
};

const REGIME_TAXES: Record<TaxRegime, string[]> = {
  mei: ['DAS fixo mensal', 'ICMS/ISS inclusos'],
  simples_nacional: ['DAS unificado', 'ICMS/ISS conforme anexo'],
  lucro_presumido: ['IRPJ 15%', 'CSLL 9%', 'PIS 0,65%', 'COFINS 3%'],
  lucro_real: ['IRPJ 15% + adicional', 'CSLL 9%', 'PIS 1,65%', 'COFINS 7,6%'],
};

export function TaxRegimeConfig() {
  const { data: company, refetch } = useCompany();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TaxRegimeFormData>({
    resolver: zodResolver(taxRegimeSchema),
    defaultValues: {
      tax_regime: (company?.tax_regime as TaxRegime) || 'simples_nacional',
      state_registration: company?.state_registration || '',
      municipal_registration: company?.municipal_registration || '',
    },
  });

  const selectedRegime = form.watch('tax_regime');

  const onSubmit = async (data: TaxRegimeFormData) => {
    if (!company?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          tax_regime: data.tax_regime,
          state_registration: data.state_registration || null,
          municipal_registration: data.municipal_registration || null,
        })
        .eq('id', company.id);

      if (error) throw error;

      toast({
        title: 'Regime tributário atualizado',
        description: 'As configurações foram salvas com sucesso.',
      });
      refetch();
    } catch (error) {
      console.error('Error updating tax regime:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Regime Tributário</CardTitle>
        </div>
        <CardDescription>
          Configure o regime tributário da sua empresa para cálculo correto dos impostos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="tax_regime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regime Tributário</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o regime" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TAX_REGIME_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {REGIME_DESCRIPTIONS[selectedRegime]}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tax info for selected regime */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Impostos aplicáveis</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {REGIME_TAXES[selectedRegime].map((tax) => (
                  <Badge key={tax} variant="secondary">
                    {tax}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="state_registration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Estadual</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 123.456.789.123" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Necessária para emissão de NF-e
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="municipal_registration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Municipal</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 12345678" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Necessária para emissão de NFS-e
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
