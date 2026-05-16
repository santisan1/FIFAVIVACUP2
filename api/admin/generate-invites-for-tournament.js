import admin from 'firebase-admin';
import { adminDb, verifyAdminRequest } from '../_lib/firebaseAdmin';
import { buildInviteUrl, generateSecureToken, hashInviteToken } from '../_lib/invites';
import { methodNotAllowed, readBody } from '../_lib/http';
export default async function handler(req, res) {
    if (req.method !== 'POST')
        return methodNotAllowed(res);
    try {
        const adminUser = await verifyAdminRequest(req);
        const { tournamentId } = readBody(req);
        if (typeof tournamentId !== 'string')
            return res.status(400).json({ error: 'tournamentId requerido' });
        const db = adminDb();
        const participants = await db.collection('participants').where('tournamentId', '==', tournamentId).get();
        const invites = await Promise.all(participants.docs.map(async (participant) => {
            const { userId } = participant.data();
            const token = generateSecureToken();
            const inviteRef = db.collection('invites').doc();
            await inviteRef.set({ id: inviteRef.id, userId, tournamentId, tokenHash: hashInviteToken(token), expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), revoked: false, createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: adminUser.uid });
            return { userId, inviteUrl: buildInviteUrl(req, token) };
        }));
        return res.status(200).json({ invites });
    }
    catch (error) {
        console.error(error);
        return res.status(403).json({ error: 'No autorizado para generar invites' });
    }
}
