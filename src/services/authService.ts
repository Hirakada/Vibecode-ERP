import { db } from '../lib/storage';
import { UserProfile } from '../types';

export const OWNER_EMAIL = 'hirakada.id@gmail.com';
export const OWNER_NAME = 'Hirakada';
export const OWNER_DEFAULT_PIN = '1234';

export interface AuthSession {
  user: UserProfile;
  authenticatedAt: string;
  authMethod: 'email_otp' | 'pin';
  token: string;
}

const SESSION_KEY = 'caozy_owner_session';

/**
 * Finds registered user by email in database or returns Owner if matches OWNER_EMAIL
 */
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  
  try {
    const allUsers = await db.users.toArray();
    const match = allUsers.find((u) => u.email.trim().toLowerCase() === cleanEmail);
    if (match) return match;
  } catch (err) {
    console.error('Error finding user in db:', err);
  }

  // Fallback check for owner
  if (cleanEmail === OWNER_EMAIL.toLowerCase()) {
    return {
      id: 'usr-hirakada',
      name: OWNER_NAME,
      email: OWNER_EMAIL,
      role: 'owner',
      avatar: '👑',
    };
  }

  return null;
}

/**
 * Validates if an entered email matches any registered user or the owner
 */
export async function validateEmail(email: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  return user !== null;
}

/**
 * Legacy sync check for owner email
 */
export function validateOwnerEmail(email: string): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();
}

/**
 * Verifies if entered PIN matches owner PIN
 */
export function verifyOwnerPin(pin: string): boolean {
  if (!pin) return false;
  return pin.trim() === OWNER_DEFAULT_PIN;
}

/**
 * Verifies entered OTP matches expected OTP
 */
export function verifyOtpCode(enteredOtp: string, expectedOtp: string): boolean {
  if (!enteredOtp || !expectedOtp) return false;
  return enteredOtp.trim() === expectedOtp.trim();
}

/**
 * Generates a random 6-digit OTP code for email verification
 */
export function generateRandomOtp(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
}

/**
 * Stores authenticated user session in localStorage
 */
export function saveAuthSession(
  userOrMethod: UserProfile | 'email_otp' | 'pin',
  method: 'email_otp' | 'pin' = 'email_otp'
): AuthSession {
  let user: UserProfile;
  let authMethod: 'email_otp' | 'pin' = method;

  if (typeof userOrMethod === 'string') {
    authMethod = userOrMethod as 'email_otp' | 'pin';
    user = {
      id: 'usr-hirakada',
      name: OWNER_NAME,
      email: OWNER_EMAIL,
      role: 'owner',
      avatar: '👑',
    };
  } else {
    user = userOrMethod;
  }

  const session: AuthSession = {
    user,
    authenticatedAt: new Date().toISOString(),
    authMethod,
    token: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save session to localStorage:', e);
    }
  }

  return session;
}

/**
 * Retrieves existing active session from localStorage
 */
export function getSavedAuthSession(): AuthSession | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (session && session.user && session.user.email === OWNER_EMAIL) {
      return session;
    }
  } catch (e) {
    console.error('Failed to read session:', e);
  }

  return null;
}

/**
 * Clears active session
 */
export function clearAuthSession(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error('Failed to clear session:', e);
    }
  }
}
