import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../src/lib/firebase.js';
import { emptyStats } from '../src/types/index.js';

function chunk(items, size = 400) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function yearKey(season) {
  return String(season ?? new Date().getFullYear());
}

(async () => {
  console.log('⚠️ Recalculando puntos con regla: victoria=3, empate=1...');

  const [playersSnap, tournamentsSnap, matchesSnap, resultsSnap, eventsSnap] = await Promise.all([
    getDocs(collection(db, 'players')),
    getDocs(collection(db, 'tournaments')),
    getDocs(collection(db, 'matches')),
    getDocs(collection(db, 'tournamentResults')),
    getDocs(collection(db, 'seasonPointEvents')),
  ]);

  const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const tournaments = tournamentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const results = resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const playerBase = new Map();
  players.forEach((p) => {
    const stats = p.statsGlobal || {};
    playerBase.set(p.id, {
      matches: Number(stats.matches ?? 0),
      wins: Number(stats.wins ?? 0),
      losses: Number(stats.losses ?? 0),
      goalsFor: Number(stats.goalsFor ?? 0),
      goalsAgainst: Number(stats.goalsAgainst ?? 0),
      titles: Number(stats.titles ?? 0),
      runnerUps: Number(stats.runnerUps ?? 0),
      tournamentsPlayed: Number(stats.tournamentsPlayed ?? 0),
      annualPoints: { ...(stats.annualPoints || {}) },
    });
  });

  // Rebuild annual points strictly from events with new win value.
  const annualByPlayer = new Map();
  const incAnnual = (playerId, season, points) => {
    if (!playerId || !Number.isFinite(points)) return;
    const year = yearKey(season);
    const current = annualByPlayer.get(playerId) || {};
    current[year] = Number(current[year] ?? 0) + Number(points);
    annualByPlayer.set(playerId, current);
  };

  for (const ev of events) {
    const points = String(ev.reason || '').startsWith('win_') ? 3 : Number(ev.points ?? 0);
    incAnnual(ev.playerId, ev.season, points);
  }

  // Update event docs for win_ reasons to 3.
  for (const group of chunk(events, 350)) {
    const batch = writeBatch(db);
    group.forEach((ev) => {
      if (String(ev.reason || '').startsWith('win_') && Number(ev.points) !== 3) {
        batch.update(doc(db, 'seasonPointEvents', ev.id), { points: 3 });
      }
    });
    await batch.commit();
  }

  // Update player annual points.
  for (const group of chunk(players, 350)) {
    const batch = writeBatch(db);
    group.forEach((p) => {
      const base = playerBase.get(p.id) || emptyStats();
      batch.update(doc(db, 'players', p.id), {
        statsGlobal: {
          ...base,
          annualPoints: annualByPlayer.get(p.id) || {},
        },
      });
    });
    await batch.commit();
  }

  // Recalculate tournamentResults pointsEarned/victoryPoints from matches with 3/1 rule.
  const matchesByTournament = matches.reduce((acc, m) => {
    (acc[m.tournamentId] ||= []).push(m);
    return acc;
  }, {});

  const tournamentById = Object.fromEntries(tournaments.map((t) => [t.id, t]));

  const calcVictoryPoints = (playerId, tournamentMatches) => tournamentMatches.reduce((total, match) => {
    if (match.status !== 'finished') return total;
    const plays = match.playerAId === playerId || match.playerBId === playerId;
    if (!plays) return total;
    const sa = Number(match.scoreA ?? 0);
    const sb = Number(match.scoreB ?? 0);
    if (sa === sb) return total + 1;
    return total + (match.winnerId === playerId ? 3 : 0);
  }, 0);

  for (const group of chunk(results, 350)) {
    const batch = writeBatch(db);
    group.forEach((row) => {
      const tournament = tournamentById[row.tournamentId];
      const tMatches = matchesByTournament[row.tournamentId] || [];
      const victoryPoints = calcVictoryPoints(row.playerId, tMatches);
      const placementPoints = Number(row.placementPoints ?? 0);
      const scorerBonus = Number(row.scorerBonus ?? 0);
      const defenseBonus = Number(row.defenseBonus ?? 0);
      const total = victoryPoints + placementPoints + scorerBonus + defenseBonus;
      batch.update(doc(db, 'tournamentResults', row.id), {
        victoryPoints,
        pointsEarned: total,
        annualPoints: total,
        season: tournament?.season ?? row.season,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  console.log('✅ Recalculo terminado: victoria=3, empate=1 aplicado en anual/eventos/resultados.');
})();
