/**
 * Protocolos de comunicação para diferentes modelos de balança
 * Cada fabricante tem seu próprio formato de envio de dados
 */

// Formato típico Toledo Prix III: STX + dados + ETX + checksum
// Exemplo: 02 30 30 2E 35 30 30 03 (= "00.500" kg)

export interface ScaleReading {
  weight: number;      // Peso em kg
  stable: boolean;     // Se a leitura está estável
  unit: 'kg' | 'g';    // Unidade
  raw: string;         // Dados brutos recebidos
  error?: string;      // Erro de leitura
}

export interface ScaleProtocol {
  name: string;
  description: string;
  // Comando para solicitar peso (se necessário)
  requestWeightCommand?: Uint8Array;
  // Parser para interpretar os dados recebidos
  parseResponse: (data: Uint8Array) => ScaleReading | null;
}

// Caracteres de controle
const STX = 0x02; // Start of Text
const ETX = 0x03; // End of Text
const ENQ = 0x05; // Enquiry (solicita peso)
const ACK = 0x06; // Acknowledge
const LF = 0x0A;  // Line Feed
const CR = 0x0D;  // Carriage Return

/**
 * Protocolo Toledo Prix III / Prix 4 / Prix 5
 * Formato: [STX] [peso em ASCII com 6 dígitos] [unidade] [status] [ETX]
 * Exemplo: STX 0 0 0 5 0 0 K S ETX = 00.500 kg estável
 */
const toledoPrixProtocol: ScaleProtocol = {
  name: 'Toledo Prix',
  description: 'Toledo Prix III, Prix 4, Prix 5, Prix Due',
  requestWeightCommand: new Uint8Array([ENQ]), // ENQ para solicitar peso
  parseResponse: (data: Uint8Array) => {
    try {
      // Converter para string
      const text = new TextDecoder().decode(data).trim();
      
      // Remover caracteres de controle
      const cleanText = text.replace(/[\x00-\x1F\x7F]/g, '').trim();
      
      if (!cleanText) return null;
      
      // Tentar extrair peso do texto
      // Formato comum: "00.500" ou "00,500" ou "  0.500"
      const match = cleanText.match(/(\d+[.,]\d+)/);
      if (match) {
        const weight = parseFloat(match[1].replace(',', '.'));
        return {
          weight,
          stable: true, // Assumir estável se recebeu resposta
          unit: 'kg',
          raw: text,
        };
      }
      
      return null;
    } catch (e) {
      return { weight: 0, stable: false, unit: 'kg', raw: '', error: String(e) };
    }
  },
};

/**
 * Protocolo Filizola
 * Formato: [peso][CR][LF] ou similar
 */
const filizolaProtocol: ScaleProtocol = {
  name: 'Filizola',
  description: 'Filizola BP, Platina, etc',
  requestWeightCommand: new Uint8Array([ENQ]),
  parseResponse: (data: Uint8Array) => {
    try {
      const text = new TextDecoder().decode(data).trim();
      const cleanText = text.replace(/[\x00-\x1F\x7F]/g, '').trim();
      
      const match = cleanText.match(/(\d+[.,]\d+)/);
      if (match) {
        return {
          weight: parseFloat(match[1].replace(',', '.')),
          stable: true,
          unit: 'kg',
          raw: text,
        };
      }
      return null;
    } catch (e) {
      return { weight: 0, stable: false, unit: 'kg', raw: '', error: String(e) };
    }
  },
};

/**
 * Protocolo Urano
 * Similar ao Toledo
 */
const uranoProtocol: ScaleProtocol = {
  name: 'Urano',
  description: 'Urano POP-S, US, etc',
  requestWeightCommand: new Uint8Array([0x50]), // 'P' para peso
  parseResponse: (data: Uint8Array) => {
    try {
      const text = new TextDecoder().decode(data).trim();
      const cleanText = text.replace(/[\x00-\x1F\x7F]/g, '').trim();
      
      const match = cleanText.match(/(\d+[.,]\d+)/);
      if (match) {
        return {
          weight: parseFloat(match[1].replace(',', '.')),
          stable: true,
          unit: 'kg',
          raw: text,
        };
      }
      return null;
    } catch (e) {
      return { weight: 0, stable: false, unit: 'kg', raw: '', error: String(e) };
    }
  },
};

/**
 * Protocolo Genérico
 * Tenta extrair peso de qualquer formato de texto
 */
const genericProtocol: ScaleProtocol = {
  name: 'Genérico',
  description: 'Protocolo genérico para balanças não listadas',
  requestWeightCommand: new Uint8Array([ENQ]),
  parseResponse: (data: Uint8Array) => {
    try {
      const text = new TextDecoder().decode(data).trim();
      const cleanText = text.replace(/[\x00-\x1F\x7F]/g, '').trim();
      
      // Tentar vários formatos
      const patterns = [
        /(\d+[.,]\d+)\s*[kK][gG]/, // "1.234 kg"
        /(\d+[.,]\d+)\s*[gG]/,     // "1234.5 g"
        /(\d+[.,]\d+)/,            // "1.234" qualquer número decimal
      ];
      
      for (const pattern of patterns) {
        const match = cleanText.match(pattern);
        if (match) {
          let weight = parseFloat(match[1].replace(',', '.'));
          let unit: 'kg' | 'g' = 'kg';
          
          // Se parece ser gramas, converter
          if (cleanText.toLowerCase().includes('g') && !cleanText.toLowerCase().includes('kg')) {
            weight = weight / 1000;
            unit = 'g';
          }
          
          return { weight, stable: true, unit, raw: text };
        }
      }
      return null;
    } catch (e) {
      return { weight: 0, stable: false, unit: 'kg', raw: '', error: String(e) };
    }
  },
};

// Mapa de modelos para protocolos
export const SCALE_PROTOCOLS: Record<string, ScaleProtocol> = {
  'toledo_prix_iii': toledoPrixProtocol,
  'toledo_prix_4': toledoPrixProtocol,
  'toledo_prix_5': toledoPrixProtocol,
  'toledo_prix_due': toledoPrixProtocol,
  'filizola_bp': filizolaProtocol,
  'filizola_platina': filizolaProtocol,
  'urano_pop_s': uranoProtocol,
  'urano_us': uranoProtocol,
  'generic': genericProtocol,
};

export function getProtocolForModel(model: string): ScaleProtocol {
  return SCALE_PROTOCOLS[model] || genericProtocol;
}
