import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Loader2, 
  Shield, 
  Database,
  Users,
  ShoppingBag,
  CreditCard,
  Truck
} from 'lucide-react';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface DataCategory {
  id: string;
  label: string;
  description: string;
  icon: typeof Database;
  tables: string[];
}

const DATA_CATEGORIES: DataCategory[] = [
  {
    id: 'company',
    label: 'Dados da Empresa',
    description: 'Informações cadastrais, configurações e integrações',
    icon: Database,
    tables: ['companies', 'company_integrations', 'company_modules'],
  },
  {
    id: 'customers',
    label: 'Clientes',
    description: 'Cadastro de clientes e endereços',
    icon: Users,
    tables: ['customers', 'customer_addresses'],
  },
  {
    id: 'orders',
    label: 'Pedidos',
    description: 'Histórico de pedidos e itens',
    icon: ShoppingBag,
    tables: ['orders', 'order_items'],
  },
  {
    id: 'financial',
    label: 'Financeiro',
    description: 'Caixa, contas a pagar e fiado',
    icon: CreditCard,
    tables: ['cash_sessions', 'accounts_payable', 'customer_credit_transactions'],
  },
  {
    id: 'deliverers',
    label: 'Entregadores',
    description: 'Cadastro e acertos de entregadores',
    icon: Truck,
    tables: ['deliverers', 'deliverer_settlements'],
  },
];

export function DataExportLGPD() {
  const { data: company } = useCompany();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  const selectAll = () => {
    setSelectedCategories(new Set(DATA_CATEGORIES.map(c => c.id)));
  };

  const handleExport = async () => {
    if (!company?.id || selectedCategories.size === 0) return;

    setExporting(true);
    try {
      const zip = new JSZip();
      const exportDate = new Date().toISOString().split('T')[0];
      
      // Add metadata
      zip.file('metadata.json', JSON.stringify({
        exportDate: new Date().toISOString(),
        companyId: company.id,
        companyName: company.name,
        categories: Array.from(selectedCategories),
      }, null, 2));

      // Export each selected category
      for (const categoryId of selectedCategories) {
        const category = DATA_CATEGORIES.find(c => c.id === categoryId);
        if (!category) continue;

        const folder = zip.folder(category.id);
        if (!folder) continue;

        for (const tableName of category.tables) {
          try {
            const { data, error } = await supabase
              .from(tableName as any)
              .select('*')
              .eq('company_id', company.id)
              .limit(10000);

            if (error) {
              console.warn(`Error exporting ${tableName}:`, error);
              continue;
            }

            if (data && data.length > 0) {
              folder.file(`${tableName}.json`, JSON.stringify(data, null, 2));
            }
          } catch (err) {
            console.warn(`Skipping ${tableName}:`, err);
          }
        }
      }

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dados-${company.name?.replace(/\s+/g, '-') || 'empresa'}-${exportDate}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Dados exportados com sucesso!');
      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="w-4 h-4 mr-2" />
          Exportar Dados (LGPD)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Exportar Dados da Empresa
          </DialogTitle>
          <DialogDescription>
            Em conformidade com a LGPD, você pode exportar todos os dados da sua empresa.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Os dados serão exportados em formato JSON dentro de um arquivo ZIP.
            Mantenha-os em local seguro.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Selecione os dados:</span>
            <Button variant="link" size="sm" onClick={selectAll}>
              Selecionar todos
            </Button>
          </div>

          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-3">
              {DATA_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategories.has(category.id);

                return (
                  <div
                    key={category.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <Label className="font-medium cursor-pointer">
                          {category.label}
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {category.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || selectedCategories.size === 0}
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exportar ({selectedCategories.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
