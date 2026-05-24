import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../src/lib/firebase.js';
import { nextSlot } from '../src/lib/bracket.js';

function byKickoff(a, b) {
  return Number(a.kickoffOrder ?? 0) - Number(b.kickoffOrder ?? 0);
}

function groupStandings(matches) {
  const table = new Map();
  matches.filter((m) => m.round === 'GROUP' && m.status === 'finished').forEach((m) => {
    const sa = Number(m.scoreA ?? 0);
    const sb = Number(m.scoreB ?? 0);
    const up = (id, name, team, gf, ga, pts) => {
      const row = table.get(id) ?? { id, name, team, pts: 0, gf: 0, ga: 0, gd: 0 };
      row.pts += pts;
      row.gf += gf;
      row.ga += ga;
      row.gd = row.gf - row.ga;
      table.set(id, row);
    };
    up(m.playerAId, m.playerAName, m.teamA, sa, sb, sa === sb ? 1 : sa > sb ? 3 : 0);
    up(m.playerBId, m.playerBName, m.teamB, sb, sa, sa === sb ? 1 : sb > sa ? 3 : 0);
  });
  const byGroup = new Map();
  matches.filter((m) => m.round === 'GROUP').forEach((m) => {
    const g = m.groupName || '?';
    const current = byGroup.get(g) ?? new Set();
    current.add(m.playerAId);
    current.add(m.playerBId);
    byGroup.set(g, current);
  });
  return [...byGroup.entries()].reduce((acc, [g, ids]) => {
    acc[g] = [...ids]
      .map((id) => table.get(id) ?? { id, pts: 0, gf: 0, ga: 0, gd: 0 })
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    return acc;
  }, {});
}

async function listMatches(tournamentId) {
  const snap = await getDocs(query(collection(db, 'matches'), where('tournamentId', '==', tournamentId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byKickoff);
}

async function ensureMatchWithPlayers(tournamentId, round, bracketPosition, playerA, playerB) {
  const matches = await listMatches(tournamentId);
  const existing = matches.find((m) => m.round === round && m.bracketPosition === bracketPosition);
  const payload = {
    playerAId: playerA?.id ?? null,
    playerAName: playerA?.name ?? '',
    teamA: playerA?.team ?? '',
    playerBId: playerB?.id ?? null,
    playerBName: playerB?.name ?? '',
    teamB: playerB?.team ?? '',
  };
  if (existing) {
    if (existing.status === 'finished') return;
    await updateDoc(doc(db, 'matches', existing.id), payload);
    return;
  }
  await addDoc(collection(db, 'matches'), {
    tournamentId,
    round,
    matchNumber: bracketPosition,
    bracketPosition,
    ...payload,
    status: 'pending',
    kickoffOrder: round === 'QF' ? 100 + bracketPosition : round === 'SF' ? 200 + bracketPosition : 300,
    imageUrl: '',
    createdAt: serverTimestamp(),
  });
}

async function rebuildFromGroups(tournamentId, matches) {
  const standings = groupStandings(matches);
  const pairs = [
    [standings.A?.[0], standings.B?.[1]],
    [standings.C?.[0], standings.D?.[1]],
    [standings.B?.[0], standings.A?.[1]],
    [standings.D?.[0], standings.C?.[1]],
  ];
  for (let i = 0; i < pairs.length; i += 1) {
    const [a, b] = pairs[i];
    await ensureMatchWithPlayers(
      tournamentId,
      'QF',
      i + 1,
      a?.id ? { id: a.id, name: a.name, team: a.team } : null,
      b?.id ? { id: b.id, name: b.name, team: b.team } : null,
    );
  }
}

async function rebuildKnockoutProgression(tournamentId, matches) {
  const finished = matches.filter((m) => m.status === 'finished' && ['R16', 'QF', 'SF'].includes(m.round));
  for (const match of finished) {
    const slot = nextSlot(match);
    if (!slot) continue;
    const winnerId = match.winnerId;
    if (!winnerId) continue;
    const winner = winnerId === match.playerAId
      ? { id: match.playerAId, name: match.playerAName, team: match.teamA }
      : { id: match.playerBId, name: match.playerBName, team: match.teamB };
    const all = await listMatches(tournamentId);
    const next = all.find((m) => m.round === slot.round && m.bracketPosition === slot.position);
    if (!next) {
      await ensureMatchWithPlayers(
        tournamentId,
        slot.round,
        slot.position,
        slot.slot === 'A' ? winner : null,
        slot.slot === 'B' ? winner : null,
      );
      continue;
    }
    if (next.status === 'finished') continue;
    const payload = slot.slot === 'A'
      ? { playerAId: winner.id, playerAName: winner.name, teamA: winner.team }
      : { playerBId: winner.id, playerBName: winner.name, teamB: winner.team };
    await updateDoc(doc(db, 'matches', next.id), payload);
  }
}

(async () => {
  const tournamentId = process.argv[2];
  if (!tournamentId) throw new Error('Uso: node scripts/rebuild-bracket-from-results.mjs <tournamentId>');
  const tournamentSnap = await getDoc(doc(db, 'tournaments', tournamentId));
  if (!tournamentSnap.exists()) throw new Error('Torneo no encontrado');

  const tournament = { id: tournamentSnap.id, ...tournamentSnap.data() };
  const matches = await listMatches(tournamentId);
  if (tournament.mode === 'groups_16') await rebuildFromGroups(tournamentId, matches);
  await rebuildKnockoutProgression(tournamentId, await listMatches(tournamentId));

  console.log('✅ Llaves recalculadas para torneo:', tournamentId);
  console.log('⚠️ Nota: no pisa partidos ya cerrados en rondas siguientes.');
})();
