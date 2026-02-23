import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export type PrinterType = 'network' | 'usb';

export interface Printer {
  id: string;
  company_id: string;
  name: string;
  printer_type: PrinterType;
  printer_host: string | null;
  printer_port: number;
  printer_name: string | null;
  paper_width: number;
  encoding: string;
  beep_on_print: boolean;
  cut_after_print: boolean;
  copies: number;
  is_active: boolean;
  is_default: boolean;
  last_ping_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrinterRouting {
  id: string;
  company_id: string;
  printer_id: string;
  job_type: string | null;
  print_sector_id: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  order: 'Ticket de Produção',
  full_order: 'Ticket Gerencial',
  table_bill: 'Conta de Mesa',
  cash_opening_supply: 'Suprimento de Caixa',
  cash_sangria: 'Sangria',
  cash_closing_report: 'Fechamento de Caixa',
  credit_statement: 'Extrato de Crédito',
  sommelier_ticket: 'Ticket Sommelier',
  rotisseur_ticket: 'Ticket Rotisseur',
  print_test: 'Teste de Impressão',
};

export function usePrinterRegistry() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: printers = [], isLoading, error } = useQuery({
    queryKey: ['printer-registry', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('printer_registry')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;
      return data as Printer[];
    },
    enabled: !!company?.id,
  });

  const { data: routings = [], isLoading: routingsLoading } = useQuery({
    queryKey: ['printer-routing', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('printer_job_routing')
        .select('*')
        .eq('company_id', company.id);

      if (error) throw error;
      return data as PrinterRouting[];
    },
    enabled: !!company?.id,
  });

  const createPrinter = useMutation({
    mutationFn: async (printer: Omit<Printer, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'last_ping_at' | 'last_error'>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { data, error } = await supabase
        .from('printer_registry')
        .insert([{ ...printer, company_id: company.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer-registry'] });
      toast.success('Impressora cadastrada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao cadastrar impressora');
    },
  });

  const updatePrinter = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Printer> & { id: string }) => {
      const { data, error } = await supabase
        .from('printer_registry')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer-registry'] });
      toast.success('Impressora atualizada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar impressora');
    },
  });

  const deletePrinter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('printer_registry')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer-registry'] });
      queryClient.invalidateQueries({ queryKey: ['printer-routing'] });
      toast.success('Impressora removida!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover impressora');
    },
  });

  const createRouting = useMutation({
    mutationFn: async (routing: { printer_id: string; job_type?: string | null; print_sector_id?: string | null; priority?: number }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { data, error } = await supabase
        .from('printer_job_routing')
        .insert([{ 
          printer_id: routing.printer_id,
          job_type: routing.job_type || null,
          print_sector_id: routing.print_sector_id || null,
          priority: routing.priority || 100,
          company_id: company.id 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer-routing'] });
      toast.success('Roteamento configurado!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Este roteamento já existe');
      } else {
        toast.error(error.message || 'Erro ao configurar roteamento');
      }
    },
  });

  const deleteRouting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('printer_job_routing')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer-routing'] });
      toast.success('Roteamento removido!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover roteamento');
    },
  });

  const activePrinters = printers.filter(p => p.is_active);
  const defaultPrinter = printers.find(p => p.is_default);

  return {
    printers,
    activePrinters,
    defaultPrinter,
    routings,
    isLoading: isLoading || routingsLoading,
    error,
    createPrinter,
    updatePrinter,
    deletePrinter,
    createRouting,
    deleteRouting,
  };
}
