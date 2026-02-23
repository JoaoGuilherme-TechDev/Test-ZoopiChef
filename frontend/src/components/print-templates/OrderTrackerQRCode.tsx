/**
 * OrderTrackerQRCode - Componente de QR Code para acompanhamento de pedido
 * 
 * Usado para gerar QR code nos tickets impressos que permite
 * ao cliente acompanhar o status do pedido em tempo real.
 */

import { QRCodeSVG } from 'qrcode.react';

interface OrderTrackerQRCodeProps {
  orderId: string;
  size?: number;
  includeText?: boolean;
  className?: string;
}

// URL base do app - usamos window.location.origin para pegar a URL atual
function getTrackerUrl(orderId: string): string {
  // Em produção, usar a URL publicada
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://tenant-base-forge.lovable.app';
  
  return `${baseUrl}/acompanhar/${orderId}`;
}

export function OrderTrackerQRCode({ 
  orderId, 
  size = 80, 
  includeText = true,
  className = ''
}: OrderTrackerQRCodeProps) {
  const trackerUrl = getTrackerUrl(orderId);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <QRCodeSVG
        value={trackerUrl}
        size={size}
        level="M"
        bgColor="white"
        fgColor="black"
        includeMargin={false}
      />
      {includeText && (
        <p className="text-[8px] text-center text-gray-500 mt-1 max-w-[100px] leading-tight">
          Escaneie para acompanhar seu pedido
        </p>
      )}
    </div>
  );
}

/**
 * Gera a URL de acompanhamento para uso em impressão
 */
export function getOrderTrackerUrl(orderId: string): string {
  return getTrackerUrl(orderId);
}

/**
 * Hook helper para usar em componentes de impressão
 */
export function useOrderTrackerQR(orderId: string) {
  return {
    url: getTrackerUrl(orderId),
    qrValue: getTrackerUrl(orderId),
  };
}

export default OrderTrackerQRCode;
