/**
 * Módulo de Cálculo de Entrega - Zoopi v1
 * 
 * Função única e determinística para calcular taxa de entrega.
 * Suporta modos: neighborhood (bairro), radius (raio) e manual.
 * Inclui fallback e auditoria completa via snapshot.
 */

import { supabase } from '@/lib/supabase-shim';

// =====================================================
// TYPES
// =====================================================

export type FulfillmentType = 'delivery' | 'pickup' | 'dine_in' | 'table';
export type DeliveryMode = 'neighborhood' | 'radius' | 'manual';

export interface DestinationAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  reference?: string;
}

export interface DeliveryCalculationInput {
  cep?: string;
  neighborhood: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  address?: DestinationAddress;
}

export interface DeliveryRuleSnapshot {
  mode: DeliveryMode;
  neighborhood_name?: string;
  min_km?: number;
  max_km?: number;
  fee_cents: number;
  eta_minutes?: number;
  origin_cep?: string;
  destination_cep?: string;
  distance_km?: number;
  rule_id?: string;
  calculated_at: string;
}

export interface DeliveryCalculationResult {
  ok: boolean;
  reason_if_fail?: string;
  mode_used: DeliveryMode | null;
  fee_cents: number;
  distance_km?: number;
  eta_minutes?: number;
  rule_id?: string;
  rule_snapshot: DeliveryRuleSnapshot | null;
  needs_fallback: boolean;
  allowed_manual_fee: boolean;
  available_ranges?: Array<{
    id: string;
    min_km: number;
    max_km: number;
    fee: number;
    estimated_minutes?: number;
  }>;
}

interface DeliveryConfig {
  id: string;
  company_id: string;
  mode: 'neighborhood' | 'radius';
  origin_address: string | null;
  origin_latitude: number | null;
  origin_longitude: number | null;
  max_distance_km: number;
  fallback_fee: number;
  allow_manual_override: boolean;
}

interface DeliveryNeighborhood {
  id: string;
  neighborhood: string;
  city: string | null;
  fee: number;
  estimated_minutes: number | null;
  active: boolean;
}

