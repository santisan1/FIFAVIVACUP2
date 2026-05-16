import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { createInitialMatches, getWinner, nextSlot } from './bracket';
import { db } from './firebase';
import { resultNarrative, badgesForPlayer } from './narratives';
import { emptyStats } from '../types';

const token = () => crypto.randomUUID().replaceAll('-', '');
const yearKey = (season) => String(season);
const placementPoints = { champion: 10, runnerUp: 7, semifinalist: 5, quarterfinalist: 3, roundOf16: 1 };

function withId(snap) {
  return { id: snap.id, ...snap.data() };
}

function safeStats(stats = {}) {
  return { ...emptyStats(), ...stats, annualPoints: stats.annualPoints ?? {} };
}

export function playerMagicLink(player, origin = import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.PUBLIC_APP_URL || window.location.origin) {
  return `${origin.replace(/\/$/, '')}/player/${player.id}?token=${player.accessToken}`;
}

export async function listPlayers() {
  const snap = await getDocs(query(collection(db, 'players'), orderBy('name')));
  return snap.docs.map((item) => ({ ...withId(item), statsGlobal: safeStats(item.data().statsGlobal) }));
}

export async function getPlayer(id) {
  const snap = await getDoc(doc(db, 'players', id));
  return snap.exists() ? { ...withId(snap), statsGlobal: safeStats(snap.data().statsGlobal) } : null;
}

