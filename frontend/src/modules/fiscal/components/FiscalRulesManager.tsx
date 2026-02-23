import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scale, Plus, Pencil, Trash2 } from 'lucide-react';
import { useFiscalRules } from '../hooks/useFiscalReferences';
import { CST_ICMS_OPTIONS, CSOSN_OPTIONS, CST_PIS_COFINS_OPTIONS } from '../types';
import { useToast } from '@/hooks/use-toast';

const fiscalRuleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  ncm_code: z.string().optional(),
  cfop_entrada: z.string().optional(),
  cfop_saida: z.string().optional(),
  cst_icms: z.string().optional(),
  csosn: z.string().optional(),
  cst_pis: z.string().optional(),
  cst_cofins: z.string().optional(),
  icms_rate: z.coerce.number().min(0).max(100).optional(),
  pis_rate: z.coerce.number().min(0).max(100).optional(),
  cofins_rate: z.coerce.number().min(0).max(100).optional(),
  is_active: z.boolean().default(true),
});

type FiscalRuleFormData = z.infer<typeof fiscalRuleSchema>;

export function FiscalRulesManager() {
  const { rules, isLoading, createRule, updateRule, deleteRule } = useFiscalRules();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  const form = useForm<FiscalRuleFormData>({
    resolver: zodResolver(fiscalRuleSchema),
    defaultValues: {
      is_active: true,
    },
  });

  const onSubmit = async (data: FiscalRuleFormData) => {
    try {
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule, ...data });
        toast({ title: 'Regra atualizada com sucesso' });
      } else {
        await createRule.mutateAsync(data);
        toast({ title: 'Regra criada com sucesso' });
      }
      setIsDialogOpen(false);
      setEditingRule(null);
      form.reset();
    } catch (error) {
      toast({
        title: 'Erro ao salvar regra',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule.id);
    form.reset({
      name: rule.name,
      ncm_code: rule.ncm_code || '',
      cfop_entrada: rule.cfop_entrada || '',
      cfop_saida: rule.cfop_saida || '',
      cst_icms: rule.cst_icms || '',
      csosn: rule.csosn || '',
      cst_pis: rule.cst_pis || '',
      cst_cofins: rule.cst_cofins || '',
      icms_rate: rule.icms_rate || 0,
      pis_rate: rule.pis_rate || 0,
      cofins_rate: rule.cofins_rate || 0,
      is_active: rule.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir esta regra?')) {
      try {
        await deleteRule.mutateAsync(id);
        toast({ title: 'Regra excluída com sucesso' });
      } catch (error) {
        toast({
          title: 'Erro ao excluir regra',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Regras Fiscais</CardTitle>
              <CardDescription>
                Configure regras personalizadas para cálculo de impostos
              </CardDescription>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingRule(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? 'Editar Regra Fiscal' : 'Nova Regra Fiscal'}
                </DialogTitle>
                <DialogDescription>
                  Configure os parâmetros da regra fiscal
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Regra</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Venda de produtos alimentícios" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ncm_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código NCM</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 21069090" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="cfop_entrada"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CFOP Entrada</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 1102" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cfop_saida"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CFOP Saída</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 5102" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="cst_icms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CST ICMS</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CST_ICMS_OPTIONS.map((cst) => (
                                  <SelectItem key={cst.value} value={cst.value}>
                                    {cst.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="csosn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CSOSN (Simples)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CSOSN_OPTIONS.map((csosn) => (
                                  <SelectItem key={csosn.value} value={csosn.value}>
                                    {csosn.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="cst_pis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CST PIS</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CST_PIS_COFINS_OPTIONS.map((cst) => (
                                  <SelectItem key={cst.value} value={cst.value}>
                                    {cst.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cst_cofins"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CST COFINS</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CST_PIS_COFINS_OPTIONS.map((cst) => (
                                  <SelectItem key={cst.value} value={cst.value}>
                                    {cst.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="icms_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alíquota ICMS (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pis_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alíquota PIS (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cofins_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alíquota COFINS (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Regra Ativa</FormLabel>
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

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createRule.isPending || updateRule.isPending}>
                        {editingRule ? 'Atualizar' : 'Criar'} Regra
                      </Button>
                    </div>
                  </form>
                </Form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : rules?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Scale className="h-8 w-8 mb-2 opacity-50" />
            <p>Nenhuma regra fiscal configurada</p>
            <p className="text-sm">Clique em "Nova Regra" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules?.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 rounded-lg border transition-colors ${
                  rule.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{rule.name}</h4>
                      {!rule.is_active && (
                        <Badge variant="secondary">Inativa</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {rule.ncm_code && (
                        <Badge variant="outline">NCM: {rule.ncm_code}</Badge>
                      )}
                      {rule.cfop_saida && (
                        <Badge variant="outline">CFOP: {rule.cfop_saida}</Badge>
                      )}
                      {rule.icms_rate != null && rule.icms_rate > 0 && (
                        <Badge variant="outline">ICMS: {rule.icms_rate}%</Badge>
                      )}
                      {rule.pis_rate != null && rule.pis_rate > 0 && (
                        <Badge variant="outline">PIS: {rule.pis_rate}%</Badge>
                      )}
                      {rule.cofins_rate != null && rule.cofins_rate > 0 && (
                        <Badge variant="outline">COFINS: {rule.cofins_rate}%</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(rule)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
