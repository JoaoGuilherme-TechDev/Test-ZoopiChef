import { useState, useRef } from "react";
import { Upload, FileUp, Loader2, CheckCircle2, X, Download, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDataHub } from "@/modules/products/hooks/useDataHub";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerImportModal({ isOpen, onOpenChange }: Props) {
  const [pendingCustomers, setPendingCustomers] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { saveCustomersBulk } = useDataHub();
  
const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target?.result as string;
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    
    if (lines.length <= 1) {
      toast.error("O arquivo está vazio ou no formato incorreto.");
      return;
    }

    // Detecta o separador (vírgula ou ponto-e-vírgula)
    const delimiter = lines[0].includes(';') ? ';' : ',';
    
    // Função para limpar aspas e espaços de cada célula
    const clean = (val: string) => val ? val.replace(/^["']|["']$/g, "").trim() : "";

    const header = lines[0].split(delimiter).map(h => clean(h).toLowerCase());
    
    const parsed = lines.slice(1).map(line => {
      // Divide a linha pelo delimitador, mas ignora o que está dentro de aspas (ex: endereços com vírgula)
      const values = line.split(delimiter);
      const item: any = {};
      
      header.forEach((h, i) => {
        const val = clean(values[i]);
        if (h.includes('nome') || h === 'name') item.name = val;
        if (h.includes('email')) item.email = val;
        if (h.includes('telef') || h.includes('whats') || h.includes('phone') || h.includes('celu')) item.phone = val;
        if (h.includes('doc') || h.includes('cpf') || h.includes('cnpj')) item.tax_id = val;
        if (h.includes('end') || h.includes('logra') || h.includes('addr')) item.address = val;
        if (h.includes('nota') || h.includes('obs')) item.notes = val;
      });
      return item;
    }).filter(item => item.name); // Remove linhas que não tenham ao menos o nome

    if (parsed.length === 0) {
      toast.error("Não foi possível identificar os dados. Verifique os cabeçalhos do arquivo.");
      return;
    }

    setPendingCustomers(parsed);
  };
  
  // IMPORTANTE: Ler como UTF-8 para aceitar acentos (João, São Paulo, etc)
  reader.readAsText(file, "UTF-8");
};

const downloadTemplate = () => {
  // Cabeçalhos claros para o usuário
  const headers = ["Nome", "Email", "Telefone", "Documento", "Endereco", "Notas"];
  // Usamos ponto e vírgula por ser o padrão do Excel no Brasil
  const csvContent = "\uFEFF" + headers.join(";") + "\n" + 
                     "Exemplo Silva;exemplo@email.com;11999999999;12345678901;Rua Exemplo, 123;Cliente VIP";
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'modelo_importacao_zoopi.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  const handleConfirm = () => {
    if (!pendingCustomers) return;
    saveCustomersBulk.mutate(pendingCustomers, {
      onSuccess: () => {
        setPendingCustomers(null);
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) setPendingCustomers(null); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl  p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <FileUp className="text-primary h-5 w-5" />
                Importar Clientes
              </DialogTitle>
              <DialogDescription className="text-xs uppercase font-bold text-muted-foreground">
                Suba sua base de dados via arquivo CSV (ponto e vírgula).
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-[10px] font-black uppercase gap-2">
              <Download size={14} /> Baixar Modelo
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6">
          {!pendingCustomers ? (
            <div 
              className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-3xl bg-black/20 hover:bg-black/40 transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
              <Upload className="h-12 w-12 mb-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="text-sm font-black uppercase text-center">Clique ou arraste o arquivo CSV</p>
              <p className="text-[10px] text-muted-foreground uppercase mt-2">Formatos aceitos: .csv separado por ";"</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] font-black">
                  {pendingCustomers.length} Registros Identificados
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setPendingCustomers(null)} className="h-7 text-red-500 text-[10px] uppercase">
                  <X size={14} className="mr-1"/> Trocar Arquivo
                </Button>
              </div>
              <ScrollArea className="h-72 rounded-xl border border-white/5 bg-black/40">
                <Table>
                  <TableHeader className="bg-white/5 sticky top-0">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase">Nome</TableHead>
                      <TableHead className="text-[10px] uppercase">Contato</TableHead>
                      <TableHead className="text-[10px] uppercase">Documento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCustomers.map((c, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell className="text-xs font-bold">{c.name || '---'}</TableCell>
                        <TableCell className="text-xs">{c.phone || c.email || '---'}</TableCell>
                        <TableCell className="text-xs font-mono">{c.tax_id || '---'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-white/[0.03] border-t border-white/5">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="uppercase text-[10px] font-black">
            Fechar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!pendingCustomers || saveCustomersBulk.isPending}
            className="btn-neon min-w-[180px] uppercase text-[10px] font-black"
          >
            {saveCustomersBulk.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar e Salvar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}