import admin from 'firebase-admin';
import { adminDb, verifyAdminRequest } from '../_lib/firebaseAdmin';
import { buildInviteUrl, generateSecureToken, hashInviteToken } from '../_lib/invites';
import { methodNotAllowed, readBody } from '../_lib/http';
export default async function handler(req, res) {
    if (req.method !== 'POST')
        return methodNotAllowed(res);
    try {
        const adminUser = await verifyAdminRequest(req);
        const { userId, tournamentId } = readBody(req);
        if (typeof userId !== 'string' || typeof tournamentId !== 'string')
            return res.status(400).json({ error: 'userId y tournamentId requeridos' });
        const token = generateSecureToken();
        const db = adminDb();
        const inviteRef = db.collection('invites').doc();
        await inviteRef.set({ id: inviteRef.id, userId, tournamentId, tokenHash: hashInviteToken(token), expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), revoked: false, createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: adminUser.uid });
        return res.status(200).json({ inviteUrl: buildInviteUrl(req, token) });
    }
    catch (error) {
        console.error(error);
        return res.status(403).json({ error: 'No autorizado para crear invites' });
    }
}
