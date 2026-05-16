import { ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { badgesForPlayer } from '../lib/narratives';
import { getPlayer } from '../lib/firestore';
export function PlayerProfilePage() {
    const { playerId = '' } = useParams();
    const [params] = useSearchParams();
    const [player, setPlayer] = useState(null);
    useEffect(() => { void getPlayer(playerId).then(setPlayer); }, [playerId]);
    if (!player)
        return <div className="glass rounded-3xl p-6">Cargando perfil...</div>;
    if (params.get('token') !== player.accessToken)
        return <div className="glass rounded-3xl p-6"><ShieldAlert className="text-danger"/><h1 className="mt-3 text-2xl font-black">Magic link inválido</h1><p className="text-slate-300">Pedile al admin un nuevo link de acceso.</p></div>;
    const stats = player.statsGlobal;
    const badges = badgesForPlayer({ titles: stats.titles, runnerUps: stats.runnerUps, goalsFor: stats.goalsFor, goalsAgainst: stats.goalsAgainst, wins: stats.wins, losses: stats.losses });
    return <div className="space-y-6"><section className="glass rounded-[2rem] p-6"><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Perfil jugador</p><h1 className="text-5xl font-black">{player.nickname}</h1><p className="mt-2 text-slate-300">{player.name} · {player.currentTeam}</p><div className="mt-4 flex flex-wrap gap-2">{badges.map((badge) => <span key={badge} className="rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-xs font-black text-electric">{badge}</span>)}</div></section><section className="grid gap-4 md:grid-cols-4">{[['Títulos', stats.titles], ['Sub', stats.runnerUps], ['PJ', stats.matches], ['Victorias', stats.wins], ['Derrotas', stats.losses], ['GF', stats.goalsFor], ['GC', stats.goalsAgainst], ['DIF', stats.goalsFor - stats.goalsAgainst]].map(([label, value]) => <div key={label} className="glass rounded-3xl p-5"><p className="text-xs uppercase tracking-[.25em] text-slate-400">{label}</p><p className="mt-2 text-4xl font-black">{value}</p></div>)}</section><section className="glass rounded-3xl p-5"><h2 className="text-xl font-black">Historial reciente</h2><p className="mt-2 text-sm text-slate-300">Preparado para listar últimos partidos del jugador cuando el torneo tenga actividad.</p></section></div>;
}
