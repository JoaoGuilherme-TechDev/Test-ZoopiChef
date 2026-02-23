import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { 
  parseCSVContent, 
  processImportData, 
  readFileAsText,
  transforms,
  validators,
  ColumnMapping,
  downloadTemplate,
  exportDataToCSV
} from '@/utils/importExportUtils';

// ============================================
// NEIGHBORHOODS IMPORT/EXPORT
// ============================================

export interface NeighborhoodImportRow {
  city: string;
  neighborhood: string;
  fee: number;
  zone: string | null;
}

const NEIGHBORHOOD_MAPPINGS: ColumnMapping[] = [
  { 
    header: 'Cidade', 
    field: 'city', 
    required: true,
    transform: transforms.toString,
  },
  { 
    header: 'Bairro', 
    field: 'neighborhood', 
    required: true,
    transform: transforms.toString,
  },
  { 
    header: 'Taxa', 
    field: 'fee', 
    required: true,
    transform: transforms.toNumber,
    validate: validators.positiveNumber,
  },
  { 
    header: 'Zona', 
    field: 'zone', 
    required: false,
    transform: transforms.toStringOrNull,
  },
];

export function useImportNeighborhoods() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const content = await readFileAsText(file);
      const rows = parseCSVContent(content);
      const result = processImportData<NeighborhoodImportRow>(rows, NEIGHBORHOOD_MAPPINGS);

      if (result.success.length === 0) {
        return result;
      }

      const neighborhoodsToInsert = result.success.map(item => ({
        company_id: company.id,
        city: item.city,
        neighborhood: item.neighborhood,
        fee: item.fee,
        zone: item.zone,
        active: true,
      }));

      const { error } = await supabase
        .from('delivery_fee_neighborhoods')
        .insert(neighborhoodsToInsert);

      if (error) throw error;

      return {
        ...result,
        inserted: neighborhoodsToInsert.length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-config'] });
      
      const insertedCount = 'inserted' in data ? data.inserted : data.success.length;
      if (data.errors.length > 0) {
        toast.warning(`Importação parcial: ${insertedCount || 0} bairros importados, ${data.errors.length} erros`);
      } else {
        toast.success(`${insertedCount || 0} bairros importados com sucesso!`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao importar bairros: ' + error.message);
    },
  });
}

export function useExportNeighborhoods() {
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data: neighborhoods, error } = await supabase
        .from('delivery_fee_neighborhoods')
        .select('*')
        .eq('company_id', company.id)
        .order('city', { ascending: true });

      if (error) throw error;

      const columns = [
        { key: 'city', header: 'Cidade' },
        { key: 'neighborhood', header: 'Bairro' },
        { 
          key: 'fee', 
          header: 'Taxa',
          format: (v: number) => v?.toFixed(2).replace('.', ',') || '0,00',
        },
        { key: 'zone', header: 'Zona' },
      ];

      exportDataToCSV(neighborhoods || [], columns, 'bairros_exportados');

      return { count: neighborhoods?.length || 0 };
    },
    onSuccess: (data) => {
      toast.success(`${data.count} bairros exportados com sucesso!`);
    },
    onError: (error: any) => {
      toast.error('Erro ao exportar bairros: ' + error.message);
    },
  });
}

export function downloadNeighborhoodsTemplate() {
  downloadTemplate('template_bairros', [
    'Cidade',
    'Bairro',
    'Taxa',
    'Zona',
  ]);
}

// ============================================
// CUSTOMERS IMPORT/EXPORT
// ============================================

export interface CustomerImportRow {
  first_name: string;
  last_name: string | null;
  whatsapp: string;
  phone: string | null;
  email: string | null;
  document: string | null; // CPF/CNPJ
  rg_ie: string | null; // RG or Inscrição Estadual
  allow_credit: boolean;
  credit_limit: number | null;
  initial_balance: number | null; // Initial fiado balance
  internal_notes: string | null;
  // Address fields
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  reference: string | null;
}

// Validation for CPF/CNPJ
function validateDocument(value: string): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 11 && cleaned.length !== 14) {
    return 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos';
  }
  return null;
}

// Format document (remove non-numeric chars)
function formatDocument(value: string): string | null {
  if (!value) return null;
  return value.replace(/\D/g, '');
}

