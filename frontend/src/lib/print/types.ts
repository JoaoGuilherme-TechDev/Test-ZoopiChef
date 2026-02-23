import { Order } from '@/hooks/useOrders';

/**
 * Print Provider Interface
 * 
 * Defines the contract for print implementations.
 * Current implementation: BrowserPrint (window.print)
 * Future implementations: ThermalPrint, NetworkPrint, BluetoothPrint
 */
export interface PrintProvider {
  /** Unique identifier for the print provider */
  readonly id: string;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Check if this provider is available in the current environment */
  isAvailable(): boolean;
  
  /** Print an order */
  printOrder(order: Order, companyName?: string): Promise<PrintResult>;
  
  /** Optional: Test the printer connection */
  testConnection?(): Promise<boolean>;
  
  /** Optional: Configure the printer */
  configure?(config: PrintConfig): void;
}

export interface PrintResult {
  success: boolean;
  error?: string;
  printedAt?: Date;
}

export interface PrintConfig {
  /** Paper width in mm (typically 58mm or 80mm for thermal) */
  paperWidth?: number;
  
  /** Printer IP address for network printers */
  printerIp?: string;
  
  /** Printer port for network printers */
  printerPort?: number;
  
  /** Bluetooth device ID */
  bluetoothDeviceId?: string;
  
  /** Number of copies to print */
  copies?: number;
  
  /** Auto-cut paper after printing (thermal) */
  autoCut?: boolean;
  
  /** Custom configuration for specific providers */
  [key: string]: unknown;
}

export type PrintProviderType = 'browser' | 'thermal' | 'network' | 'bluetooth';
