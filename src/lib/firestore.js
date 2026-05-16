import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, } from 'firebase/firestore';
import { createInitialMatches, getWinner, nextSlot } from './bracket';
import { db } from './firebase';
import { resultNarrative } from './narratives';
import { emptyStats } from '../types';
const token = () => crypto.randomUUID().replaceAll('-', '');
const yearKey = (season) => String(season);
function withId(snap) {
    return { id: snap.id, ...snap.data() };
}
export async function listPlayers() {
    const snap = await getDocs(query(collection(db, 'players'), orderBy('name')));
    return snap.docs.map((item) => withId(item));
}
export async function getPlayer(id) {
    const snap = await getDoc(doc(db, 'players', id));
    return snap.exists() ? withId(snap) : null;
}
export async function createPlayer(input) {
    const ref = doc(collection(db, 'players'));
    await setDoc(ref, {
        ...input,
        accessToken: token(),
        statsGlobal: emptyStats(),
        createdAt: serverTimestamp(),
    });
    return ref.id;
}
export async function updatePlayer(id, input) {
    await updateDoc(doc(db, 'players', id), input);
}
export async function listTournaments() {
    const snap = await getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')));
    return snap.docs.map((item) => withId(item));
}
export async function getTournament(id) {
    const snap = await getDoc(doc(db, 'tournaments', id));
    return snap.exists() ? withId(snap) : null;
}
export async function getActiveTournament() {
    const snap = await getDocs(query(collection(db, 'tournaments'), where('status', 'in', ['draft', 'draw', 'active']), limit(1)));
    return snap.docs[0] ? withId(snap.docs[0]) : null;
}
export async function createTournament(input) {
    const ref = doc(collection(db, 'tournaments'));
    await setDoc(ref, {
        name: input.name,
        season: input.season,
        status: 'draft',
        format: 'knockout16',
        createdAt: serverTimestamp(),
    });
    return ref.id;
}
export async function listTournamentPlayers(tournamentId) {
    const snap = await getDocs(query(collection(db, 'tournamentPlayers'), where('tournamentId', '==', tournamentId)));
    return snap.docs.map((item) => withId(item)).sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));
}
export async function addTournamentPlayer(tournamentId, player, teamName) {
    const existing = await listTournamentPlayers(tournamentId);
    if (existing.length >= 16)
        throw new Error('El torneo ya tiene 16 jugadores.');
    if (existing.some((item) => item.playerId === player.id))
        return;
    await addDoc(collection(db, 'tournamentPlayers'), {
        tournamentId,
        playerId: player.id,
        playerName: player.name,
        playerNickname: player.nickname,
        teamName: teamName || player.currentTeam,
        seed: existing.length + 1,
        eliminated: false,
    });
}
export async function removeTournamentPlayer(id) {
    await deleteDoc(doc(db, 'tournamentPlayers', id));
}
export async function listMatches(tournamentId) {
    const snap = await getDocs(query(collection(db, 'matches'), where('tournamentId', '==', tournamentId), orderBy('kickoffOrder')));
    return snap.docs.map((item) => withId(item));
}
export async function listGoals(tournamentId) {
    const snap = await getDocs(query(collection(db, 'goals'), where('tournamentId', '==', tournamentId)));
    return snap.docs.map((item) => withId(item));
}
export async function listFeed(tournamentId) {
    const snap = await getDocs(query(collection(db, 'feedEvents'), where('tournamentId', '==', tournamentId), orderBy('createdAt', 'desc'), limit(20)));
    return snap.docs.map((item) => withId(item));
}
export async function runDraw(tournamentId) {
    const players = await listTournamentPlayers(tournamentId);
    const matches = createInitialMatches(players, tournamentId);
    const batch = writeBatch(db);
    matches.forEach((match) => batch.set(doc(collection(db, 'matches')), { ...match, createdAt: serverTimestamp() }));
    batch.update(doc(db, 'tournaments', tournamentId), { status: 'draw', startedAt: serverTimestamp() });
    batch.set(doc(collection(db, 'feedEvents')), { tournamentId, text: 'El sorteo explotó la arena: los octavos ya están listos.', tone: 'epic', createdAt: serverTimestamp() });
    await batch.commit();
}
export async function updateMatchPlayers(match, input) {
    await updateDoc(doc(db, 'matches', match.id), {
        ...(input.playerA ? { playerAId: input.playerA.playerId, playerAName: input.playerA.playerNickname, teamA: input.playerA.teamName } : {}),
        ...(input.playerB ? { playerBId: input.playerB.playerId, playerBName: input.playerB.playerNickname, teamB: input.playerB.teamName } : {}),
    });
}
async function ensureNextMatch(tournamentId, slot, winner) {
    const matches = await listMatches(tournamentId);
    const existing = matches.find((item) => item.round === slot.round && item.bracketPosition === slot.position);
    const payload = slot.slot === 'A'
        ? { playerAId: winner.id, playerAName: winner.name, teamA: winner.team }
        : { playerBId: winner.id, playerBName: winner.name, teamB: winner.team };
    if (existing) {
        await updateDoc(doc(db, 'matches', existing.id), payload);
        return;
    }
    await addDoc(collection(db, 'matches'), {
        tournamentId,
        round: slot.round,
        matchNumber: slot.position,
        bracketPosition: slot.position,
        ...payload,
        status: 'pending',
        kickoffOrder: slot.round === 'QF' ? 100 + slot.position : slot.round === 'SF' ? 200 + slot.position : 300,
        createdAt: serverTimestamp(),
    });
}
export async function closeMatch(match, scoreA, scoreB, goals) {
    const tournament = await getTournament(match.tournamentId);
    if (!tournament)
        throw new Error('No existe el torneo.');
    const finalMatch = { ...match, scoreA, scoreB };
    const winner = getWinner(finalMatch);
    const winnerName = winner.winnerId === match.playerAId ? match.playerAName : match.playerBName;
    const loserName = winner.loserId === match.playerAId ? match.playerAName : match.playerBName;
    const winnerTeam = winner.winnerId === match.playerAId ? match.teamA : match.teamB;
    const narrative = resultNarrative(finalMatch, winnerName, loserName);
    const batch = writeBatch(db);
    batch.update(doc(db, 'matches', match.id), {
        scoreA,
        scoreB,
        winnerId: winner.winnerId,
        loserId: winner.loserId,
        status: 'finished',
        narrative,
        finishedAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'feedEvents')), { tournamentId: match.tournamentId, text: narrative, tone: match.round === 'FINAL' ? 'champion' : 'result', createdAt: serverTimestamp() });
    goals.filter((goal) => goal.scorerName && goal.quantity > 0).forEach((goal) => batch.set(doc(collection(db, 'goals')), { tournamentId: match.tournamentId, matchId: match.id, ...goal, createdAt: serverTimestamp() }));
    const aPoints = winner.winnerId === match.playerAId ? 2 : 0;
    const bPoints = winner.winnerId === match.playerBId ? 2 : 0;
    if (match.playerAId)
        batch.update(doc(db, 'players', match.playerAId), {
            'statsGlobal.matches': increment(1),
            [`statsGlobal.${winner.winnerId === match.playerAId ? 'wins' : 'losses'}`]: increment(1),
            'statsGlobal.goalsFor': increment(scoreA),
            'statsGlobal.goalsAgainst': increment(scoreB),
            [`statsGlobal.annualPoints.${yearKey(tournament.season)}`]: increment(aPoints),
        });
    if (match.playerBId)
        batch.update(doc(db, 'players', match.playerBId), {
            'statsGlobal.matches': increment(1),
            [`statsGlobal.${winner.winnerId === match.playerBId ? 'wins' : 'losses'}`]: increment(1),
            'statsGlobal.goalsFor': increment(scoreB),
            'statsGlobal.goalsAgainst': increment(scoreA),
            [`statsGlobal.annualPoints.${yearKey(tournament.season)}`]: increment(bPoints),
        });
    batch.update(doc(db, 'tournaments', match.tournamentId), { status: match.round === 'FINAL' ? 'finished' : 'active', ...(match.round === 'FINAL' ? { championPlayerId: winner.winnerId, runnerUpPlayerId: winner.loserId, finishedAt: serverTimestamp() } : {}) });
    await batch.commit();
    const slot = nextSlot(match);
    if (slot)
        await ensureNextMatch(match.tournamentId, slot, { id: winner.winnerId, name: winnerName, team: winnerTeam });
    if (match.round === 'FINAL')
        await awardTournamentPoints(tournament, winner.winnerId, winner.loserId);
}
async function awardTournamentPoints(tournament, championId, runnerUpId) {
    const key = yearKey(tournament.season);
    await updateDoc(doc(db, 'players', championId), { 'statsGlobal.tournamentsPlayed': increment(1), 'statsGlobal.titles': increment(1), [`statsGlobal.annualPoints.${key}`]: increment(10) });
    await updateDoc(doc(db, 'players', runnerUpId), { 'statsGlobal.tournamentsPlayed': increment(1), 'statsGlobal.runnerUps': increment(1), [`statsGlobal.annualPoints.${key}`]: increment(7) });
}
export async function buildScorers(tournamentId) {
    const goals = await listGoals(tournamentId);
    const rows = new Map();
    goals.forEach((goal) => {
        const current = rows.get(goal.playerOwnerId) ?? { playerOwnerId: goal.playerOwnerId, playerName: goal.playerOwnerName || 'Jugador', goals: 0, scorers: [] };
        current.goals += goal.quantity || 1;
        if (!current.scorers.includes(goal.scorerName))
            current.scorers.push(goal.scorerName);
        rows.set(goal.playerOwnerId, current);
    });
    return [...rows.values()].sort((a, b) => b.goals - a.goals);
}
export async function buildRanking(year) {
    const players = await listPlayers();
    return players.map((player) => ({
        playerId: player.id,
        name: player.name,
        nickname: player.nickname,
        team: player.currentTeam,
        points: player.statsGlobal?.annualPoints?.[String(year)] ?? 0,
        titles: player.statsGlobal?.titles ?? 0,
        runnerUps: player.statsGlobal?.runnerUps ?? 0,
        wins: player.statsGlobal?.wins ?? 0,
        goalsFor: player.statsGlobal?.goalsFor ?? 0,
        goalsAgainst: player.statsGlobal?.goalsAgainst ?? 0,
    })).sort((a, b) => b.points - a.points || b.wins - a.wins || b.goalsFor - a.goalsFor);
}