const CUSTOMER_MAPPINGS: ColumnMapping[] = [
  { 
    header: 'Nome', 
    field: 'first_name', 
    required: true,
    transform: transforms.toString,
  },
  { 
    header: 'Sobrenome', 
    field: 'last_name', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Celular', 
    field: 'whatsapp', 
    required: true,
    transform: (v) => v.replace(/\D/g, ''),
  },
  { 
    header: 'Telefone Fixo', 
    field: 'phone', 
    required: false,
    transform: (v) => v ? v.replace(/\D/g, '') : null,
  },
  { 
    header: 'Email', 
    field: 'email', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'CPF/CNPJ', 
    field: 'document', 
    required: false,
    transform: formatDocument,
    validate: validateDocument,
  },
  { 
    header: 'RG/IE', 
    field: 'rg_ie', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Permite Fiado', 
    field: 'allow_credit', 
    required: false,
    transform: transforms.toBoolean,
  },
  { 
    header: 'Limite Fiado', 
    field: 'credit_limit', 
    required: false,
    transform: transforms.toNumber,
    validate: validators.positiveNumber,
  },
  { 
    header: 'Saldo Inicial Fiado', 
    field: 'initial_balance', 
    required: false,
    transform: transforms.toNumber,
  },
  { 
    header: 'Observações', 
    field: 'internal_notes', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Rua', 
    field: 'street', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Número', 
    field: 'number', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Complemento', 
    field: 'complement', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Bairro', 
    field: 'neighborhood', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'CEP', 
    field: 'cep', 
    required: false,
    transform: (v) => v ? v.replace(/\D/g, '') : null,
  },
  { 
    header: 'Cidade', 
    field: 'city', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Estado', 
    field: 'state', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Referência', 
    field: 'reference', 
    required: false,
    transform: transforms.toStringOrNull,
  },
];

export function useImportCustomers() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const content = await readFileAsText(file);
      const rows = parseCSVContent(content);
      const result = processImportData<CustomerImportRow>(rows, CUSTOMER_MAPPINGS);

      if (result.success.length === 0) {
        return result;
      }

      let insertedCount = 0;
      const creditTransactions: any[] = [];

      for (const item of result.success) {
        // Build full name
        const fullName = item.last_name 
          ? `${item.first_name} ${item.last_name}` 
          : item.first_name;

        // Insert customer
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .insert({
            company_id: company.id,
            name: fullName,
            whatsapp: item.whatsapp,
            phone: item.phone,
            email: item.email,
            document: item.document,
            allow_credit: item.allow_credit || false,
            credit_limit: item.credit_limit,
            credit_balance: item.initial_balance || 0,
            internal_notes: item.rg_ie 
              ? `RG/IE: ${item.rg_ie}${item.internal_notes ? '\n' + item.internal_notes : ''}`
              : item.internal_notes,
          })
          .select('id')
          .single();

        if (customerError) {
          result.errors.push({
            row: insertedCount + 2,
            field: 'cliente',
            value: fullName,
            message: customerError.message,
          });
          continue;
        }

        insertedCount++;

        // Insert address if has street data
        if (item.street && item.neighborhood && item.city) {
          const { error: addressError } = await supabase
            .from('customer_addresses')
            .insert({
              company_id: company.id,
              customer_id: customer.id,
              label: 'Principal',
              cep: item.cep,
              street: item.street,
              number: item.number || 'S/N',
              complement: item.complement,
              neighborhood: item.neighborhood,
              city: item.city,
              state: item.state,
              reference: item.reference,
              is_default: true,
            });

          if (addressError) {
            console.warn('Erro ao inserir endereço:', addressError);
          }
        }

        // Add initial credit transaction if has initial balance
        if (item.initial_balance && item.initial_balance !== 0) {
          creditTransactions.push({
            company_id: company.id,
            customer_id: customer.id,
            transaction_type: item.initial_balance > 0 ? 'debit' : 'credit',
            amount: Math.abs(item.initial_balance),
            balance_after: item.initial_balance,
            notes: 'Saldo inicial importado',
          });
        }
      }

      // Insert credit transactions in batch
      if (creditTransactions.length > 0) {
        await supabase
          .from('customer_credit_transactions')
          .insert(creditTransactions);
      }

      return {
        ...result,
        inserted: insertedCount,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      const insertedCount = 'inserted' in data ? data.inserted : data.success.length;
      if (data.errors.length > 0) {
        toast.warning(`Importação parcial: ${insertedCount || 0} clientes importados, ${data.errors.length} erros`);
      } else {
        toast.success(`${insertedCount || 0} clientes importados com sucesso!`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao importar clientes: ' + error.message);
    },
  });
}

