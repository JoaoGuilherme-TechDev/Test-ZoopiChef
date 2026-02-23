import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, Printer } from 'lucide-react';
import { useComandaQRTokens } from '@/hooks/useComandaQRTokens';
import { useTableModuleSettings } from '@/hooks/useTableModuleSettings';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ComandaQRBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComandaQRBatchDialog({ open, onOpenChange }: ComandaQRBatchDialogProps) {
  const [startNumber, setStartNumber] = useState('1');
  const [endNumber, setEndNumber] = useState('50');
  const { tokens, generateBatchTokens } = useComandaQRTokens();
  const { settings } = useTableModuleSettings();
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const baseUrl = window.location.origin;
  const qrMode: 'order' | 'menu' = settings.enable_comanda_qr_menu_only ? 'menu' : 'order';

  const handleGenerateBatch = async () => {
    const start = parseInt(startNumber);
    const end = parseInt(endNumber);

    if (isNaN(start) || isNaN(end)) {
      toast.error('Números inválidos');
      return;
    }

    if (start > end) {
      toast.error('Número inicial deve ser menor ou igual ao final');
      return;
    }

    if (end - start > 200) {
      toast.error('Máximo de 200 comandas por vez');
      return;
    }

    setIsGenerating(true);
    try {
      await generateBatchTokens.mutateAsync({ startNumber: start, endNumber: end });
      toast.success(`QR Codes gerados para comandas ${start} a ${end}!`);
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
          <title>QR Codes - Comandas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .qr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .qr-item { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 8px; page-break-inside: avoid; }
            .qr-item h3 { margin: 8px 0 0; font-size: 16px; }
            @media print {
              .qr-grid { grid-template-columns: repeat(4, 1fr); }
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

  const sortedTokens = [...tokens].sort((a, b) => a.comanda_number - b.comanda_number);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>QR Codes em Lote - Comandas</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="startNumber">Número Inicial</Label>
            <Input
              id="startNumber"
              type="number"
              min="1"
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
              className="w-24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endNumber">Número Final</Label>
            <Input
              id="endNumber"
              type="number"
              min="1"
              value={endNumber}
              onChange={(e) => setEndNumber(e.target.value)}
              className="w-24"
            />
          </div>
          
          <Button onClick={handleGenerateBatch} disabled={isGenerating}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar QR Codes ({Math.max(0, parseInt(endNumber || '0') - parseInt(startNumber || '0') + 1)})
          </Button>
          
          {tokens.length > 0 && (
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Todos ({tokens.length})
            </Button>
          )}
        </div>

        <ScrollArea className="h-[500px]">
          <div ref={printRef} className="qr-grid grid grid-cols-4 gap-3 p-2">
            {sortedTokens.map((token) => (
              <div key={token.id} className="qr-item flex flex-col items-center p-3 border rounded-lg">
                <div className="bg-white p-1 rounded">
                  <QRCodeSVG
                    value={
                      qrMode === 'menu'
                        ? `${baseUrl}/qr/comanda/${token.token}?mode=menu`
                        : `${baseUrl}/qr/comanda/${token.token}`
                    }
                    size={80}
                    level="H"
                  />
                </div>
                <h3 className="font-bold mt-1 text-sm">Comanda {token.comanda_number}</h3>
              </div>
            ))}
          </div>

          {tokens.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum QR Code gerado ainda. Defina o intervalo e clique em "Gerar QR Codes".
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
