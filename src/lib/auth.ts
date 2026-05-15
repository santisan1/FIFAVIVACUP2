import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from './firebase';
import type { AppUser } from '../types';

export interface ExchangeInviteResponse {
  customToken: string;
  user: Pick<AppUser, 'id' | 'name' | 'nickname' | 'role'>;
  tournamentId: string;
}

export async function exchangeInvite(token: string): Promise<ExchangeInviteResponse> {
  const response = await fetch('/api/auth/exchange-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'No pudimos validar tu invitación.');
  }

  return response.json() as Promise<ExchangeInviteResponse>;
}

export async function loginWithInvite(token: string) {
  const exchange = await exchangeInvite(token);
  await signInWithCustomToken(auth, exchange.customToken);
  return exchange;
}

export function logout() {
  return signOut(auth);
}