export function useExportCustomers() {
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data: customers, error } = await supabase
        .from('customers')
        .select(`
          *,
          addresses:customer_addresses(*)
        `)
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;

      const columns = [
        { key: 'first_name', header: 'Nome' },
        { key: 'last_name', header: 'Sobrenome' },
        { key: 'whatsapp', header: 'Celular' },
        { key: 'phone', header: 'Telefone Fixo' },
        { key: 'email', header: 'Email' },
        { key: 'document', header: 'CPF/CNPJ' },
        { key: 'rg_ie', header: 'RG/IE' },
        { key: 'allow_credit', header: 'Permite Fiado', format: (v: boolean) => v ? 'Sim' : 'Não' },
        { key: 'credit_limit', header: 'Limite Fiado', format: (v: number) => v?.toFixed(2).replace('.', ',') || '' },
        { key: 'credit_balance', header: 'Saldo Fiado', format: (v: number) => v?.toFixed(2).replace('.', ',') || '0,00' },
        { key: 'internal_notes', header: 'Observações' },
        { key: 'street', header: 'Rua' },
        { key: 'number', header: 'Número' },
        { key: 'complement', header: 'Complemento' },
        { key: 'neighborhood', header: 'Bairro' },
        { key: 'cep', header: 'CEP' },
        { key: 'city', header: 'Cidade' },
        { key: 'state', header: 'Estado' },
        { key: 'reference', header: 'Referência' },
      ];

      const data = customers?.map((c: any) => {
        const defaultAddr = c.addresses?.find((a: any) => a.is_default) || c.addresses?.[0];
        // Split name into first_name and last_name
        const nameParts = (c.name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        // Extract RG/IE from internal_notes if present
        let rgIe = '';
        let notes = c.internal_notes || '';
        if (notes.startsWith('RG/IE:')) {
          const lines = notes.split('\n');
          rgIe = lines[0].replace('RG/IE:', '').trim();
          notes = lines.slice(1).join('\n');
        }
        return {
          ...c,
          first_name: firstName,
          last_name: lastName,
          rg_ie: rgIe,
          internal_notes: notes,
          street: defaultAddr?.street || '',
          number: defaultAddr?.number || '',
          complement: defaultAddr?.complement || '',
          neighborhood: defaultAddr?.neighborhood || '',
          cep: defaultAddr?.cep || '',
          city: defaultAddr?.city || '',
          state: defaultAddr?.state || '',
          reference: defaultAddr?.reference || '',
        };
      }) || [];

      exportDataToCSV(data, columns, 'clientes_exportados');

      return { count: data.length };
    },
    onSuccess: (data) => {
      toast.success(`${data.count} clientes exportados com sucesso!`);
    },
    onError: (error: any) => {
      toast.error('Erro ao exportar clientes: ' + error.message);
    },
  });
}

export function downloadCustomersTemplate() {
  downloadTemplate('template_clientes', [
    'Nome',
    'Sobrenome',
    'Celular',
    'Telefone Fixo',
    'Email',
    'CPF/CNPJ',
    'RG/IE',
    'Permite Fiado',
    'Limite Fiado',
    'Saldo Inicial Fiado',
    'Observações',
    'Rua',
    'Número',
    'Complemento',
    'Bairro',
    'CEP',
    'Cidade',
    'Estado',
    'Referência',
  ]);
}

// ============================================
// SUPPLIERS IMPORT/EXPORT
// ============================================

export interface SupplierImportRow {
  name: string;
  doc: string | null; // CPF/CNPJ
  tax_id: string | null; // Inscrição Estadual
  phone: string | null;
  mobile: string | null;
  email: string | null;
  payment_terms: string | null;
  notes: string | null;
  // Address fields
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  cep: string | null;
  city: string | null;
  state: string | null;
}

