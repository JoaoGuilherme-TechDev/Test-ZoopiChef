/**
 * Network Print Service
 * 
 * Conecta ao serviço local de impressão (Node.js) para enviar
 * comandos de impressão para impressoras TCP/IP de rede.
 */

const LOCAL_PRINT_SERVICE_URLS = [
  // Prefer HTTPS to avoid Mixed Content when the app is loaded over HTTPS.
  'https://127.0.0.1:3848',
  'https://localhost:3848',
  'https://127.0.0.1:3849',
  'https://localhost:3849',
  'https://127.0.0.1:3850',
  'https://localhost:3850',
  'https://127.0.0.1:3851',
  'https://localhost:3851',
  'https://127.0.0.1:3852',
  'https://localhost:3852',

  'https://127.0.0.1:3847', // compatibilidade com versões antigas do agente
  'https://localhost:3847',

  // Fallback to HTTP for local/dev or browsers allowing it.
  'http://127.0.0.1:3848',
  'http://localhost:3848',
  'http://127.0.0.1:3849',
  'http://localhost:3849',
  'http://127.0.0.1:3850',
  'http://localhost:3850',
  'http://127.0.0.1:3851',
  'http://localhost:3851',
  'http://127.0.0.1:3852',
  'http://localhost:3852',

  'http://127.0.0.1:3847',
  'http://localhost:3847',
];

let cachedServiceUrl: string | null = null;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 8000
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getAvailableServiceUrl(): Promise<string | null> {
  // Se já encontramos um URL funcionando, tenta ele primeiro.
  const candidates = cachedServiceUrl
    ? [cachedServiceUrl, ...LOCAL_PRINT_SERVICE_URLS.filter((u) => u !== cachedServiceUrl)]
    : LOCAL_PRINT_SERVICE_URLS;

  for (const baseUrl of candidates) {
    try {
      // 1.5s estava abortando em máquinas mais lentas / primeiro acesso ao certificado.
      const res = await fetchWithTimeout(`${baseUrl}/health`, { method: 'GET' }, 6000);
      if (res.ok) {
        cachedServiceUrl = baseUrl;
        return baseUrl;
      }
    } catch {
      // tenta o próximo
    }
  }

  return null;
}

export interface NetworkPrintOptions {
  host: string;
  port?: number;
  copies?: number;
  cut?: boolean;
  beep?: boolean;
}

export interface PrintTicket {
  orderNumber: string;
  orderId?: string;
  orderType?: string;
  items: {
    name: string;
    quantity: number;
    options?: string[];
    notes?: string;
  }[];
  customerName?: string;
  tableName?: string;
  notes?: string;
  createdAt?: string;
  sectorName?: string;
  companyName?: string;
  delivererName?: string;
  delivererCode?: string;
}

export interface PrintResult {
  success: boolean;
  message?: string;
  error?: string;
  printedAt?: string;
}

/**
 * Verifica se o serviço local de impressão está disponível
 */
export async function isNetworkPrintServiceAvailable(): Promise<boolean> {
  const baseUrl = await getAvailableServiceUrl();
  return Boolean(baseUrl);
}

/**
 * Testa conexão com uma impressora específica
 */
export async function testPrinterConnection(
  host: string,
  port: number = 9100
): Promise<PrintResult> {
  const baseUrl = await getAvailableServiceUrl();
  if (!baseUrl) {
    return {
      success: false,
      error:
        'Serviço de impressão não está rodando. Inicie o Zoopi Print Service (porta 3848 ou 3847).',
    };
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/test-connection`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port }),
      },
      5000
    );

    const result = await response.json();
    return result;
  } catch {
    return {
      success: false,
      error:
        'Serviço de impressão não está rodando. Inicie o Zoopi Print Service (porta 3848 ou 3847).',
    };
  }
}

/**
 * Imprime texto raw em uma impressora de rede
 */
export async function printToNetwork(
  content: string,
  options: NetworkPrintOptions
): Promise<PrintResult> {
  const { host, port = 9100, copies = 1, cut = true, beep = false } = options;

  const baseUrl = await getAvailableServiceUrl();
  if (!baseUrl) {
    return {
      success: false,
      error:
        'Serviço de impressão não está rodando. Inicie o Zoopi Print Service (porta 3848 ou 3847).',
    };
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/print`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port,
          content,
          copies,
          cut,
          beep,
        }),
      },
      10000
    );

    const result = await response.json();
    return result;
  } catch {
    return {
      success: false,
      error:
        'Serviço de impressão não está rodando. Inicie o Zoopi Print Service (porta 3848 ou 3847).',
    };
  }
}

/**
 * Imprime um ticket formatado (para cozinha)
 */
export async function printTicketToNetwork(
  ticket: PrintTicket,
  options: NetworkPrintOptions
): Promise<PrintResult> {
  const { host, port = 9100, copies = 1, beep = true } = options;

  const baseUrl = await getAvailableServiceUrl();
  if (!baseUrl) {
    return {
      success: false,
      error:
        'Serviço de impressão não está rodando. Inicie o Zoopi Print Service (porta 3848 ou 3847).',
    };
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/print-ticket`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port,
          ticket,
          copies,
          beep,
        }),
      },
      10000
    );

    const result = await response.json();
    return result;
  } catch {
    return {
      success: false,
      error:
        'Serviço de impressão não está rodando. Inicie o Zoopi Print Service (porta 3848 ou 3847).',
    };
  }
}

/**
 * Cria um ticket formatado a partir de um pedido
 */
export function createTicketFromOrder(
  order: {
    id: string;
    order_type?: string;
    customer_name?: string;
    table_name?: string;
    notes?: string;
    created_at?: string;
    items?: {
      product_name: string;
      quantity: number;
      notes?: string;
      selected_options?: { name: string }[];
    }[];
    deliverer_id?: string;
    deliverer?: {
      name?: string;
    } | null;
  },
  sectorName?: string,
  companyName?: string
): PrintTicket {
  return {
    orderNumber: order.id.slice(0, 8).toUpperCase(),
    orderId: order.id,
    orderType: order.order_type === 'delivery' ? 'DELIVERY' :
               order.order_type === 'counter' ? 'BALCÃO' :
               order.order_type === 'table' ? 'MESA' : undefined,
    items: (order.items || []).map(item => ({
      name: item.product_name,
      quantity: item.quantity,
      options: item.selected_options?.map(opt => opt.name),
      notes: item.notes || undefined,
    })),
    customerName: order.customer_name || undefined,
    tableName: order.table_name || undefined,
    notes: order.notes || undefined,
    createdAt: order.created_at,
    sectorName,
    companyName,
    delivererName: order.deliverer?.name || undefined,
    // Generate barcode payload: ORDER:<first 8 chars of UUID>
    delivererCode: order.id ? `ORDER:${order.id.slice(0, 8).toUpperCase()}` : undefined,
  };
}
