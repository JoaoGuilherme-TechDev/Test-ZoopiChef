import { QRCodeSVG } from "qrcode.react";
import { QrCode, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LinksHeaderProps {
  companySlug: string;
  publicUrl: string;
  logoUrl?: string | null;
  isGenerating: boolean;
  onGenerateLinks: () => void;
}

export function LinksHeader({ 
  companySlug, 
  publicUrl, 
  logoUrl, 
  isGenerating, 
  onGenerateLinks 
}: LinksHeaderProps) {
  return (
    <Card className="border-none shadow-2xl bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <QrCode size={120} />
      </div>
      <CardContent className="p-8 sm:p-12">
        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* QR Code Wrapper */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-xl group-hover:bg-primary/30 transition-all duration-500 opacity-0 group-hover:opacity-100" />
            <div className="relative bg-white p-6 rounded-2xl shadow-xl border border-primary/10">
              <QRCodeSVG 
                value={publicUrl}
                size={160}
                level="H"
                includeMargin={false}
                imageSettings={logoUrl ? {
                  src: logoUrl,
                  x: undefined,
                  y: undefined,
                  height: 32,
                  width: 32,
                  excavate: true,
                } : undefined}
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest w-fit mx-auto md:mx-0">
              <Globe className="h-3 w-3" /> Sua Identidade Digital
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter uppercase">
              {companySlug}
            </h2>
            <p className="text-muted-foreground text-sm font-medium max-w-md">
              Este é o seu slug exclusivo. Todos os seus links de atendimento e vendas são gerados a partir dele.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 justify-center md:justify-start">
              <Button 
                onClick={onGenerateLinks}
                disabled={isGenerating}
                className="h-12 px-8 rounded-xl font-black uppercase tracking-widest gap-2 bg-primary hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Gerar Links
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