const SUPPLIER_MAPPINGS: ColumnMapping[] = [
  { 
    header: 'Nome', 
    field: 'name', 
    required: true,
    transform: transforms.toString,
  },
  { 
    header: 'CPF/CNPJ', 
    field: 'doc', 
    required: false,
    transform: formatDocument,
    validate: validateDocument,
  },
  { 
    header: 'RG/IE', 
    field: 'tax_id', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Telefone Fixo', 
    field: 'phone', 
    required: false,
    transform: (v) => v ? v.replace(/\D/g, '') : null,
  },
  { 
    header: 'Celular', 
    field: 'mobile', 
    required: false,
    transform: (v) => v ? v.replace(/\D/g, '') : null,
  },
  { 
    header: 'Email', 
    field: 'email', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Condições Pagamento', 
    field: 'payment_terms', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Observações', 
    field: 'notes', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Rua', 
    field: 'street', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Número', 
    field: 'number', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Complemento', 
    field: 'complement', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Bairro', 
    field: 'neighborhood', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'CEP', 
    field: 'cep', 
    required: false,
    transform: (v) => v ? v.replace(/\D/g, '') : null,
  },
  { 
    header: 'Cidade', 
    field: 'city', 
    required: false,
    transform: transforms.toStringOrNull,
  },
  { 
    header: 'Estado', 
    field: 'state', 
    required: false,
    transform: transforms.toStringOrNull,
  },
];

export function useImportSuppliers() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const content = await readFileAsText(file);
      const rows = parseCSVContent(content);
      const result = processImportData<SupplierImportRow>(rows, SUPPLIER_MAPPINGS);

      if (result.success.length === 0) {
        return result;
      }

      const suppliersToInsert = result.success.map(item => ({
        company_id: company.id,
        name: item.name,
        doc: item.doc,
        tax_id: item.tax_id,
        phone: item.phone,
        mobile: item.mobile,
        email: item.email,
        payment_terms: item.payment_terms,
        notes: item.notes,
        street: item.street,
        number: item.number,
        complement: item.complement,
        neighborhood: item.neighborhood,
        cep: item.cep,
        city: item.city,
        state: item.state,
        active: true,
      }));

      const { error } = await supabase
        .from('erp_suppliers')
        .insert(suppliersToInsert);

      if (error) throw error;

      return {
        ...result,
        inserted: suppliersToInsert.length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['erp-suppliers'] });
      
      const insertedCount = 'inserted' in data ? data.inserted : data.success.length;
      if (data.errors.length > 0) {
        toast.warning(`Importação parcial: ${insertedCount || 0} fornecedores importados, ${data.errors.length} erros`);
      } else {
        toast.success(`${insertedCount || 0} fornecedores importados com sucesso!`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao importar fornecedores: ' + error.message);
    },
  });
}

export function useExportSuppliers() {
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data: suppliers, error } = await supabase
        .from('erp_suppliers')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;

      const columns = [
        { key: 'name', header: 'Nome' },
        { key: 'doc', header: 'CPF/CNPJ' },
        { key: 'tax_id', header: 'RG/IE' },
        { key: 'phone', header: 'Telefone Fixo' },
        { key: 'mobile', header: 'Celular' },
        { key: 'email', header: 'Email' },
        { key: 'payment_terms', header: 'Condições Pagamento' },
        { key: 'notes', header: 'Observações' },
        { key: 'street', header: 'Rua' },
        { key: 'number', header: 'Número' },
        { key: 'complement', header: 'Complemento' },
        { key: 'neighborhood', header: 'Bairro' },
        { key: 'cep', header: 'CEP' },
        { key: 'city', header: 'Cidade' },
        { key: 'state', header: 'Estado' },
      ];

      exportDataToCSV(suppliers || [], columns, 'fornecedores_exportados');

      return { count: suppliers?.length || 0 };
    },
    onSuccess: (data) => {
      toast.success(`${data.count} fornecedores exportados com sucesso!`);
    },
    onError: (error: any) => {
      toast.error('Erro ao exportar fornecedores: ' + error.message);
    },
  });
}

export function downloadSuppliersTemplate() {
  downloadTemplate('template_fornecedores', [
    'Nome',
    'CPF/CNPJ',
    'RG/IE',
    'Telefone Fixo',
    'Celular',
    'Email',
    'Condições Pagamento',
    'Observações',
    'Rua',
    'Número',
    'Complemento',
    'Bairro',
    'CEP',
    'Cidade',
    'Estado',
  ]);
}
