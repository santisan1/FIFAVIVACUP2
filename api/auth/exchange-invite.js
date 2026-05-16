import admin from 'firebase-admin';
import { adminDb } from '../_lib/firebaseAdmin';
import { createFirebaseCustomToken, hashInviteToken } from '../_lib/invites';
import { methodNotAllowed, readBody } from '../_lib/http';
export default async function handler(req, res) {
    if (req.method !== 'POST')
        return methodNotAllowed(res);
    try {
        const { token } = readBody(req);
        if (typeof token !== 'string' || token.length < 20)
            return res.status(400).json({ error: 'Token inválido' });
        const tokenHash = hashInviteToken(token);
        const db = adminDb();
        const invites = await db.collection('invites').where('tokenHash', '==', tokenHash).limit(1).get();
        if (invites.empty)
            return res.status(404).json({ error: 'Invite no encontrado' });
        const inviteRef = invites.docs[0].ref;
        const invite = invites.docs[0].data();
        if (invite.revoked)
            return res.status(403).json({ error: 'Invite revocado' });
        const expiresAt = invite.expiresAt?.toDate?.();
        if (expiresAt && expiresAt.getTime() < Date.now())
            return res.status(410).json({ error: 'Invite vencido' });
        const userDoc = await db.collection('users').doc(invite.userId).get();
        if (!userDoc.exists)
            return res.status(404).json({ error: 'Jugador no encontrado' });
        const user = userDoc.data();
        await inviteRef.update({ openedAt: invite.openedAt ?? admin.firestore.FieldValue.serverTimestamp(), lastUsedAt: admin.firestore.FieldValue.serverTimestamp() });
        await db.collection('participants').where('tournamentId', '==', invite.tournamentId).where('userId', '==', invite.userId).limit(1).get().then((snap) => Promise.all(snap.docs.map((doc) => doc.ref.update({ inviteStatus: 'opened', updatedAt: admin.firestore.FieldValue.serverTimestamp() }))));
        const customToken = await createFirebaseCustomToken(invite.userId);
        return res.status(200).json({ customToken, user: { id: invite.userId, name: user.name, nickname: user.nickname, role: user.role }, tournamentId: invite.tournamentId });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No pudimos validar la invitación' });
    }
}
