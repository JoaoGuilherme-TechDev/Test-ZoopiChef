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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCompanyBranches } from '../hooks/useCompanyBranches';

const formSchema = z.object({
  pdv_name: z.string().min(2, 'Nome obrigatório'),
  pdv_identifier: z.string().min(2, 'Identificador obrigatório'),
  branch_id: z.string().min(1, 'Empresa fiscal obrigatória'),
  nfe_series: z.coerce.number().min(1),
  nfce_series: z.coerce.number().min(1),
});

type FormData = z.infer<typeof formSchema>;

interface PDVConfig {
  id: string;
  pdv_name: string;
  pdv_identifier: string;
  branch_id: string | null;
  nfe_series: number;
  nfce_series: number;
  is_active: boolean;
}

interface PDVBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdv: PDVConfig | null;
  onSave: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

export function PDVBranchDialog({ open, onOpenChange, pdv, onSave, isLoading }: PDVBranchDialogProps) {
  const { branches, isLoading: isLoadingBranches } = useCompanyBranches();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pdv_name: '',
      pdv_identifier: '',
      branch_id: '',
      nfe_series: 1,
      nfce_series: 1,
    },
  });

  useEffect(() => {
    if (pdv) {
      form.reset({
        pdv_name: pdv.pdv_name,
        pdv_identifier: pdv.pdv_identifier,
        branch_id: pdv.branch_id || '',
        nfe_series: pdv.nfe_series,
        nfce_series: pdv.nfce_series,
      });
    } else {
      form.reset({
        pdv_name: '',
        pdv_identifier: '',
        branch_id: '',
        nfe_series: 1,
        nfce_series: 1,
      });
    }
    setError(null);
  }, [pdv, form, open]);

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      await onSave(data);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activeBranches = branches.filter(b => b.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {pdv ? 'Editar PDV' : 'Novo PDV'}
          </DialogTitle>
          <DialogDescription>
            Configure o ponto de venda e vincule a uma empresa fiscal (CNPJ)
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {activeBranches.length === 0 && !isLoadingBranches && (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Nenhuma empresa fiscal cadastrada. Cadastre uma empresa antes de configurar o PDV.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pdv_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do PDV *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Caixa 01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pdv_identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identificador *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: PDV001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Identificador único do terminal
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa Fiscal (CNPJ) *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeBranches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.razao_social} ({branch.cnpj})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Todas as notas deste PDV serão emitidas com este CNPJ
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nfe_series"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Série NF-e</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nfce_series"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Série NFC-e</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || activeBranches.length === 0}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {pdv ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
