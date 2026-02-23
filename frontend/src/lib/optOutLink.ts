/**
 * Gera o link de descadastramento (opt-out) para inclusão em mensagens de campanha
 * 
 * @param companyId - ID da empresa
 * @param customerId - ID do cliente
 * @param channel - Canal da campanha (whatsapp, sms, email)
 * @returns URL completa para descadastramento
 */
export function generateOptOutLink(
  companyId: string,
  customerId: string,
  channel: string = "whatsapp"
): string {
  // Usar a URL base do Vite ou fallback para a URL publicada
  const baseUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '') || "";
  
  return `${baseUrl}/optout?c=${customerId}&e=${companyId}&ch=${channel}`;
}

/**
 * Adiciona o link de descadastramento ao final de uma mensagem de campanha
 * 
 * @param message - Mensagem original
 * @param companyId - ID da empresa
 * @param customerId - ID do cliente
 * @param channel - Canal da campanha
 * @returns Mensagem com link de descadastramento
 */
export function appendOptOutLink(
  message: string,
  companyId: string,
  customerId: string,
  channel: string = "whatsapp"
): string {
  const optOutLink = generateOptOutLink(companyId, customerId, channel);
  const optOutText = `\n\n📵 Para não receber mais promoções: ${optOutLink}`;
  
  return message + optOutText;
}
