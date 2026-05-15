import type { Goal, Match } from '../types';

export function calculatePlayerStats(userId: string, matches: Match[], goals: Goal[] = []) {
  const playedMatches = matches.filter((match) => match.status === 'confirmed' && (match.playerAId === userId || match.playerBId === userId));
  const wins = playedMatches.filter((match) => match.winnerId === userId).length;
  const goalsFor = playedMatches.reduce((total, match) => total + (match.playerAId === userId ? match.scoreA ?? 0 : match.scoreB ?? 0), 0);
  const goalsAgainst = playedMatches.reduce((total, match) => total + (match.playerAId === userId ? match.scoreB ?? 0 : match.scoreA ?? 0), 0);
  const scorerCounts = goals.filter((goal) => goal.ownerUserId === userId).reduce<Record<string, number>>((acc, goal) => {
    acc[goal.scorerName] = (acc[goal.scorerName] ?? 0) + 1;
    return acc;
  }, {});
  const favoriteScorer = Object.entries(scorerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sin datos';

  return {
    played: playedMatches.length,
    wins,
    losses: playedMatches.length - wins,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    effectiveness: playedMatches.length ? Math.round((wins / playedMatches.length) * 100) : 0,
    favoriteScorer,
  };
}
