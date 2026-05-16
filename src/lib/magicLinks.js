export function appOrigin() {
  return (import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '');
}

export function magicLinkForPlayer(player) {
  return `${appOrigin()}/player/${player.id}?token=${player.accessToken}`;
}

export function getJoinLink(tournamentId, playerId, token) {
  return `${appOrigin()}/join/${tournamentId}/${playerId}?token=${token}`;
}

export function getJoinWhatsappMessage(player, tournamentPlayer, tournament) {
  return `🏆 FIFA Viva Cup\n\n${player.nickname || player.name}, entrá a la sala del torneo con este link:\n\n${getJoinLink(tournament.id, player.id, player.accessToken)}\n\nEquipo asignado: ${tournamentPlayer.teamName || 'pendiente'}\n\nCuando entres, vas a aparecer como presente y esperamos a que estén todos para sortear los cruces.`;
}

export function getAllJoinWhatsappMessages(players, tournamentPlayers, tournament) {
  const byPlayerId = Object.fromEntries(tournamentPlayers.map((participant) => [participant.playerId, participant]));
  return players.map((player) => getJoinWhatsappMessage(player, byPlayerId[player.id] || {}, tournament)).join('\n\n━━━━━━━━━━━━\n\n');
}

export function whatsappMessageForPlayer(player) {
  return `🏆 FIFA Viva Cup\n\n${player.nickname || player.name}, este es tu perfil para seguir el torneo:\n\n${magicLinkForPlayer(player)}\n\nAhí vas a ver tu perfil histórico, el equipo asignado por el admin para el torneo activo, próximo rival, estadísticas, ranking y cómo avanza la noche.`;
}

export function allPlayerLinksMessage(players) {
  const rows = players.map((player) => `${player.nickname || player.name}:\n${magicLinkForPlayer(player)}`).join('\n\n');
  return `🏆 FIFA Viva Cup — Links de jugadores\n\n${rows}`;
}
