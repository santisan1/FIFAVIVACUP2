import type { Badge, Match } from '../types';

export function detectBadges(match: Match): Omit<Badge, 'id' | 'createdAt'>[] {
  if (match.status !== 'confirmed' || !match.winnerId || !match.loserId || match.scoreA == null || match.scoreB == null) return [];
  const badges: Omit<Badge, 'id' | 'createdAt'>[] = [];
  const diff = Math.abs(match.scoreA - match.scoreB);
  const winnerScore = Math.max(match.scoreA, match.scoreB);
  const loserScore = Math.min(match.scoreA, match.scoreB);
  if (match.round === 'FINAL') {
    badges.push({ userId: match.winnerId, tournamentId: match.tournamentId, seasonId: match.seasonId, type: 'champion', label: 'Campeón', description: 'Levantó la Viva Cup.', icon: '🏆' });
    badges.push({ userId: match.loserId, tournamentId: match.tournamentId, seasonId: match.seasonId, type: 'finalist', label: 'Finalista', description: 'Llegó al partido decisivo.', icon: '🥈' });
  }
  if (loserScore === 0) badges.push({ userId: match.winnerId, tournamentId: match.tournamentId, seasonId: match.seasonId, type: 'clean_sheet', label: 'Muralla', description: 'Ganó con valla invicta.', icon: '🧱' });
  if (diff >= 3) badges.push({ userId: match.winnerId, tournamentId: match.tournamentId, seasonId: match.seasonId, type: 'thrashing', label: 'Aplastó', description: `Ganó por ${diff} goles.`, icon: '⚡' });
  if (diff >= 5) badges.push({ userId: match.loserId, tournamentId: match.tournamentId, seasonId: match.seasonId, type: 'brazil_2014', label: 'Modo Brasil 2014', description: `Recibió ${winnerScore} goles.`, icon: '🫠' });
  if (match.penaltiesA != null && match.penaltiesB != null) badges.push({ userId: match.winnerId, tournamentId: match.tournamentId, seasonId: match.seasonId, type: 'survivor', label: 'Sobreviviente', description: 'Ganó por penales.', icon: '🧤' });
  return badges;
}
