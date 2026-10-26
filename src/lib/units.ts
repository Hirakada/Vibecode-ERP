import { UnitOfMeasure } from '../types';

/**
 * Standard unit conversions for beverage shop inventory
 */
export function convertUnit(quantity: number, from: UnitOfMeasure, to: UnitOfMeasure, packSize = 1): number {
  if (from === to) return quantity;

  // Mass
  if (from === 'kg' && to === 'g') return quantity * 1000;
  if (from === 'g' && to === 'kg') return quantity / 1000;

  // Volume
  if (from === 'L' && to === 'ml') return quantity * 1000;
  if (from === 'ml' && to === 'L') return quantity / 1000;

  // Packaging
  if (from === 'pack' && to === 'pcs') return quantity * packSize;
  if (from === 'pcs' && to === 'pack') return quantity / packSize;

  throw new Error(`Konversi satuan tidak valid dari '${from}' ke '${to}'`);
}

export function formatQuantityWithUnit(qty: number, unit: UnitOfMeasure): string {
  const rounded = Number.isInteger(qty) ? qty : Number(qty.toFixed(2));
  return `${rounded.toLocaleString('id-ID')} ${unit}`;
}