interface DeliveryRange {
  id: string;
  min_km: number;
  max_km: number;
  fee: number;
  estimated_minutes: number | null;
  active: boolean;
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Normaliza texto para comparação (trim, lowercase, remove acentos)
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calcula distância Haversine entre dois pontos
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Converte valor em reais para centavos
 */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

/**
 * Converte centavos para reais
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

// =====================================================
// MAIN FUNCTION
// =====================================================

/**
 * Calcula taxa de entrega de forma determinística
 * 
 * @param companyId - ID da empresa
 * @param destination - Dados do destino (bairro, cidade, lat/lng, CEP)
 * @returns Resultado com taxa, modo, snapshot e flags de fallback
 */
export async function calculateDelivery(
  companyId: string,
  destination: DeliveryCalculationInput
): Promise<DeliveryCalculationResult> {
  const now = new Date().toISOString();

  // 1) Buscar configuração da empresa
  const { data: config, error: configError } = await supabase
    .from('delivery_fee_config')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (configError || !config) {
    return {
      ok: false,
      reason_if_fail: 'Configuração de entrega não encontrada',
      mode_used: null,
      fee_cents: 0,
      rule_snapshot: null,
      needs_fallback: true,
      allowed_manual_fee: false,
    };
  }

  const typedConfig = config as DeliveryConfig;

  // 2) Modo BAIRRO
  if (typedConfig.mode === 'neighborhood') {
    return await calculateByNeighborhood(
      companyId,
      typedConfig,
      destination,
      now
    );
  }

  // 3) Modo RAIO
  if (typedConfig.mode === 'radius') {
    return await calculateByRadius(companyId, typedConfig, destination, now);
  }

  return {
    ok: false,
    reason_if_fail: 'Modo de cálculo não configurado',
    mode_used: null,
    fee_cents: 0,
    rule_snapshot: null,
    needs_fallback: true,
    allowed_manual_fee: typedConfig.allow_manual_override,
  };
}

// =====================================================
// MODO BAIRRO
// =====================================================

async function calculateByNeighborhood(
  companyId: string,
  config: DeliveryConfig,
  destination: DeliveryCalculationInput,
  calculatedAt: string
): Promise<DeliveryCalculationResult> {
  // Buscar bairros ativos
  const { data: neighborhoods, error } = await supabase
    .from('delivery_fee_neighborhoods')
    .select('*')
    .eq('company_id', companyId)
    .eq('active', true);

  if (error || !neighborhoods || neighborhoods.length === 0) {
    return {
      ok: false,
      reason_if_fail: 'Nenhum bairro configurado',
      mode_used: 'neighborhood',
      fee_cents: 0,
      rule_snapshot: null,
      needs_fallback: true,
      allowed_manual_fee: config.allow_manual_override,
    };
  }

  const typedNeighborhoods = neighborhoods as DeliveryNeighborhood[];

  // Normalizar input
  const normalizedInput = normalizeText(destination.neighborhood);
  const normalizedCity = destination.city ? normalizeText(destination.city) : null;

  // Buscar match
  const found = typedNeighborhoods.find((n) => {
    const matchNeighborhood = normalizeText(n.neighborhood) === normalizedInput;
    if (!n.city) return matchNeighborhood;
    return matchNeighborhood && normalizeText(n.city) === normalizedCity;
  });

  if (!found) {
    return {
      ok: false,
      reason_if_fail: `Bairro "${destination.neighborhood}" não atendido`,
      mode_used: 'neighborhood',
      fee_cents: 0,
      rule_snapshot: null,
      needs_fallback: true,
      allowed_manual_fee: config.allow_manual_override,
    };
  }

  const snapshot: DeliveryRuleSnapshot = {
    mode: 'neighborhood',
    neighborhood_name: found.neighborhood,
    fee_cents: toCents(found.fee),
    eta_minutes: found.estimated_minutes || undefined,
    destination_cep: destination.cep,
    rule_id: found.id,
    calculated_at: calculatedAt,
  };

  return {
    ok: true,
    mode_used: 'neighborhood',
    fee_cents: toCents(found.fee),
    eta_minutes: found.estimated_minutes || undefined,
    rule_id: found.id,
    rule_snapshot: snapshot,
    needs_fallback: false,
    allowed_manual_fee: config.allow_manual_override,
  };
}

// =====================================================
// MODO RAIO
// =====================================================

async function calculateByRadius(
  companyId: string,
  config: DeliveryConfig,
  destination: DeliveryCalculationInput,
  calculatedAt: string
): Promise<DeliveryCalculationResult> {
  // Buscar faixas de distância
  const { data: ranges, error } = await supabase
    .from('delivery_fee_ranges')
    .select('*')
    .eq('company_id', companyId)
    .eq('active', true)
    .order('min_km');

  if (error) {
    return {
      ok: false,
      reason_if_fail: 'Erro ao buscar faixas de distância',
      mode_used: 'radius',
      fee_cents: 0,
      rule_snapshot: null,
      needs_fallback: true,
      allowed_manual_fee: config.allow_manual_override,
    };
  }

  const typedRanges = (ranges || []) as DeliveryRange[];
  const availableRanges = typedRanges.map((r) => ({
    id: r.id,
    min_km: r.min_km,
    max_km: r.max_km,
    fee: r.fee,
    estimated_minutes: r.estimated_minutes || undefined,
  }));

  // Verificar se temos lat/lng
  if (
    !destination.latitude ||
    !destination.longitude ||
    !config.origin_latitude ||
    !config.origin_longitude
  ) {
    // Sem coordenadas - fallback
    return {
      ok: false,
      reason_if_fail: 'Coordenadas não disponíveis para cálculo de distância',
      mode_used: 'radius',
      fee_cents: toCents(config.fallback_fee),
      rule_snapshot: {
        mode: 'radius',
        fee_cents: toCents(config.fallback_fee),
        destination_cep: destination.cep,
        calculated_at: calculatedAt,
      },
      needs_fallback: true,
      allowed_manual_fee: config.allow_manual_override,
      available_ranges: availableRanges,
    };
  }

  // Calcular distância
  const distance = haversineDistance(
    config.origin_latitude,
    config.origin_longitude,
    destination.latitude,
    destination.longitude
  );

  // Verificar se está além do máximo
  if (distance > config.max_distance_km) {
    return {
      ok: false,
      reason_if_fail: `Fora da área de entrega (${distance.toFixed(1)}km > ${config.max_distance_km}km)`,
      mode_used: 'radius',
      fee_cents: 0,
      distance_km: distance,
      rule_snapshot: null,
      needs_fallback: false, // Não é fallback, é bloqueio
      allowed_manual_fee: false, // Não permitir manual fora da área
    };
  }

  // Encontrar faixa correspondente
  const matchedRange = typedRanges.find(
    (r) => distance >= r.min_km && distance < r.max_km
  );

  if (!matchedRange) {
    // Sem faixa configurada para essa distância
    return {
      ok: false,
      reason_if_fail: `Sem faixa configurada para ${distance.toFixed(1)}km`,
      mode_used: 'radius',
      fee_cents: toCents(config.fallback_fee),
      distance_km: distance,
      rule_snapshot: {
        mode: 'radius',
        fee_cents: toCents(config.fallback_fee),
        distance_km: distance,
        destination_cep: destination.cep,
        calculated_at: calculatedAt,
      },
      needs_fallback: true,
      allowed_manual_fee: config.allow_manual_override,
      available_ranges: availableRanges,
    };
  }

  const snapshot: DeliveryRuleSnapshot = {
    mode: 'radius',
    min_km: matchedRange.min_km,
    max_km: matchedRange.max_km,
    fee_cents: toCents(matchedRange.fee),
    eta_minutes: matchedRange.estimated_minutes || undefined,
    distance_km: distance,
    destination_cep: destination.cep,
    rule_id: matchedRange.id,
    calculated_at: calculatedAt,
  };

  return {
    ok: true,
    mode_used: 'radius',
    fee_cents: toCents(matchedRange.fee),
    distance_km: distance,
    eta_minutes: matchedRange.estimated_minutes || undefined,
    rule_id: matchedRange.id,
    rule_snapshot: snapshot,
    needs_fallback: false,
    allowed_manual_fee: config.allow_manual_override,
  };
}

// =====================================================
// CRIAR SNAPSHOT MANUAL
// =====================================================

export function createManualSnapshot(
  feeCents: number,
  destination: DeliveryCalculationInput
): DeliveryRuleSnapshot {
  return {
    mode: 'manual',
    fee_cents: feeCents,
    destination_cep: destination.cep,
    calculated_at: new Date().toISOString(),
  };
}

// =====================================================
// VERIFICAR FEATURE FLAG
// =====================================================

export async function isDeliveryFeesV1Enabled(
  companyId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('companies')
    .select('feature_flags')
    .eq('id', companyId)
    .single();

  if (error || !data?.feature_flags) {
    return false;
  }

  const flags = data.feature_flags as Record<string, boolean>;
  return flags.delivery_fees_v1 === true;
}
