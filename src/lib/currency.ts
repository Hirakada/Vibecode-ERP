/**
 * Currency helpers for Indonesian Rupiah (IDR)
 * Uses deterministic integer math
 */

export function formatIDR(amount: number): string {
  const rounded = Math.round(amount || 0);
  return 'Rp ' + rounded.toLocaleString('id-ID');
}

export function parseIDR(value: string | number): number {
  if (typeof value === 'number') return Math.round(value);
  const cleaned = value.replace(/[^0-9-]/g, '');
  return parseInt(cleaned, 10) || 0;
}

export function calculateChange(amountPaid: number, total: number): { change: number; isSufficient: boolean } {
  const paid = Math.round(amountPaid || 0);
  const tot = Math.round(total || 0);
  const change = paid - tot;
  return {
    change: Math.max(0, change),
    isSufficient: change >= 0,
  };
}
