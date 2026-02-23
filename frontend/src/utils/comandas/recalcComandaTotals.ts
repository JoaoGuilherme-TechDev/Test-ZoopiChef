import { supabase } from '@/lib/supabase-shim';

/**
 * Recalculate and persist comanda totals (total_amount + paid_amount) based on
 * comanda_items + comanda_payments.
 */
export async function recalcComandaTotals(comandaId: string) {
  // 1) Load comanda settings needed for totals
  const { data: comanda, error: comandaError } = await supabase
    .from('comandas')
    .select('id, status, apply_service_fee, service_fee_percent, discount_value, surcharge_value')
    .eq('id', comandaId)
    .single();

  if (comandaError) throw comandaError;

  // 2) Sum active items
  const { data: items, error: itemsError } = await supabase
    .from('comanda_items')
    .select('qty, unit_price_snapshot')
    .eq('comanda_id', comandaId)
    .is('canceled_at', null);

  if (itemsError) throw itemsError;

  const subtotal = (items || []).reduce(
    (sum, it) => sum + Number(it.qty) * Number(it.unit_price_snapshot),
    0
  );

  const serviceFee = comanda.apply_service_fee
    ? subtotal * (Number(comanda.service_fee_percent) / 100)
    : 0;

  const discount = Number(comanda.discount_value || 0);
  const surcharge = Number(comanda.surcharge_value || 0);
  const total = subtotal + serviceFee + surcharge - discount;

  // 3) Sum payments
  const { data: payments, error: payError } = await supabase
    .from('comanda_payments')
    .select('amount')
    .eq('comanda_id', comandaId);

  if (payError) throw payError;

  const paid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

  // 4) Persist
  const nextStatus =
    total > 0 && (comanda.status === 'free' || comanda.status === 'no_activity')
      ? 'open'
      : comanda.status;

  const { error: updError } = await supabase
    .from('comandas')
    .update({
      total_amount: Number(total.toFixed(2)),
      paid_amount: Number(paid.toFixed(2)),
      status: nextStatus,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', comandaId);

  if (updError) throw updError;
}
