import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Loader2, Printer } from 'lucide-react';
import { useTableQRTokens } from '@/hooks/useTableQRTokens';
import { useTables } from '@/hooks/useTables';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TableQRBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TableQRBatchDialog = ({ open, onOpenChange }: TableQRBatchDialogProps) => {
  const { activeTables } = useTables();
  const { tokens, generateBatchTokens } = useTableQRTokens();
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const baseUrl = window.location.origin;

  const handleGenerateAll = async () => {
    if (!activeTables || activeTables.length === 0) {
      toast.error('Nenhuma mesa ativa encontrada');
      return;
    }

    setIsGenerating(true);
    try {
      const tableIds = activeTables.map(t => t.id);
      await generateBatchTokens.mutateAsync(tableIds);
      toast.success(`QR Codes gerados para ${tableIds.length} mesas!`);
    } catch (error) {
      toast.error('Erro ao gerar QR Codes');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Codes - Mesas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .qr-item { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; page-break-inside: avoid; }
            .qr-item h3 { margin: 10px 0 5px; font-size: 18px; }
            .qr-item p { margin: 0; color: #666; font-size: 12px; }
            @media print {
              .qr-grid { grid-template-columns: repeat(3, 1fr); }
              .qr-item { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const tablesWithTokens = activeTables?.map(table => ({
    ...table,
    token: tokens.find(t => t.table_id === table.id),
  })).filter(t => t.token) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>QR Codes em Lote - Mesas</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={handleGenerateAll} disabled={isGenerating}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar QR Codes para Todas as Mesas ({activeTables?.length || 0})
          </Button>
          
          {tablesWithTokens.length > 0 && (
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Todos
            </Button>
          )}
        </div>

        <ScrollArea className="h-[500px]">
          <div ref={printRef} className="qr-grid grid grid-cols-3 gap-4 p-2">
            {tablesWithTokens.map((table) => (
              <div key={table.id} className="qr-item flex flex-col items-center p-4 border rounded-lg">
                <div className="bg-white p-2 rounded">
                  <QRCodeSVG
                    value={`${baseUrl}/qr/mesa/${table.token?.token}`}
                    size={120}
                    level="H"
                  />
                </div>
                <h3 className="font-bold mt-2">Mesa {table.number}</h3>
                {table.name && <p className="text-sm text-muted-foreground">{table.name}</p>}
              </div>
            ))}
          </div>

          {tablesWithTokens.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum QR Code gerado ainda. Clique em "Gerar QR Codes" para começar.
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
