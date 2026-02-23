import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Loader2, QrCode, Menu } from 'lucide-react';
import { useTableQRTokens } from '@/hooks/useTableQRTokens';
import { useTableModuleSettings } from '@/hooks/useTableModuleSettings';
import { toast } from 'sonner';
import { Table } from '@/hooks/useTables';

interface TableQRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table;
}

export function TableQRCodeDialog({ open, onOpenChange, table }: TableQRCodeDialogProps) {
  const [activeTab, setActiveTab] = useState<'order' | 'menu'>('order');
  const qrRef = useRef<HTMLDivElement>(null);
  const { getTokenForTable, generateToken } = useTableQRTokens();
  const { settings } = useTableModuleSettings();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Se estiver em "apenas cardápio", força a aba e bloqueia o modo de pedido
    setActiveTab(settings.enable_qr_menu_only ? 'menu' : 'order');
  }, [settings.enable_qr_menu_only]);

  const token = getTokenForTable(table.id);

  const baseUrl = window.location.origin;
  const orderUrl = token ? `${baseUrl}/qr/mesa/${token.token}` : '';
  const menuUrl = token ? `${baseUrl}/qr/mesa/${token.token}?mode=menu` : '';
  const currentUrl = activeTab === 'order' ? orderUrl : menuUrl;

  const handleGenerateToken = async () => {
    setIsGenerating(true);
    try {
      await generateToken.mutateAsync(table.id);
      toast.success('QR Code gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar QR Code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    canvas.width = 400;
    canvas.height = 400;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const a = document.createElement('a');
        a.download = `mesa-${table.number}-qrcode.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code - Mesa {table.number}
            {table.name && <span className="text-muted-foreground font-normal">({table.name})</span>}
          </DialogTitle>
        </DialogHeader>

        {!token ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-muted-foreground text-center">
              Nenhum QR Code gerado para esta mesa.
            </p>
            <Button onClick={handleGenerateToken} disabled={isGenerating}>
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar QR Code
            </Button>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'order' | 'menu')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="order" disabled={!settings.enable_qr_ordering || settings.enable_qr_menu_only}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Fazer Pedido
                </TabsTrigger>
                <TabsTrigger value="menu">
                  <Menu className="mr-2 h-4 w-4" />
                  Apenas Cardápio
                </TabsTrigger>
              </TabsList>

              <TabsContent value="order" className="mt-4">
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Cliente pode visualizar cardápio e fazer pedidos
                </p>
              </TabsContent>

              <TabsContent value="menu" className="mt-4">
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Cliente pode apenas visualizar o cardápio
                </p>
              </TabsContent>
            </Tabs>

            <div ref={qrRef} className="flex flex-col items-center gap-4 py-4">
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG
                  value={currentUrl}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              
              <div className="text-center">
                <p className="font-bold text-lg">Mesa {table.number}</p>
                {table.name && <p className="text-muted-foreground">{table.name}</p>}
              </div>

              <p className="text-xs text-muted-foreground break-all text-center max-w-[250px]">
                {currentUrl}
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Baixar PNG
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
