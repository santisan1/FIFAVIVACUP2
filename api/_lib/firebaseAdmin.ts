import admin from 'firebase-admin';
import type { VercelRequest } from './http';

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

export function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const privateKey = requiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: requiredEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requiredEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey,
    }),
  });
}

export function adminDb() { return admin.firestore(getAdminApp()); }
export function adminAuth() { return admin.auth(getAdminApp()); }

export async function verifyAdminRequest(req: VercelRequest) {
  const authorization = req.headers.authorization ?? req.headers.Authorization;
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!token) throw new Error('Missing bearer token');
  const decoded = await adminAuth().verifyIdToken(token);
  const userDoc = await adminDb().collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') throw new Error('Admin only');
  return decoded;
}
