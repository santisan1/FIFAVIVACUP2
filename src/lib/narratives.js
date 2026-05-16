import { roundLabels } from './bracket';
export function resultNarrative(match, winnerName = 'Alguien', loserName = 'su rival') {
    const score = `${match.scoreA ?? 0}-${match.scoreB ?? 0}`;
    const diff = Math.abs((match.scoreA ?? 0) - (match.scoreB ?? 0));
    if (match.round === 'FINAL')
        return `Nuevo campeón de la Viva Cup: ${winnerName}. Derrotó a ${loserName} por ${score}.`;
    if (diff >= 4)
        return `${winnerName} firmó una goleada histórica ante ${loserName}: ${score}.`;
    if (diff === 1)
        return `${winnerName} sobrevivió a una batalla tensa contra ${loserName} por ${score}.`;
    return `${winnerName} eliminó a ${loserName} por ${score} en ${roundLabels[match.round].toLowerCase()}.`;
}
export function badgesForPlayer(input) {
    const badges = [];
    if (input.titles > 0)
        badges.push('Campeón');
    if (input.runnerUps > 0)
        badges.push('Subcampeón');
    if (input.goalsFor >= 20)
        badges.push('Goleador serial');
    if (input.goalsAgainst <= Math.max(1, input.losses * 2) && input.wins > 2)
        badges.push('Muralla defensiva');
    if (input.losses > input.wins && input.goalsAgainst > 12)
        badges.push('Víctima de goleada');
    if (input.wins >= 4 && input.losses === 0)
        badges.push('Invicto');
    if (input.titles >= 2)
        badges.push('Rey de la noche');
    return badges.length ? badges : ['Aspirante épico'];
}
