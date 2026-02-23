import { supabase } from '@/lib/supabase-shim';
import { WheelSettings } from './useWheelSettings';

export interface EligibilityResult {
  canSpin: boolean;
  reason?: string;
  ordersCount?: number;
  totalSpentSinceLastSpin?: number;
  amountNeeded?: number;
}

// Normalize phone to only digits
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Check eligibility for spinning the wheel
export async function checkWheelEligibility(
  companyId: string,
  phone: string,
  settings: WheelSettings
): Promise<EligibilityResult> {
  // Use backend function so the public page can count orders without exposing orders data via RLS.
  const { data, error } = await supabase.functions.invoke('public-wheel-eligibility', {
    body: { company_id: companyId, phone },
  });

  if (error) {
    console.error('Error checking wheel eligibility (backend):', error);
    return { canSpin: false, reason: 'Erro ao verificar elegibilidade.' };
  }

  // Backend returns the final decision; keep `settings` arg for API compatibility.
  return data as EligibilityResult;
}

// Find or create customer by phone
export async function findOrCreateCustomer(
  companyId: string,
  name: string,
  phone: string
): Promise<{ id: string; isNew: boolean } | null> {
  const normalizedPhone = normalizePhone(phone);

  // Try to find existing customer
  const phoneRaw = phone.trim();
  const phone55 = normalizedPhone ? `55${normalizedPhone}` : '';

  const { data: existing, error: findError } = await supabase
    .from('customers')
    .select('id')
    .eq('company_id', companyId)
    .or([
      `whatsapp.eq.${normalizedPhone}`,
      phoneRaw ? `whatsapp.eq.${phoneRaw}` : null,
      phone55 ? `whatsapp.eq.${phone55}` : null,
    ].filter(Boolean).join(','))
    .maybeSingle();

  if (findError) {
    console.error('Error finding customer:', findError);
    return null;
  }

  if (existing) {
    return { id: existing.id, isNew: false };
  }

  // Create new customer
  const { data: newCustomer, error: createError } = await supabase
    .from('customers')
    .insert({
      company_id: companyId,
      name: name.trim(),
      whatsapp: normalizedPhone,
    })
    .select('id')
    .single();

  if (createError) {
    console.error('Error creating customer:', createError);
    return null;
  }

  return { id: newCustomer.id, isNew: true };
}

// Record a wheel spin and prize
export async function recordWheelSpin(params: {
  companyId: string;
  customerId: string;
  phone: string;
  prizeName: string;
  prizeType: 'percentage' | 'fixed_value' | 'free_item';
  prizeValue: number;
  validityDays: number;
  ordersCount: number;
  totalSpent: number;
}): Promise<{ rewardId: string } | null> {
  const normalizedPhone = normalizePhone(params.phone);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + params.validityDays);

  // 1. Create the reward
  const { data: reward, error: rewardError } = await supabase
    .from('customer_rewards')
    .insert({
      company_id: params.companyId,
      customer_id: params.customerId,
      phone: normalizedPhone,
      reward_type: params.prizeType,
      reward_value: params.prizeValue,
      prize_name: params.prizeName,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (rewardError) {
    console.error('Error creating reward:', rewardError);
    return null;
  }

  // 2. Log the spin
  await supabase
    .from('wheel_spin_logs')
    .insert({
      company_id: params.companyId,
      customer_id: params.customerId,
      phone: normalizedPhone,
      prize_result: params.prizeName,
      prize_id: reward.id,
      orders_count_at_spin: params.ordersCount,
      total_spent_at_spin: Math.round(params.totalSpent * 100),
    });

  // 3. Update customer's first_wheel_spin_at if not set
  await supabase
    .from('customers')
    .update({ first_wheel_spin_at: new Date().toISOString() })
    .eq('id', params.customerId)
    .is('first_wheel_spin_at', null);

  return { rewardId: reward.id };
}
