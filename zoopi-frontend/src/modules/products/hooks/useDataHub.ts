// src/modules/products/hooks/useDataHub.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns/format";

export interface PendingProduct {
  name: string;
  description?: string;
  price: number;
  category_name: string;
  subcategory_name?: string;
  sku?: string;
  image_url?: string;
  ncm?: string;
  type?: 'simple' | 'pizza' | 'combo';
}

export function useDataHub() {
  const queryClient = useQueryClient();

  // --- PRODUTOS & IA ---
  const extractIA = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<PendingProduct[]>('/products/extract-ia', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onError: () => toast.error("Falha ao processar arquivo com IA.")
  });

  const saveProductsBulk = useMutation({
    mutationFn: (items: PendingProduct[]) => api.post('/products/bulk', { items }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${res.data.created} produtos importados com sucesso!`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Erro ao salvar produtos.")
  });

  // --- SABORES ---
  const importFlavors = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/products/import-flavors', formData);
    },
    onSuccess: () => toast.success("Sabores importados!")
  });

  // --- BAIRROS ---
  const importNeighborhoods = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/products/import-neighborhoods', formData);
    },
    onSuccess: () => toast.success("Bairros importados!")
  });

  // --- CLIENTES ---
  const importCustomers = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/products/import-customers', formData);
    },
    onSuccess: () => toast.success("Clientes importados!")
  });


 const saveCustomersBulk = useMutation({
  mutationFn: (items: any[]) => api.post('/customers/bulk', { items }), // Criaremos este endpoint no backend em seguida
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    toast.success("Clientes importados com sucesso!");
  },
  onError: (err: any) => toast.error("Erro ao importar clientes.")
});

  // --- FORNECEDORES ---
  const importSuppliers = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/products/import-suppliers', formData);
    },
    onSuccess: () => toast.success("Fornecedores importados!")
  });

  const handleExport = async (entity: string) => {
  try {
    const endpoint = entity === 'customers' ? '/customers/export' : `/products/export?entity=${entity}`;
    const res = await api.get(endpoint);
    const data = res.data;

    if (!Array.isArray(data) || data.length === 0) {
      toast.error("Nenhum dado encontrado para exportar.");
      return;
    }

    // 1. Extrai os cabeçalhos das chaves do primeiro objeto
    const headers = Object.keys(data[0]);
    
    // 2. Transforma os dados em linhas de CSV, escapando aspas e tratando nulos
    const csvRows = data.map(row => 
      headers.map(header => {
        const val = row[header] === null || row[header] === undefined ? "" : row[header];
        const escaped = ('' + val).replace(/"/g, '""'); // Escapa aspas duplas
        return `"${escaped}"`; // Envolve em aspas para garantir que o ";" interno não quebre a coluna
      }).join(";")
    );

    // 3. Monta o conteúdo final com BOM (para o Excel abrir acentos corretamente)
    const csvContent = "\uFEFF" + headers.join(";") + "\n" + csvRows.join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `zoopi_${entity}_${format(new Date(), 'dd_MM_yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error(e);
    toast.error("Falha ao gerar arquivo de exportação.");
  }
};


  const parseCSV = (content: string): PendingProduct[] => {
    const lines = content.split('\n').filter(l => l.trim());
    const header = lines[0].split(';').map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const values = line.split(';').map(v => v.trim());
      const item: any = {};
      header.forEach((h, i) => {
        if (h.includes('nome')) item.name = values[i];
        if (h.includes('preco') || h.includes('valor')) item.price = parseFloat(values[i]?.replace(',', '.') || '0');
        if (h.includes('categoria')) item.category_name = values[i];
        if (h.includes('descricao')) item.description = values[i];
        if (h.includes('sku')) item.sku = values[i];
      });
      return item as PendingProduct;
    });
  };

  return {
    extractIA,
    saveProductsBulk,
    importFlavors,
    importNeighborhoods,
    importCustomers,
    importSuppliers,
    handleExport,
    saveCustomersBulk,
    parseCSV
  };
}