export async function createPlayer(input) {
  const ref = doc(collection(db, 'players'));
  await setDoc(ref, {
    name: input.name.trim(),
    nickname: input.nickname.trim() || input.name.trim(),
    avatarUrl: input.avatarUrl || '',
    currentTeam: input.currentTeam.trim(),
    accessToken: token(),
    statsGlobal: emptyStats(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePlayer(id, input) {
  await updateDoc(doc(db, 'players', id), { ...input, updatedAt: serverTimestamp() });
}

export async function regeneratePlayerToken(id) {
  const accessToken = token();
  await updateDoc(doc(db, 'players', id), { accessToken, updatedAt: serverTimestamp() });
  return accessToken;
}

export async function listTournaments() {
  try {
    const snap = await getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')));
    return snap.docs.map((item) => withId(item));
  } catch (error) {
    if (import.meta.env.DEV) console.warn('listTournaments ordered query failed; using client fallback.', error);
    const snap = await getDocs(collection(db, 'tournaments'));
    return sortTournamentsDesc(snap.docs.map((item) => withId(item)));
  }
}

export async function getTournament(id) {
  const snap = await getDoc(doc(db, 'tournaments', id));
  return snap.exists() ? withId(snap) : null;
}

function timestampValue(value) {
  if (!value) return 0;
  if (typeof value.seconds === 'number') return value.seconds;
  if (typeof value.toMillis === 'function') return Math.floor(value.toMillis() / 1000);
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  return 0;
}

function tournamentSortValue(tournament) {
  return timestampValue(tournament.createdAt) || timestampValue(tournament.updatedAt) || 0;
}

function sortTournamentsDesc(rows) {
  return [...rows].sort((a, b) => tournamentSortValue(b) - tournamentSortValue(a));
}

export async function getActiveTournament() {
  const statuses = ['draft', 'lobby', 'draw', 'active'];
  try {
    const snap = await getDocs(query(collection(db, 'tournaments'), where('status', 'in', statuses)));
    return sortTournamentsDesc(snap.docs.map((item) => withId(item)))[0] ?? null;
  } catch (error) {
    if (import.meta.env.DEV) console.warn('getActiveTournament status query failed; trying ordered fallback.', error);
    const fallbackSnap = await getDocs(query(collection(db, 'tournaments'), where('status', 'in', statuses), orderBy('createdAt', 'desc'), limit(1)));
    return fallbackSnap.docs[0] ? withId(fallbackSnap.docs[0]) : null;
  }
}

export async function createTournament(input) {
  const ref = doc(collection(db, 'tournaments'));
  await setDoc(ref, {
    name: input.name.trim(),
    season: Number(input.season),
    status: 'draft',
    format: 'knockout16',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

function tournamentPlayerDocId(tournamentId, playerId) {
  return `${tournamentId}_${playerId}`;
}

function sortTournamentPlayers(rows) {
  return [...rows].sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));
}

function dedupeTournamentPlayers(rows) {
  const byPlayerId = new Map();
  sortTournamentPlayers(rows).forEach((row) => {
    if (!byPlayerId.has(row.playerId)) byPlayerId.set(row.playerId, row);
  });
  return [...byPlayerId.values()];
}

export async function listTournamentPlayers(tournamentId) {
  const snap = await getDocs(query(collection(db, 'tournamentPlayers'), where('tournamentId', '==', tournamentId)));
  return dedupeTournamentPlayers(snap.docs.map((item) => withId(item)));
}

export async function addTournamentPlayer(tournamentId, player, teamName) {
  const existing = await listTournamentPlayers(tournamentId);
  if (existing.length >= 16) throw new Error('El torneo ya tiene 16 jugadores.');
  if (existing.some((item) => item.playerId === player.id)) throw new Error('Este jugador ya está en este torneo.');

  const ref = doc(db, 'tournamentPlayers', tournamentPlayerDocId(tournamentId, player.id));
  const current = await getDoc(ref);
  if (current.exists()) throw new Error('Este jugador ya está en este torneo.');

  await setDoc(ref, {
    tournamentId,
    playerId: player.id,
    playerName: player.name,
    playerNickname: player.nickname,
    teamName: (teamName ?? player.currentTeam ?? '').trim(),
    seed: existing.length + 1,
    eliminated: false,
    finalPosition: null,
    ready: false,
    joinedAt: null,
    lastSeenAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}


export async function addTournamentPlayers(tournamentId, selectedPlayers) {
  const existing = await listTournamentPlayers(tournamentId);
  const existingIds = new Set(existing.map((item) => item.playerId));
  const availableSlots = Math.max(0, 16 - existing.length);
  const uniqueSelection = [];
  const seen = new Set();
  selectedPlayers.forEach((player) => {
    if (!player?.id || seen.has(player.id) || existingIds.has(player.id)) return;
    seen.add(player.id);
    uniqueSelection.push(player);
  });
  const playersToAdd = uniqueSelection.slice(0, availableSlots);
  const batch = writeBatch(db);
  playersToAdd.forEach((player, index) => {
    batch.set(doc(db, 'tournamentPlayers', tournamentPlayerDocId(tournamentId, player.id)), {
      tournamentId,
      playerId: player.id,
      playerName: player.name,
      playerNickname: player.nickname,
      teamName: player.currentTeam || '',
      seed: existing.length + index + 1,
      eliminated: false,
      finalPosition: null,
      ready: false,
      joinedAt: null,
      lastSeenAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return playersToAdd.length;
}


export async function updateTournamentPlayerTeam(participant, teamName, { makeDefault = false } = {}) {
  const cleanTeamName = teamName.trim();
  const batch = writeBatch(db);
  batch.update(doc(db, 'tournamentPlayers', participant.id), { teamName: cleanTeamName, updatedAt: serverTimestamp() });
  if (makeDefault) batch.update(doc(db, 'players', participant.playerId), { currentTeam: cleanTeamName, updatedAt: serverTimestamp() });

  const matches = await listMatches(participant.tournamentId);
  matches.filter((match) => match.status !== 'finished' && (match.playerAId === participant.playerId || match.playerBId === participant.playerId)).forEach((match) => {
    batch.update(doc(db, 'matches', match.id), {
      ...(match.playerAId === participant.playerId ? { teamA: cleanTeamName } : {}),
      ...(match.playerBId === participant.playerId ? { teamB: cleanTeamName } : {}),
    });
  });
  await batch.commit();
}

export async function removeTournamentPlayer(id) {
  await deleteDoc(doc(db, 'tournamentPlayers', id));
}

export async function updateTournamentStatus(tournamentId, status) {
  await updateDoc(doc(db, 'tournaments', tournamentId), { status, updatedAt: serverTimestamp() });
}

export async function openTournamentLobby(tournamentId) {
  await updateTournamentStatus(tournamentId, 'lobby');
}

export async function setTournamentPlayerReady(participant, ready = true) {
  await updateDoc(doc(db, 'tournamentPlayers', participant.id), {
    ready,
    ...(ready ? { joinedAt: participant.joinedAt || serverTimestamp(), lastSeenAt: serverTimestamp() } : { joinedAt: null, lastSeenAt: null }),
    updatedAt: serverTimestamp(),
  });
}

export async function resetTournamentPresence(tournamentId) {
  const participants = await listTournamentPlayers(tournamentId);
  const batch = writeBatch(db);
  participants.forEach((participant) => batch.update(doc(db, 'tournamentPlayers', participant.id), { ready: false, joinedAt: null, lastSeenAt: null, updatedAt: serverTimestamp() }));
  await batch.commit();
}

async function findTournamentPlayer(tournamentId, playerId) {
  const deterministic = await getDoc(doc(db, 'tournamentPlayers', tournamentPlayerDocId(tournamentId, playerId)));
  if (deterministic.exists()) return withId(deterministic);
  const snap = await getDocs(query(collection(db, 'tournamentPlayers'), where('tournamentId', '==', tournamentId), where('playerId', '==', playerId), limit(1)));
  return snap.docs[0] ? withId(snap.docs[0]) : null;
}

export async function joinTournamentLobby(tournamentId, playerId, tokenValue) {
  const [player, tournament] = await Promise.all([getPlayer(playerId), getTournament(tournamentId)]);
  if (!player) return { valid: false, reason: 'Jugador no encontrado' };
  if (!tokenValue) return { valid: false, reason: 'Falta el token del magic link', player };
  if (tokenValue !== player.accessToken) return { valid: false, reason: 'Token incorrecto o regenerado', player };
  if (!tournament) return { valid: false, reason: 'Torneo no encontrado', player };
  const participant = await findTournamentPlayer(tournamentId, playerId);
  if (!participant) return { valid: false, reason: 'No estás cargado en este torneo.', player, tournament };
  await updateDoc(doc(db, 'tournamentPlayers', participant.id), {
    ready: true,
    joinedAt: participant.joinedAt || serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const [participants, status] = await Promise.all([listTournamentPlayers(tournamentId), getPlayerTournamentStatus(playerId, tournamentId)]);
  const readyCount = participants.filter((item) => item.ready || item.playerId === playerId).length;
  return { valid: true, player, tournament, participant: { ...participant, ready: true }, participantsCount: participants.length, readyCount, status };
}

export async function listMatches(tournamentId) {
  const snap = await getDocs(query(collection(db, 'matches'), where('tournamentId', '==', tournamentId), orderBy('kickoffOrder')));
  return snap.docs.map((item) => withId(item));
}

export async function listPlayerMatches(playerId) {
  const [asA, asB] = await Promise.all([
    getDocs(query(collection(db, 'matches'), where('playerAId', '==', playerId))),
    getDocs(query(collection(db, 'matches'), where('playerBId', '==', playerId))),
  ]);
  const rows = [...asA.docs, ...asB.docs].map((item) => withId(item));
  return [...new Map(rows.map((match) => [match.id, match])).values()]
    .sort((a, b) => (b.finishedAt?.seconds ?? 0) - (a.finishedAt?.seconds ?? 0));
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
  const [players, existingMatches] = await Promise.all([listTournamentPlayers(tournamentId), listMatches(tournamentId)]);
  if (existingMatches.length > 0) throw new Error('Este torneo ya tiene bracket sorteado.');
  if (players.length !== 16) throw new Error('El sorteo necesita exactamente 16 jugadores únicos.');
  const matches = createInitialMatches(players, tournamentId);
  const batch = writeBatch(db);
  matches.forEach((match) => batch.set(doc(collection(db, 'matches')), { ...match, imageUrl: '', createdAt: serverTimestamp() }));
  batch.update(doc(db, 'tournaments', tournamentId), { status: 'draw', startedAt: serverTimestamp(), updatedAt: serverTimestamp() });
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
    imageUrl: '',
    createdAt: serverTimestamp(),
  });
}

function addAnnualPointEvent(batch, { tournament, playerId, playerName, points, reason, label }) {
  if (!playerId || !points) return;
  const ref = doc(db, 'seasonPointEvents', `${tournament.id}_${playerId}_${reason}`);
  batch.set(ref, {
    id: ref.id,
    playerId,
    playerName: playerName || '',
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    season: tournament.season,
    points,
    reason,
    label,
    createdAt: serverTimestamp(),
  });
}

export async function closeMatch(match, scoreA, scoreB, goals) {
  if (match.status === 'finished') throw new Error('Este partido ya estaba cerrado.');
  const [tournament, participants] = await Promise.all([getTournament(match.tournamentId), listTournamentPlayers(match.tournamentId)]);
  if (!tournament) throw new Error('No existe el torneo.');
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
  goals.filter((goal) => goal.scorerName && goal.quantity > 0).forEach((goal) => {
    batch.set(doc(collection(db, 'goals')), { tournamentId: match.tournamentId, matchId: match.id, ...goal, createdAt: serverTimestamp() });
  });

  const loserParticipant = participants.find((participant) => participant.playerId === winner.loserId);
  if (loserParticipant) batch.update(doc(db, 'tournamentPlayers', loserParticipant.id), { eliminated: true, eliminatedRound: match.round });

  const playerUpdates = [
    { id: match.playerAId, won: winner.winnerId === match.playerAId, gf: scoreA, ga: scoreB, name: match.playerAName },
    { id: match.playerBId, won: winner.winnerId === match.playerBId, gf: scoreB, ga: scoreA, name: match.playerBName },
  ];
  playerUpdates.filter((player) => player.id).forEach((player) => {
    batch.update(doc(db, 'players', player.id), {
      'statsGlobal.matches': increment(1),
      [`statsGlobal.${player.won ? 'wins' : 'losses'}`]: increment(1),
      'statsGlobal.goalsFor': increment(player.gf),
      'statsGlobal.goalsAgainst': increment(player.ga),
      [`statsGlobal.annualPoints.${yearKey(tournament.season)}`]: increment(player.won ? 2 : 0),
    });
    if (player.won) addAnnualPointEvent(batch, { tournament, playerId: player.id, playerName: player.name, points: 2, reason: `win_${match.id}`, label: 'Victoria' });
  });

  batch.update(doc(db, 'tournaments', match.tournamentId), {
    status: match.round === 'FINAL' ? 'finished' : 'active',
    updatedAt: serverTimestamp(),
    ...(match.round === 'FINAL' ? { championPlayerId: winner.winnerId, runnerUpPlayerId: winner.loserId, finishedAt: serverTimestamp() } : {}),
  });
  await batch.commit();

  const slot = nextSlot(match);
  if (slot) await ensureNextMatch(match.tournamentId, slot, { id: winner.winnerId, name: winnerName, team: winnerTeam });
  if (match.round === 'FINAL') await awardTournamentPoints(tournament, winner.winnerId, winner.loserId);
}

function goalsFor(matches, playerId) {
  return matches.reduce((total, match) => {
    if (match.status !== 'finished') return total;
    if (match.playerAId === playerId) return total + Number(match.scoreA ?? 0);
    if (match.playerBId === playerId) return total + Number(match.scoreB ?? 0);
    return total;
  }, 0);
}

function lossesFor(matches, playerId) {
  return matches.filter((match) => match.loserId === playerId).length;
}

function goalsAgainstFor(matches, playerId) {
  return matches.reduce((total, match) => {
    if (match.status !== 'finished') return total;
    if (match.playerAId === playerId) return total + Number(match.scoreB ?? 0);
    if (match.playerBId === playerId) return total + Number(match.scoreA ?? 0);
    return total;
  }, 0);
}

function winsFor(matches, playerId) {
  return matches.filter((match) => match.winnerId === playerId).length;
}

async function awardTournamentPoints(tournament, championId, runnerUpId) {
  const [participants, matches, scorerRows] = await Promise.all([
    listTournamentPlayers(tournament.id),
    listMatches(tournament.id),
    buildScorers(tournament.id),
  ]);
  const semifinalLosers = matches.filter((match) => match.round === 'SF' && match.loserId).map((match) => match.loserId);
  const quarterLosers = matches.filter((match) => match.round === 'QF' && match.loserId).map((match) => match.loserId);
  const r16Losers = matches.filter((match) => match.round === 'R16' && match.loserId).map((match) => match.loserId);
  const topGoals = scorerRows[0]?.goals ?? 0;
  const topScorerIds = topGoals > 0 ? scorerRows.filter((row) => row.goals === topGoals).map((row) => row.playerOwnerId) : [];
  const conceded = participants.map((participant) => ({ playerId: participant.playerId, value: goalsAgainstFor(matches, participant.playerId) }));
  const minConceded = Math.min(...conceded.map((row) => row.value));
  const wallIds = conceded.filter((row) => row.value === minConceded).map((row) => row.playerId);
  const batch = writeBatch(db);

  participants.forEach((participant) => {
    let placement = 'roundOf16';
    let finalPosition = 16;
    if (participant.playerId === championId) {
      placement = 'champion';
      finalPosition = 1;
    } else if (participant.playerId === runnerUpId) {
      placement = 'runnerUp';
      finalPosition = 2;
    } else if (semifinalLosers.includes(participant.playerId)) {
      placement = 'semifinalist';
      finalPosition = 4;
    } else if (quarterLosers.includes(participant.playerId)) {
      placement = 'quarterfinalist';
      finalPosition = 8;
    } else if (r16Losers.includes(participant.playerId)) {
      placement = 'roundOf16';
      finalPosition = 16;
    }

    const placementPointValue = placementPoints[placement];
    const scorerBonus = topScorerIds.includes(participant.playerId) ? 2 : 0;
    const defenseBonus = wallIds.includes(participant.playerId) ? 1 : 0;
    const totalTournamentPoints = winsFor(matches, participant.playerId) * 2 + placementPointValue + scorerBonus + defenseBonus;
    const playerRef = doc(db, 'players', participant.playerId);
    batch.update(playerRef, {
      'statsGlobal.tournamentsPlayed': increment(1),
      ...(participant.playerId === championId ? { 'statsGlobal.titles': increment(1) } : {}),
      ...(participant.playerId === runnerUpId ? { 'statsGlobal.runnerUps': increment(1) } : {}),
      [`statsGlobal.annualPoints.${yearKey(tournament.season)}`]: increment(placementPointValue + scorerBonus + defenseBonus),
    });
    batch.update(doc(db, 'tournamentPlayers', participant.id), { eliminated: participant.playerId !== championId, finalPosition });
    batch.set(doc(db, 'tournamentResults', `${tournament.id}_${participant.playerId}`), {
      id: `${tournament.id}_${participant.playerId}`,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      season: tournament.season,
      playerId: participant.playerId,
      playerName: participant.playerName,
      playerNickname: participant.playerNickname,
      teamName: participant.teamName,
      placement,
      finalPosition,
      pointsEarned: totalTournamentPoints,
      wins: winsFor(matches, participant.playerId),
      losses: lossesFor(matches, participant.playerId),
      goalsFor: goalsFor(matches, participant.playerId),
      goalsAgainst: goalsAgainstFor(matches, participant.playerId),
      title: participant.playerId === championId,
      runnerUp: participant.playerId === runnerUpId,
      placementPoints: placementPointValue,
      victoryPoints: winsFor(matches, participant.playerId) * 2,
      scorerBonus,
      defenseBonus,
      annualPoints: totalTournamentPoints,
      createdAt: serverTimestamp(),
    });
    addAnnualPointEvent(batch, { tournament, playerId: participant.playerId, playerName: participant.playerNickname, points: placementPointValue, reason: `placement_${placement}`, label: placement });
    if (scorerBonus) addAnnualPointEvent(batch, { tournament, playerId: participant.playerId, playerName: participant.playerNickname, points: scorerBonus, reason: 'top_scorer', label: 'Goleador del torneo' });
    if (defenseBonus) addAnnualPointEvent(batch, { tournament, playerId: participant.playerId, playerName: participant.playerNickname, points: defenseBonus, reason: 'best_defense', label: 'Menos goles recibidos' });
  });
  batch.set(doc(collection(db, 'feedEvents')), { tournamentId: tournament.id, text: `Nuevo campeón de la Viva Cup: ${participants.find((p) => p.playerId === championId)?.playerNickname ?? 'campeón'}.`, tone: 'champion', createdAt: serverTimestamp() });
  await batch.commit();
}

export async function buildScorers(tournamentId) {
  const goals = await listGoals(tournamentId);
  const rows = new Map();
  goals.forEach((goal) => {
    const current = rows.get(goal.playerOwnerId) ?? { playerOwnerId: goal.playerOwnerId, playerName: goal.playerOwnerName || 'Jugador', goals: 0, scorers: [] };
    current.goals += goal.quantity || 1;
    if (!current.scorers.includes(goal.scorerName)) current.scorers.push(goal.scorerName);
    rows.set(goal.playerOwnerId, current);
  });
  return [...rows.values()].sort((a, b) => b.goals - a.goals);
}

export async function listTournamentResultsBySeason(year) {
  const snap = await getDocs(query(collection(db, 'tournamentResults'), where('season', '==', Number(year))));
  return snap.docs.map((item) => withId(item)).sort((a, b) => b.annualPoints - a.annualPoints);
}

export async function listPlayerTournamentResults(playerId) {
  const snap = await getDocs(query(collection(db, 'tournamentResults'), where('playerId', '==', playerId)));
  return snap.docs.map((item) => withId(item)).sort((a, b) => (b.season ?? 0) - (a.season ?? 0));
}

export async function listSeasonPointEvents(year) {
  const snap = await getDocs(query(collection(db, 'seasonPointEvents'), where('season', '==', Number(year))));
  return snap.docs.map((item) => withId(item));
}

export async function buildRanking(year) {
  const [players, events] = await Promise.all([listPlayers(), listSeasonPointEvents(year)]);
  const eventPoints = events.reduce((acc, event) => ({ ...acc, [event.playerId]: (acc[event.playerId] ?? 0) + Number(event.points ?? 0) }), {});
  return players.map((player) => ({
    playerId: player.id,
    name: player.name,
    nickname: player.nickname,
    team: player.currentTeam,
    points: eventPoints[player.id] ?? player.statsGlobal?.annualPoints?.[String(year)] ?? 0,
    titles: player.statsGlobal?.titles ?? 0,
    runnerUps: player.statsGlobal?.runnerUps ?? 0,
    wins: player.statsGlobal?.wins ?? 0,
    goalsFor: player.statsGlobal?.goalsFor ?? 0,
    goalsAgainst: player.statsGlobal?.goalsAgainst ?? 0,
  })).sort((a, b) => b.points - a.points || b.wins - a.wins || b.goalsFor - a.goalsFor);
}

export async function getPlayerNextMatch(playerId, tournamentId) {
  const matches = await listMatches(tournamentId);
  return matches.find((match) => match.status !== 'finished' && (match.playerAId === playerId || match.playerBId === playerId)) ?? null;
}

export async function getPlayerRecentMatches(playerId, count = 6) {
  return (await listPlayerMatches(playerId)).filter((match) => match.status === 'finished').slice(0, count);
}

export async function getPlayerSeasonPosition(playerId, season) {
  const ranking = await buildRanking(season);
  const index = ranking.findIndex((row) => row.playerId === playerId);
  const playerRow = index >= 0 ? ranking[index] : null;
  const above = index > 0 ? ranking[index - 1] : null;
  return {
    position: index >= 0 ? index + 1 : null,
    row: playerRow,
    top5: ranking.slice(0, 5),
    pointsBehindAbove: above && playerRow ? Math.max(0, above.points - playerRow.points) : 0,
  };
}

export async function getPlayerTournamentStatus(playerId, tournamentId) {
  const [tournament, participants, matches, scorers] = await Promise.all([
    getTournament(tournamentId),
    listTournamentPlayers(tournamentId),
    listMatches(tournamentId),
    buildScorers(tournamentId),
  ]);
  if (!tournament) return { state: 'Sin torneo activo', tournament: null, participant: null, nextMatch: null, lastMatch: null, topScorers: [] };
  const participant = participants.find((item) => item.playerId === playerId) ?? null;
  const playerMatches = matches.filter((match) => match.playerAId === playerId || match.playerBId === playerId);
  const finished = playerMatches.filter((match) => match.status === 'finished');
  const lastMatch = finished.at(-1) ?? null;
  const nextMatch = playerMatches.find((match) => match.status !== 'finished' && match.playerAId && match.playerBId) ?? null;
  const lostMatch = finished.find((match) => match.loserId === playerId) ?? null;
  const champion = tournament.championPlayerId === playerId;
  const eliminated = Boolean(lostMatch || participant?.eliminated);
  let state = 'Sin torneo activo';
  if (champion) state = 'Campeón';
  else if (eliminated) state = 'Eliminado';
  else if (participant && tournament.status !== 'finished') state = 'En competencia';
  else if (participant) state = 'Torneo finalizado';
  return {
    state,
    tournament,
    participant,
    nextMatch,
    lastMatch,
    lostMatch,
    isAlive: state === 'En competencia',
    isChampion: champion,
    eliminated,
    topScorers: scorers.slice(0, 5),
  };
}

export async function getPlayerDashboard(playerId, tokenValue) {
  const player = await getPlayer(playerId);
  if (!player) return { valid: false, reason: 'Jugador no encontrado', player: null };
  if (!tokenValue) return { valid: false, reason: 'Falta el token del magic link', player };
  if (tokenValue !== player.accessToken) return { valid: false, reason: 'Token incorrecto o regenerado', player };
  const activeTournament = await getActiveTournament();
  const season = activeTournament?.season ?? new Date().getFullYear();
  const [status, recentMatches, seasonPosition, results] = await Promise.all([
    activeTournament ? getPlayerTournamentStatus(playerId, activeTournament.id) : Promise.resolve({ state: 'Sin torneo activo', tournament: null, participant: null, nextMatch: null, lastMatch: null, topScorers: [] }),
    getPlayerRecentMatches(playerId, 6),
    getPlayerSeasonPosition(playerId, season),
    listPlayerTournamentResults(playerId),
  ]);
  return { valid: true, player, activeTournament, status, recentMatches, seasonPosition, results, season };
}


export async function getTournamentBracket(tournamentId) {
  return listMatches(tournamentId);
}

export async function getTopScorers(tournamentId) {
  return buildScorers(tournamentId);
}

export async function getSeasonRanking(season) {
  return buildRanking(season);
}

export function getPlayerBadges(playerId, stats = {}) {
  return badgesForPlayer({
    playerId,
    titles: stats.titles ?? 0,
    runnerUps: stats.runnerUps ?? 0,
    goalsFor: stats.goalsFor ?? 0,
    goalsAgainst: stats.goalsAgainst ?? 0,
    wins: stats.wins ?? 0,
    losses: stats.losses ?? 0,
  });
}

export async function seedDemoData() {
  const names = [
    ['Santiago', 'Santi', 'Real Madrid'], ['Ramiro', 'Rama', 'Manchester City'], ['Tomás', 'Tomi', 'PSG'], ['Nicolás', 'Nico', 'Bayern'],
    ['Francisco', 'Fran', 'Liverpool'], ['Mateo', 'Mati', 'Inter'], ['Lucas', 'Luqui', 'Barcelona'], ['Juan', 'Juani', 'Arsenal'],
    ['Agustín', 'Agus', 'Milan'], ['Martín', 'Tincho', 'Chelsea'], ['Federico', 'Fede', 'Dortmund'], ['Bruno', 'Bruni', 'Napoli'],
    ['Diego', 'D10', 'Atlético'], ['Pablo', 'Pabli', 'Benfica'], ['Ezequiel', 'Eze', 'Tottenham'], ['Andrés', 'Andy', 'Roma'],
  ];
  const createdPlayers = [];
  for (const [name, nickname, currentTeam] of names) {
    const id = await createPlayer({ name, nickname, currentTeam });
    createdPlayers.push(await getPlayer(id));
  }
  const tournamentId = await createTournament({ name: `Viva Cup Demo ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`, season: new Date().getFullYear() });
  for (const player of createdPlayers) await addTournamentPlayer(tournamentId, player, player.currentTeam);
  await runDraw(tournamentId);
  const matches = await listMatches(tournamentId);
  const r16ToClose = matches.filter((match) => match.round === 'R16').slice(0, 5);
  const scorerNames = ['Mbappé', 'Haaland', 'Messi', 'Vini Jr', 'Bellingham', 'Lautaro'];
  for (let index = 0; index < r16ToClose.length; index += 1) {
    const match = r16ToClose[index];
    const scoreA = 2 + (index % 3);
    const scoreB = index % 2;
    await closeMatch(match, scoreA, scoreB, [
      { playerOwnerId: match.playerAId, playerOwnerName: match.playerAName, scorerName: scorerNames[index], quantity: scoreA },
      ...(scoreB ? [{ playerOwnerId: match.playerBId, playerOwnerName: match.playerBName, scorerName: scorerNames[index + 1], quantity: scoreB }] : []),
    ]);
  }
  return tournamentId;
}
