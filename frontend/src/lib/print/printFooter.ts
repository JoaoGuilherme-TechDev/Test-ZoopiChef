/**
 * Print Footer Configuration
 * 
 * Utility to manage print footer settings per company
 */

export interface PrintFooterConfig {
  site: string;
  phone: string;
}

const DEFAULT_FOOTER: PrintFooterConfig = {
  site: 'www.zoopi.app.br',
  phone: '(16) 98258.6199',
};

/**
 * Format the print footer text
 */
export function formatPrintFooter(config?: PrintFooterConfig | null): string {
  const site = config?.site || DEFAULT_FOOTER.site;
  const phone = config?.phone || DEFAULT_FOOTER.phone;
  return `${site} / Tel ${phone}`;
}

/**
 * Get print footer from company data
 */
export function getPrintFooterFromCompany(company: { 
  print_footer_site?: string | null; 
  print_footer_phone?: string | null; 
} | null | undefined): string {
  if (!company) {
    return formatPrintFooter(DEFAULT_FOOTER);
  }
  
  return formatPrintFooter({
    site: company.print_footer_site || DEFAULT_FOOTER.site,
    phone: company.print_footer_phone || DEFAULT_FOOTER.phone,
  });
}

export { DEFAULT_FOOTER };
