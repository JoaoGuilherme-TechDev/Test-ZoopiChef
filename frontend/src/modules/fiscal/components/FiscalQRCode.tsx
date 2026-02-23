import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';

interface FiscalQRCodeProps {
  accessKey: string;
  environment?: 'production' | 'homologation';
  size?: number;
}

// Gera a URL do QR Code conforme padrão SEFAZ para NFC-e
export function generateNFCeQRCodeUrl(accessKey: string, environment: 'production' | 'homologation' = 'production'): string {
  // A URL varia por estado - este é um exemplo genérico
  // Em produção, deve-se usar a URL correta do estado
  const baseUrl = environment === 'production'
    ? 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx'
    : 'https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx';
  
  return `${baseUrl}?chNFe=${accessKey}`;
}

export function FiscalQRCode({ accessKey, environment = 'production', size = 150 }: FiscalQRCodeProps) {
  const qrCodeUrl = generateNFCeQRCodeUrl(accessKey, environment);

  return (
    <div className="flex flex-col items-center gap-2">
      <QRCodeSVG 
        value={qrCodeUrl} 
        size={size}
        level="M"
        includeMargin
      />
      <p className="text-xs text-muted-foreground text-center max-w-[200px]">
        Consulte pela chave de acesso
      </p>
      <p className="text-[10px] font-mono text-muted-foreground break-all max-w-[200px] text-center">
        {accessKey}
      </p>
    </div>
  );
}

// Componente para impressão do cupom fiscal com QR Code
export function FiscalReceiptQRCode({ document }: { document: { access_key: string; number: number; total_cents: number; created_at: string; recipient_name: string } }) {
  return (
    <Card className="max-w-[280px] mx-auto">
      <CardContent className="p-4 text-center">
        <h3 className="font-bold text-lg mb-2">DOCUMENTO FISCAL</h3>
        <div className="border-t border-b py-2 my-2">
          <p className="text-sm">NFC-e Nº {document.number}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(document.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        
        <p className="text-sm mb-1">{document.recipient_name}</p>
        <p className="text-xl font-bold mb-4">
          {(document.total_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
        
        <div className="flex justify-center">
          <FiscalQRCode accessKey={document.access_key} size={120} />
        </div>
        
        <p className="text-[8px] mt-2 text-muted-foreground">
          Consulte a autenticidade em www.nfce.fazenda.sp.gov.br
        </p>
      </CardContent>
    </Card>
  );
}
