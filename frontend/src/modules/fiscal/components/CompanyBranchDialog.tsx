import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useCompanyBranches } from '../hooks/useCompanyBranches';
import { BRAZILIAN_STATES } from '../types';
import { CRT_OPTIONS, REGIME_TRIBUTARIO_LABELS } from '../types/company-branch';
import type { CompanyBranch } from '../types/company-branch';

const formSchema = z.object({
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  razao_social: z.string().min(3, 'Razão social obrigatória'),
  nome_fantasia: z.string().optional(),
  inscricao_estadual: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  
  logradouro: z.string().min(3, 'Logradouro obrigatório'),
  numero: z.string().min(1, 'Número obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro obrigatório'),
  municipio: z.string().min(2, 'Município obrigatório'),
  uf: z.string().length(2, 'UF inválida'),
  cep: z.string().min(8, 'CEP inválido').max(9),
  codigo_ibge: z.string().min(7, 'Código IBGE obrigatório'),
  telefone: z.string().optional(),
  
  regime_tributario: z.enum(['mei', 'simples_nacional', 'lucro_presumido', 'lucro_real']),
  crt: z.coerce.number().min(1).max(3),
  natureza_operacao: z.string().min(3, 'Natureza de operação obrigatória'),
  
  nfe_serie: z.coerce.number().min(1),
  nfe_proximo_numero: z.coerce.number().min(1),
  nfe_ambiente: z.enum(['homologation', 'production']),
  
  nfce_serie: z.coerce.number().min(1),
  nfce_proximo_numero: z.coerce.number().min(1),
  nfce_ambiente: z.enum(['homologation', 'production']),
  
  csc_id: z.string().optional(),
  csc_token: z.string().optional(),
  
  fiscal_provider: z.string().optional(),
  fiscal_api_token: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CompanyBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: CompanyBranch | null;
}

export function CompanyBranchDialog({ open, onOpenChange, branch }: CompanyBranchDialogProps) {
  const { createBranch, updateBranch } = useCompanyBranches();
  const [activeTab, setActiveTab] = useState('dados');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cnpj: '',
      razao_social: '',
      nome_fantasia: '',
      inscricao_estadual: '',
      inscricao_municipal: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      municipio: '',
      uf: '',
      cep: '',
      codigo_ibge: '',
      telefone: '',
      regime_tributario: 'simples_nacional',
      crt: 1,
      natureza_operacao: 'VENDA DE MERCADORIA',
      nfe_serie: 1,
      nfe_proximo_numero: 1,
      nfe_ambiente: 'homologation',
      nfce_serie: 1,
      nfce_proximo_numero: 1,
      nfce_ambiente: 'homologation',
      csc_id: '',
      csc_token: '',
      fiscal_provider: 'focus_nfe',
      fiscal_api_token: '',
    },
  });

  useEffect(() => {
    if (branch) {
      form.reset({
        cnpj: branch.cnpj,
        razao_social: branch.razao_social,
        nome_fantasia: branch.nome_fantasia || '',
        inscricao_estadual: branch.inscricao_estadual || '',
        inscricao_municipal: branch.inscricao_municipal || '',
        logradouro: branch.logradouro,
        numero: branch.numero,
        complemento: branch.complemento || '',
        bairro: branch.bairro,
        municipio: branch.municipio,
        uf: branch.uf,
        cep: branch.cep,
        codigo_ibge: branch.codigo_ibge,
        telefone: branch.telefone || '',
        regime_tributario: branch.regime_tributario as any,
        crt: branch.crt,
        natureza_operacao: branch.natureza_operacao,
        nfe_serie: branch.nfe_serie,
        nfe_proximo_numero: branch.nfe_proximo_numero,
        nfe_ambiente: branch.nfe_ambiente as any,
        nfce_serie: branch.nfce_serie,
        nfce_proximo_numero: branch.nfce_proximo_numero,
        nfce_ambiente: branch.nfce_ambiente as any,
        csc_id: branch.csc_id || '',
        csc_token: branch.csc_token || '',
        fiscal_provider: branch.fiscal_provider || 'focus_nfe',
        fiscal_api_token: branch.fiscal_api_token || '',
      });
    } else {
      form.reset();
    }
    setActiveTab('dados');
  }, [branch, form, open]);

  const onSubmit = async (data: FormData) => {
    try {
      if (branch) {
        await updateBranch.mutateAsync({ id: branch.id, ...data } as any);
      } else {
        await createBranch.mutateAsync(data as any);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const isLoading = createBranch.isPending || updateBranch.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {branch ? 'Editar Empresa Fiscal' : 'Nova Empresa Fiscal'}
          </DialogTitle>
          <DialogDescription>
            Cadastre os dados fiscais completos da empresa para emissão de NF-e e NFC-e
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="endereco">Endereço</TabsTrigger>
                <TabsTrigger value="tributacao">Tributação</TabsTrigger>
                <TabsTrigger value="numeracao">Numeração</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ *</FormLabel>
                        <FormControl>
                          <Input placeholder="00.000.000/0000-00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inscricao_estadual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Estadual</FormLabel>
                        <FormControl>
                          <Input placeholder="IE" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="razao_social"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome legal da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome_fantasia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome comercial" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inscricao_municipal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Municipal</FormLabel>
                        <FormControl>
                          <Input placeholder="IM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 00000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="endereco" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="logradouro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logradouro *</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, Avenida, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número *</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input placeholder="Sala, Andar, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro *</FormLabel>
                        <FormControl>
                          <Input placeholder="Bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="municipio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Município *</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="uf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BRAZILIAN_STATES.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.value} - {state.label}
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
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP *</FormLabel>
                        <FormControl>
                          <Input placeholder="00000-000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="codigo_ibge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código IBGE *</FormLabel>
                      <FormControl>
                        <Input placeholder="0000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="tributacao" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="regime_tributario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regime Tributário *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(REGIME_TRIBUTARIO_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
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
                    name="crt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CRT *</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CRT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value.toString()}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="natureza_operacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Natureza de Operação *</FormLabel>
                      <FormControl>
                        <Input placeholder="VENDA DE MERCADORIA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="csc_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CSC ID (para NFC-e)</FormLabel>
                        <FormControl>
                          <Input placeholder="ID do CSC" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="csc_token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CSC Token</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Token do CSC" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fiscal_provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provedor Fiscal</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="focus_nfe">Focus NFe</SelectItem>
                            <SelectItem value="nfe_io">NFe.io</SelectItem>
                            <SelectItem value="webmania">Webmania</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fiscal_api_token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Token</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Token da API" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="numeracao" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <h4 className="font-medium">NF-e (Nota Fiscal Eletrônica)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="nfe_serie"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Série *</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nfe_proximo_numero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Próximo Número *</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nfe_ambiente"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ambiente *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="homologation">Homologação</SelectItem>
                              <SelectItem value="production">Produção</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">NFC-e (Nota Fiscal de Consumidor)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="nfce_serie"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Série *</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nfce_proximo_numero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Próximo Número *</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nfce_ambiente"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ambiente *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="homologation">Homologação</SelectItem>
                              <SelectItem value="production">Produção</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {branch ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
