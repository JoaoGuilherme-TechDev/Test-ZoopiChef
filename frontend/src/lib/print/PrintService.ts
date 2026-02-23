import { Order } from '@/hooks/useOrders';
import { PrintSector, PrintMode } from '@/hooks/usePrintSectors';
import { PrintProvider, PrintResult, PrintProviderType } from './types';
import { BrowserPrintProvider } from './providers';
import { 
  isNetworkPrintServiceAvailable, 
  printTicketToNetwork, 
  createTicketFromOrder,
  testPrinterConnection 
} from './NetworkPrintService';
import { PrintFooterConfig } from './printFooter';

/**
 * Print Service
 * 
 * Central service for managing print providers and printing orders.
 * Supports multiple print providers and can be configured to use different ones.
 * 
 * Modos de impressão suportados:
 * - browser: Usa window.print (sempre disponível)
 * - network: Usa serviço local Node.js + impressora TCP/IP
 * - windows: (futuro) USB via agente local
 * 
 * Usage:
 * ```typescript
 * const printService = PrintService.getInstance();
 * const result = await printService.printOrder(order, 'Company Name');
 * // Or with sector config:
 * const result = await printService.printForSector(order, sector, items, 'Company Name');
 * ```
 */
export class PrintService {
  private static instance: PrintService;
  private providers: Map<string, PrintProvider> = new Map();
  private activeProviderId: string = 'browser';
  private networkServiceAvailable: boolean | null = null;
  private footerConfig: PrintFooterConfig | null = null;

  private constructor() {
    // Register default provider
    this.registerProvider(new BrowserPrintProvider());
    // Check network service availability on init
    this.checkNetworkService();
  }

  /**
   * Set the footer configuration for print tickets
   */
  setFooterConfig(footerConfig: PrintFooterConfig | null): void {
    this.footerConfig = footerConfig;
    // Update browser provider footer config
    const browserProvider = this.providers.get('browser') as BrowserPrintProvider | undefined;
    if (browserProvider && 'setFooterConfig' in browserProvider) {
      browserProvider.setFooterConfig(footerConfig);
    }
  }

  /**
   * Get current footer configuration
   */
  getFooterConfig(): PrintFooterConfig | null {
    return this.footerConfig;
  }

  static getInstance(): PrintService {
    if (!PrintService.instance) {
      PrintService.instance = new PrintService();
    }
    return PrintService.instance;
  }

  /**
   * Check if local network print service is running
   */
  private async checkNetworkService(): Promise<void> {
    this.networkServiceAvailable = await isNetworkPrintServiceAvailable();
    console.log(`[PrintService] Network service available: ${this.networkServiceAvailable}`);
  }

  /**
   * Get network service status
   */
  async isNetworkServiceAvailable(): Promise<boolean> {
    if (this.networkServiceAvailable === null) {
      await this.checkNetworkService();
    }
    return this.networkServiceAvailable || false;
  }

  /**
   * Refresh network service status
   */
  async refreshNetworkServiceStatus(): Promise<boolean> {
    await this.checkNetworkService();
    return this.networkServiceAvailable || false;
  }

  /**
   * Test connection to a network printer
   */
  async testNetworkPrinter(host: string, port: number = 9100): Promise<{ success: boolean; message?: string; error?: string }> {
    return testPrinterConnection(host, port);
  }

  /**
   * Register a new print provider
   */
  registerProvider(provider: PrintProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Get all registered providers
   */
  getProviders(): PrintProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get available providers (ones that can work in current environment)
   */
  getAvailableProviders(): PrintProvider[] {
    return this.getProviders().filter(p => p.isAvailable());
  }

  /**
   * Get a specific provider by ID
   */
  getProvider(id: string): PrintProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get the currently active provider
   */
  getActiveProvider(): PrintProvider | undefined {
    return this.providers.get(this.activeProviderId);
  }

  /**
   * Set the active print provider
   */
  setActiveProvider(id: string): boolean {
    const provider = this.providers.get(id);
    if (provider && provider.isAvailable()) {
      this.activeProviderId = id;
      return true;
    }
    return false;
  }

  /**
   * Print an order using the active provider
   */
  async printOrder(order: Order, companyName?: string): Promise<PrintResult> {
    const provider = this.getActiveProvider();
    
    if (!provider) {
      return {
        success: false,
        error: 'Nenhuma impressora configurada',
      };
    }

    if (!provider.isAvailable()) {
      return {
        success: false,
        error: `Impressora "${provider.name}" não está disponível`,
      };
    }

    return provider.printOrder(order, companyName);
  }

  /**
   * Print order items for a specific sector, using sector's printer configuration
   */
  async printForSector(
    order: Order,
    sector: PrintSector,
    items: Order['items'],
    companyName?: string
  ): Promise<PrintResult> {
    const mode = sector.print_mode || 'browser';

    console.log(`[PrintService] Printing for sector "${sector.name}" with mode: ${mode}`);
    
    // =====================
    // NETWORK PRINTER (TCP/IP)
    // =====================
    if (mode === 'network' && sector.printer_host) {
      console.log(`[PrintService] Network printer: ${sector.printer_host}:${sector.printer_port}`);
      
      // Check if network service is available
      const serviceAvailable = await this.isNetworkServiceAvailable();
      
      if (serviceAvailable) {
        // Create ticket from order
        const ticket = createTicketFromOrder(
          {
            id: order.id,
            order_type: order.order_type,
            customer_name: order.customer_name || undefined,
            table_name: order.table_number || undefined, // Order uses table_number
            notes: order.notes || undefined,
            created_at: order.created_at,
            items: items.map(item => ({
              product_name: item.product_name,
              quantity: item.quantity,
              notes: item.notes || undefined,
              // OrderItem doesn't have selected_options in this interface
              selected_options: undefined,
            })),
          },
          sector.name
        );

        // Print to network
        const result = await printTicketToNetwork(ticket, {
          host: sector.printer_host,
          port: sector.printer_port || 9100,
          copies: 1,
          beep: true,
        });

        if (result.success) {
          return {
            success: true,
            printedAt: new Date(),
          };
        } else {
          console.warn(`[PrintService] Network print failed: ${result.error}, falling back to browser`);
          // Fall through to browser printing
        }
      } else {
        console.warn('[PrintService] Network service not available, falling back to browser');
      }
    }
    
    // =====================
    // WINDOWS USB (futuro)
    // =====================
    if (mode === 'windows') {
      console.log(`[PrintService] Windows USB printer: ${sector.printer_name} (not implemented, using browser)`);
      // TODO: Implementar quando houver agente local Windows
    }

    // =====================
    // BROWSER (fallback)
    // =====================
    const provider = this.getActiveProvider();
    if (!provider) {
      return { success: false, error: 'Nenhuma impressora configurada' };
    }

    // Create a temporary order with only the sector's items
    const sectorOrder: Order = {
      ...order,
      items,
    };

    return provider.printOrder(sectorOrder, companyName);
  }

  /**
   * Get print mode label for display
   */
  static getPrintModeLabel(mode: PrintMode | null | undefined): string {
    switch (mode) {
      case 'windows': return 'Windows USB';
      case 'network': return 'Rede TCP/IP';
      case 'browser':
      default:
        return 'Navegador';
    }
  }

  /**
   * Test the connection to the active provider
   */
  async testConnection(): Promise<boolean> {
    const provider = this.getActiveProvider();
    
    if (!provider) {
      return false;
    }

    if (provider.testConnection) {
      return provider.testConnection();
    }

    // Default: assume available means connected
    return provider.isAvailable();
  }
}

// Export singleton getter for convenience
export const getPrintService = () => PrintService.getInstance();
