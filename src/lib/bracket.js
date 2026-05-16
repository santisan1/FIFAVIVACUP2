export const roundLabels = {
    R16: 'Octavos de final',
    QF: 'Cuartos de final',
    SF: 'Semifinales',
    FINAL: 'Final',
    THIRD_PLACE: 'Tercer puesto',
};
export const roundOrder = ['R16', 'QF', 'SF', 'FINAL'];
export function shuffle(items) {
    return [...items]
        .map((value) => ({ value, sort: crypto.getRandomValues(new Uint32Array(1))[0] }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
}
export function createInitialMatches(players, tournamentId) {
    if (players.length !== 16)
        throw new Error('El sorteo necesita exactamente 16 jugadores.');
    const shuffled = shuffle(players);
    return Array.from({ length: 8 }, (_, index) => {
        const a = shuffled[index * 2];
        const b = shuffled[index * 2 + 1];
        return {
            tournamentId,
            round: 'R16',
            matchNumber: index + 1,
            bracketPosition: index + 1,
            playerAId: a.playerId,
            playerBId: b.playerId,
            playerAName: a.playerNickname || a.playerName,
            playerBName: b.playerNickname || b.playerName,
            teamA: a.teamName,
            teamB: b.teamName,
            status: 'pending',
            kickoffOrder: index + 1,
        };
    });
}
export function nextSlot(match) {
    if (match.round === 'FINAL' || match.round === 'THIRD_PLACE')
        return null;
    const nextRound = match.round === 'R16' ? 'QF' : match.round === 'QF' ? 'SF' : 'FINAL';
    return {
        round: nextRound,
        position: Math.ceil(match.bracketPosition / 2),
        slot: match.bracketPosition % 2 === 1 ? 'A' : 'B',
    };
}
export function getWinner(match) {
    if (!match.playerAId || !match.playerBId)
        throw new Error('El partido todavía no tiene dos jugadores.');
    if (match.scoreA == null || match.scoreB == null)
        throw new Error('Cargá ambos resultados.');
    if (match.scoreA === match.scoreB)
        throw new Error('Debe haber un ganador. Cargá penales como goles finales si hace falta.');
    return match.scoreA > match.scoreB
        ? { winnerId: match.playerAId, loserId: match.playerBId, winnerName: match.playerAName, loserName: match.playerBName }
        : { winnerId: match.playerBId, loserId: match.playerAId, winnerName: match.playerBName, loserName: match.playerAName };
}
export function pointsForExit(round) {
    if (round === 'FINAL')
        return 7;
    if (round === 'SF')
        return 5;
    if (round === 'QF')
        return 3;
    return 1;
}
