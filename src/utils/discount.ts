import { DiscountType, DiscountInfo, Role, UserProfile } from '../types';

export interface DiscountLimitConfig {
  maxCashierPercent: number; // e.g. 15%
  maxCashierFlatAmount: number; // e.g. Rp 20,000
}

export const DEFAULT_DISCOUNT_LIMITS: DiscountLimitConfig = {
  maxCashierPercent: 15,
  maxCashierFlatAmount: 20000,
};

export const STANDARD_DISCOUNT_REASONS = [
  'Promo Grand Opening',
  'Diskon Pelanggan / Member VIP',
  'Komplain Minuman / Service Recovery',
  'Staff Meal / Barista Perk',
  'Event / Sponsorship Komunitas',
  'Lainnya (Manual Catatan)',
] as const;

/**
 * Standard demo supervisor credentials for PIN validation in POS
 */
export interface SupervisorCredential {
  userId: string;
  name: string;
  role: Role;
  pin: string;
}

export const DEMO_SUPERVISORS: SupervisorCredential[] = [
  {
    userId: 'usr-owner',
    name: 'Budi Santoso',
    role: 'owner',
    pin: '1234',
  },
  {
    userId: 'usr-finance',
    name: 'Dewi Lestari',
    role: 'manager',
    pin: '2345',
  },
];

/**
 * Pure calculation function to compute discount deduction in IDR
 */
export function calculateDiscountAmount(
  subtotal: number,
  type: DiscountType,
  value: number
): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return 0;
  }
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  let calculated = 0;
  if (type === 'percent') {
    const clampedPercent = Math.min(100, Math.max(0, value));
    calculated = Math.round((subtotal * clampedPercent) / 100);
  } else {
    calculated = Math.round(Math.max(0, value));
  }

  // Discount can never exceed subtotal
  return Math.min(subtotal, Math.max(0, calculated));
}

/**
 * Determine if manual override (Supervisor/Manager PIN) is required
 */
export function isOverrideRequired(
  amount: number,
  type: DiscountType,
  value: number,
  userRole: Role,
  limits: DiscountLimitConfig = DEFAULT_DISCOUNT_LIMITS
): boolean {
  // Owner and Manager already have managerial clearance
  if (userRole === 'owner' || userRole === 'manager') {
    return false;
  }

  // Zero discount never needs override
  if (amount <= 0 || value <= 0) {
    return false;
  }

  // Check percentage threshold
  if (type === 'percent' && value > limits.maxCashierPercent) {
    return true;
  }

  // Check flat nominal threshold
  if (amount > limits.maxCashierFlatAmount) {
    return true;
  }

  return false;
}

/**
 * Verify supervisor PIN for manual discount override
 */
export function verifySupervisorPin(
  pin: string,
  supervisors: SupervisorCredential[] = DEMO_SUPERVISORS
): {
  isValid: boolean;
  approver?: { id: string; name: string; role: Role };
  error?: string;
} {
  const cleanedPin = pin.trim();
  if (!cleanedPin) {
    return { isValid: false, error: 'PIN pengawas / supervisor wajib diisi' };
  }

  const supervisor = supervisors.find((s) => s.pin === cleanedPin);
  if (!supervisor) {
    return {
      isValid: false,
      error: 'PIN otorisasi manajer/owner tidak valid. Hubungi supervisor.',
    };
  }

  return {
    isValid: true,
    approver: {
      id: supervisor.userId,
      name: supervisor.name,
      role: supervisor.role,
    },
  };
}

/**
 * Helper to build formatted discount display label
 */
export function formatDiscountLabel(info: DiscountInfo): string {
  if (info.type === 'percent') {
    return `${info.value}% (-Rp ${info.amount.toLocaleString('id-ID')})`;
  }
  return `Rp ${info.amount.toLocaleString('id-ID')}`;
}
