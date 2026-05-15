import crypto from 'node:crypto';
import { adminAuth } from './firebaseAdmin';

export function generateSecureToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashInviteToken(token: string) {
  const pepper = process.env.INVITE_TOKEN_PEPPER;
  if (!pepper) throw new Error('Missing env var INVITE_TOKEN_PEPPER');
  return crypto.createHash('sha256').update(`${token}.${pepper}`).digest('hex');
}

export function createFirebaseCustomToken(userId: string) {
  return adminAuth().createCustomToken(userId);
}

export function buildInviteUrl(req: { headers: Record<string, string | string[] | undefined> }, token: string) {
  const host = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader ?? 'https';
  const baseUrl = process.env.PUBLIC_APP_URL ?? `${proto}://${host}`;
  return `${baseUrl}/invite/${token}`;
}
