export const roundLabels = {
    GROUP: 'Fase de grupos',
    R16: 'Octavos de final',
    QF: 'Cuartos de final',
    SF: 'Semifinales',
    FINAL: 'Final',
    THIRD_PLACE: 'Tercer puesto',
};
export const roundOrder = ['GROUP', 'R16', 'QF', 'SF', 'FINAL'];
export function shuffle(items) {
    return [...items]
        .map((value) => ({ value, sort: crypto.getRandomValues(new Uint32Array(1))[0] }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
}
export function createInitialMatches(players, tournamentId, mode = 'single_leg') {
    if (players.length !== 16)
        throw new Error('El sorteo necesita exactamente 16 jugadores.');
    const shuffled = shuffle(players);
    if (mode === 'groups_16') {
        const groups = ['A', 'B', 'C', 'D'].map((name, groupIndex) => ({
            name,
            players: shuffled.slice(groupIndex * 4, groupIndex * 4 + 4),
        }));
        const fixtures = [];
        const pairsByRound = [
            [0, 1], [2, 3],
            [0, 2], [1, 3],
            [0, 3], [1, 2],
        ];
        groups.forEach((group, gIndex) => {
            const players = group.players;
            for (let i = 0; i < pairsByRound.length; i += 1) {
                const [aIdx, bIdx] = pairsByRound[i];
                const a = players[aIdx];
                const b = players[bIdx];
                const roundSlot = Math.floor(i / 2) + 1;
                const groupSlot = i % 2 === 0 ? 1 : 2;
                fixtures.push({
                    tournamentId,
                    round: 'GROUP',
                    groupName: group.name,
                    matchNumber: i + 1,
                    bracketPosition: gIndex * 10 + (i + 1),
                    playerAId: a.playerId,
                    playerBId: b.playerId,
                    playerAName: a.playerNickname || a.playerName,
                    playerBName: b.playerNickname || b.playerName,
                    teamA: a.teamName,
                    teamB: b.teamName,
                    status: 'pending',
                    kickoffOrder: (roundSlot * 100) + (groupSlot * 10) + gIndex + 1,
                });
            }
        });
        return fixtures;
    }
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
