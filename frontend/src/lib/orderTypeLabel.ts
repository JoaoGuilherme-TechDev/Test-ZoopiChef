/**
 * Determina o label visual do tipo de pedido
 * baseado em order_type e source
 * 
 * Online = delivery + source online
 * Online Ligação = delivery + source phone
 * Retira = local (retirada na loja)
 * Balcão = counter
 */
export interface OrderTypeInfo {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: 'globe' | 'phone' | 'store' | 'package' | 'utensils';
}

export function getOrderTypeLabel(
  orderType: string,
  source?: string | null,
  eatHere?: boolean | null
): OrderTypeInfo {
  // TOTEM - pedidos vindos do kiosk/totem de autoatendimento
  if (source === 'kiosk') {
    if (eatHere) {
      return {
        label: 'TOTEM - COMER AQUI',
        shortLabel: 'TOTEM',
        color: 'bg-indigo-600',
        bgColor: '#4f46e5',
        textColor: '#fff',
        icon: 'store',
      };
    }
    return {
      label: 'TOTEM - LEVAR',
      shortLabel: 'TOTEM',
      color: 'bg-indigo-600',
      bgColor: '#4f46e5',
      textColor: '#fff',
      icon: 'store',
    };
  }

  // Comer Aqui (balcão com eat_here = true)
  if (orderType === 'counter' && eatHere) {
    return {
      label: 'COMER AQUI',
      shortLabel: 'COMER AQUI',
      color: 'bg-orange-600',
      bgColor: '#ea580c',
      textColor: '#fff',
      icon: 'utensils',
    };
  }

  // Balcão (counter) - levar
  if (orderType === 'counter') {
    return {
      label: 'BALCÃO',
      shortLabel: 'BALCÃO',
      color: 'bg-amber-500',
      bgColor: '#f59e0b',
      textColor: '#000',
      icon: 'package',
    };
  }

  // Retirada (local)
  if (orderType === 'local') {
    return {
      label: 'RETIRA',
      shortLabel: 'RETIRA',
      color: 'bg-cyan-500',
      bgColor: '#06b6d4',
      textColor: '#000',
      icon: 'store',
    };
  }

  // Delivery - via telefone
  if (orderType === 'delivery' && source === 'phone') {
    return {
      label: 'ONLINE LIGAÇÃO',
      shortLabel: 'LIGAÇÃO',
      color: 'bg-violet-500',
      bgColor: '#8b5cf6',
      textColor: '#fff',
      icon: 'phone',
    };
  }

  // Delivery - online (padrão)
  if (orderType === 'delivery') {
    return {
      label: 'ONLINE',
      shortLabel: 'ONLINE',
      color: 'bg-emerald-500',
      bgColor: '#10b981',
      textColor: '#fff',
      icon: 'globe',
    };
  }

  // Phone order type (pedido por telefone)
  if (orderType === 'phone') {
    return {
      label: 'TELEFONE',
      shortLabel: 'TEL',
      color: 'bg-violet-500',
      bgColor: '#8b5cf6',
      textColor: '#fff',
      icon: 'phone',
    };
  }

  // MESA - order_type === 'table'
  if (orderType === 'table') {
    return {
      label: 'MESA',
      shortLabel: 'MESA',
      color: 'bg-pink-600',
      bgColor: '#db2777',
      textColor: '#fff',
      icon: 'utensils',
    };
  }

  // COMANDA - order_type === 'dine_in' (consumo interno via comanda)
  if (orderType === 'dine_in') {
    return {
      label: 'COMANDA',
      shortLabel: 'COMANDA',
      color: 'bg-purple-600',
      bgColor: '#9333ea',
      textColor: '#fff',
      icon: 'utensils',
    };
  }

  // Fallback
  return {
    label: orderType.toUpperCase() || 'SISTEMA',
    shortLabel: orderType.toUpperCase() || 'SIS',
    color: 'bg-gray-500',
    bgColor: '#6b7280',
    textColor: '#fff',
    icon: 'package',
  };
}

/**
 * Retorna o label para impressão térmica
 * Usa função centralizada para consistência
 */
export function getOrderTypePrintLabel(
  orderType: string,
  source?: string | null,
  eatHere?: boolean | null
): string {
  const info = getOrderTypeLabel(orderType, source, eatHere);
  return `★★★ ${info.label} ★★★`;
}

/**
 * Get origin label as simple string (without decorations)
 * Used for data extraction and validation
 */
export function getOrderOriginSimple(
  orderType: string,
  source?: string | null,
  eatHere?: boolean | null
): string {
  const info = getOrderTypeLabel(orderType, source, eatHere);
  return info.label;
}
