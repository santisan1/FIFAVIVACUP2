import type { Match, Participant, Tournament } from '../types';

export interface RankingRow {
  userId: string;
  name: string;
  teamName: string;
  points: number;
  wins: number;
  played: number;
  goalDiff: number;
}

export function calculateRanking(participants: Participant[], matches: Match[], tournaments: Tournament[] = []): RankingRow[] {
  const rows = new Map<string, RankingRow>();
  participants.forEach((participant) => rows.set(participant.userId, {
    userId: participant.userId,
    name: participant.nickname,
    teamName: participant.teamName,
    points: 1,
    wins: 0,
    played: 0,
    goalDiff: 0,
  }));

  matches.filter((match) => match.status === 'confirmed').forEach((match) => {
    if (!match.playerAId || !match.playerBId || match.scoreA == null || match.scoreB == null) return;
    const a = rows.get(match.playerAId);
    const b = rows.get(match.playerBId);
    if (!a || !b) return;
    a.played += 1; b.played += 1;
    a.goalDiff += match.scoreA - match.scoreB;
    b.goalDiff += match.scoreB - match.scoreA;
    const winner = match.winnerId ? rows.get(match.winnerId) : null;
    if (winner) { winner.wins += 1; winner.points += 2; }
    if (Math.abs(match.scoreA - match.scoreB) >= 3 && winner) winner.points += 1;
    if (match.scoreA === 0) b.points += 1;
    if (match.scoreB === 0) a.points += 1;
    if (match.scoreA - match.scoreB >= 5) a.points += 1, b.points -= 1;
    if (match.scoreB - match.scoreA >= 5) b.points += 1, a.points -= 1;
  });

  tournaments.forEach((tournament) => {
    if (tournament.championId && rows.has(tournament.championId)) rows.get(tournament.championId)!.points += 12;
    if (tournament.runnerUpId && rows.has(tournament.runnerUpId)) rows.get(tournament.runnerUpId)!.points += 8;
  });

  return [...rows.values()].sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.wins - a.wins);
}
