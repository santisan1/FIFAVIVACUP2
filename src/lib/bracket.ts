import type { Match, Participant, Round } from '../types';

export const roundLabels: Record<Round, string> = {
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semifinal',
  FINAL: 'Final',
};

export function shuffleParticipants(participants: Participant[]) {
  return [...participants].sort(() => Math.random() - 0.5);
}

export function createR16Matches(participants: Participant[], tournamentId: string, seasonId: string): Omit<Match, 'id'>[] {
  if (participants.length !== 16) throw new Error('El sorteo necesita exactamente 16 participantes.');
  const shuffled = shuffleParticipants(participants);
  return Array.from({ length: 8 }, (_, index) => {
    const a = shuffled[index * 2];
    const b = shuffled[index * 2 + 1];
    return {
      tournamentId,
      seasonId,
      round: 'R16',
      roundLabel: roundLabels.R16,
      matchNumber: index + 1,
      bracketPosition: index + 1,
      playerAId: a.userId,
      playerBId: b.userId,
      playerAName: a.nickname,
      playerBName: b.nickname,
      teamAName: a.teamName,
      teamBName: b.teamName,
      status: 'ready',
    };
  });
}

export function getNextRoundSlot(match: Pick<Match, 'round' | 'bracketPosition'>) {
  if (match.round === 'FINAL') return null;
  const nextRound: Round = match.round === 'R16' ? 'QF' : match.round === 'QF' ? 'SF' : 'FINAL';
  const nextPosition = Math.ceil(match.bracketPosition / 2);
  const slot: 'A' | 'B' = match.bracketPosition % 2 === 1 ? 'A' : 'B';
  return { nextRound, nextPosition, slot };
}

export function calculateWinner(match: Match) {
  if (match.scoreA == null || match.scoreB == null) throw new Error('Faltan goles del partido.');
  if (!match.playerAId || !match.playerBId) throw new Error('El partido no tiene ambos jugadores.');
  if (match.scoreA > match.scoreB) return { winnerId: match.playerAId, loserId: match.playerBId };
  if (match.scoreB > match.scoreA) return { winnerId: match.playerBId, loserId: match.playerAId };
  if (match.penaltiesA == null || match.penaltiesB == null || match.penaltiesA === match.penaltiesB) {
    throw new Error('Si empatan, cargá penales con un ganador.');
  }
  return match.penaltiesA > match.penaltiesB
    ? { winnerId: match.playerAId, loserId: match.playerBId }
    : { winnerId: match.playerBId, loserId: match.playerAId };
}

export function advanceWinnerToNextRound(match: Match) {
  const result = calculateWinner(match);
  const next = getNextRoundSlot(match);
  return { ...result, next };
}
