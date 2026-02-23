/**
 * UniversalQRCodeSection - Single QR Code per Restaurant
 * 
 * This component generates ONE universal QR code per restaurant that:
 * - Contains ONLY the restaurant slug
 * - Works for ALL PWA apps (Totem, Tablet, Garçom, Entregador, PDV, Terminal)
 * - Directs to /access/:slug where user chooses the app
 * 
 * This is the PRIMARY QR code for restaurant operations.
 */

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useCompany } from '@/hooks/useCompany';
import { 
  QrCode, 
  Printer, 
  Download, 
  Copy, 
  ExternalLink,
  Store,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export function UniversalQRCodeSection() {
  const { data: company } = useCompany();
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!company?.slug) {
    return (
      <Card className="border-border/50 shadow-soft border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">QR Code Universal</CardTitle>
              <CardDescription>Configure o slug da empresa primeiro</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Defina um slug único para sua empresa em <strong>Ajustes → Empresa</strong> para gerar o QR Code.
          </p>
        </CardContent>
      </Card>
    );
  }

  const accessUrl = `${window.location.origin}/access/${company.slug}`;
  const qrCodeValue = company.slug; // QR contains ONLY the slug text

  const copyUrl = () => {
    navigator.clipboard.writeText(accessUrl);
    toast.success('Link copiado!');
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${company.name}</title>
          <style>
            @page {
              size: A4;
              margin: 2cm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 2rem;
              background: white;
            }
            .container {
              text-align: center;
              max-width: 500px;
            }
            .header {
              margin-bottom: 2rem;
            }
            .restaurant-name {
              font-size: 2.5rem;
              font-weight: bold;
              color: #1a1a1a;
              margin-bottom: 0.5rem;
            }
            .qr-wrapper {
              padding: 2.5rem;
              background: white;
              border: 6px solid #000;
              border-radius: 24px;
              margin: 2rem auto;
              display: inline-block;
            }
            .qr-wrapper svg {
              display: block;
            }
            .slug {
              display: inline-block;
              padding: 0.75rem 1.5rem;
              background: #f0f0f0;
              border-radius: 12px;
              font-family: monospace;
              font-size: 1.5rem;
              font-weight: bold;
              color: #333;
              margin-top: 1.5rem;
            }
            .instructions {
              margin-top: 2rem;
              font-size: 1.25rem;
              color: #666;
              line-height: 1.6;
            }
            .instructions strong {
              color: #333;
            }
            .features {
              margin-top: 2rem;
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 0.75rem;
            }
            .feature {
              padding: 0.5rem 1rem;
              background: #e8f4ff;
              border-radius: 20px;
              font-size: 0.9rem;
              color: #0066cc;
            }
            .powered {
              margin-top: 3rem;
              font-size: 0.875rem;
              color: #999;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="restaurant-name">${company.name}</div>
            </div>
            <div class="qr-wrapper">
              ${content.querySelector('svg')?.outerHTML || ''}
            </div>
            <div class="slug">${company.slug}</div>
            <p class="instructions">
              Escaneie o QR Code com a câmera do seu celular<br/>
              para <strong>fazer pedidos</strong>, <strong>ver o cardápio</strong> e muito mais!
            </p>
            <div class="features">
              <span class="feature">📱 Totem</span>
              <span class="feature">📋 Tablet</span>
              <span class="feature">🍽️ Garçom</span>
              <span class="feature">🚴 Entregador</span>
            </div>
            <p class="powered">Powered by Zoopi</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    const svg = printRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const link = document.createElement('a');
      link.download = `qrcode-${company.slug}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR Code baixado!');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <>
      <Card className="border-border/50 shadow-soft border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center relative">
              <QrCode className="w-6 h-6 text-primary" />
              <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">QR Code Universal</CardTitle>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                  ÚNICO
                </Badge>
              </div>
              <CardDescription>
                Um código para todos os aplicativos do seu restaurante
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* QR Code Preview */}
          <div className="flex flex-col items-center" ref={printRef}>
            <div className="p-6 bg-white rounded-2xl border-2 shadow-sm">
              <QRCodeSVG 
                value={qrCodeValue}
                size={200}
                level="H"
                includeMargin
              />
            </div>
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Store className="w-5 h-5 text-primary" />
                <span className="font-bold text-lg">{company.name}</span>
              </div>
              <Badge variant="outline" className="font-mono text-sm">
                {company.slug}
              </Badge>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '📱', text: 'Totem' },
              { icon: '📋', text: 'Tablet' },
              { icon: '🍽️', text: 'Garçom' },
              { icon: '🚴', text: 'Entregador' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <span>{item.icon}</span>
                <span>{item.text}</span>
                <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />
              </div>
            ))}
          </div>

          <Separator />

          {/* URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Link Universal</label>
            <div className="flex items-center gap-2">
              <Input 
                readOnly 
                value={accessUrl}
                className="font-mono text-sm bg-muted/50"
              />
              <Button variant="outline" size="icon" onClick={copyUrl} title="Copiar link">
                <Copy className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => window.open(accessUrl, '_blank')}
                title="Abrir em nova aba"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={() => setShowPrintDialog(true)} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir A4
            </Button>
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Baixar PNG
            </Button>
          </div>

          {/* Info */}
          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              💡 <strong>Dica:</strong> Imprima este QR Code e coloque na entrada do estabelecimento, 
              nas mesas, ou em cartazes. Clientes e funcionários podem escanear e escolher qual app usar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Print Dialog */}
      {showPrintDialog && (
        <Dialog open onOpenChange={() => setShowPrintDialog(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                Imprimir QR Code Universal
              </DialogTitle>
              <DialogDescription>
                Imprima em tamanho A4 para exibir no estabelecimento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Preview */}
              <div className="flex flex-col items-center p-8 bg-white rounded-xl border-2">
                <QRCodeSVG 
                  value={qrCodeValue}
                  size={250}
                  level="H"
                  includeMargin
                />
                <div className="mt-4 text-center">
                  <div className="font-bold text-xl text-foreground">{company.name}</div>
                  <Badge variant="outline" className="mt-2 font-mono">
                    {company.slug}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handlePrint} className="flex-1">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button onClick={handleDownload} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PNG
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
