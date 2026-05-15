import type { Match } from '../types';

export function buildNarrative(match: Match) {
  const winner = match.winnerId === match.playerAId ? match.playerAName : match.playerBName;
  const loser = match.winnerId === match.playerAId ? match.playerBName : match.playerAName;
  const score = `${match.scoreA}-${match.scoreB}`;
  const penalties = match.penaltiesA != null ? ` y sobrevivió en penales (${match.penaltiesA}-${match.penaltiesB})` : '';
  if (match.round === 'FINAL') return `${winner} tocó la gloria de la Viva Cup tras vencer ${score} a ${loser}${penalties}. Noche grande, historia grande.`;
  if (Math.abs((match.scoreA ?? 0) - (match.scoreB ?? 0)) >= 3) return `${winner} pasó como una tromba: ${score} ante ${loser}. El cuadro ya tomó nota.`;
  return `${winner} avanzó con autoridad tras vencer ${score} a ${loser}${penalties}. Sigue firme en carrera y mete presión al resto.`;
}
