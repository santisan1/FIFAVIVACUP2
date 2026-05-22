import { Crown, ShieldAlert, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getPlayerDashboard } from '../lib/firestore';
import { badgesForPlayer } from '../lib/narratives';
import { roundLabels } from '../lib/bracket';

export function PlayerProfilePage() {
  const { playerId = '' } = useParams();
  const [params] = useSearchParams();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const incomingToken = params.get('token');
    if (incomingToken) localStorage.setItem(`fvc_magic_${playerId}`, incomingToken);
    const persistedToken = incomingToken || localStorage.getItem(`fvc_magic_${playerId}`) || '';
    setLoading(true);
    void getPlayerDashboard(playerId, persistedToken)
      .then((data) => {
        if (data?.valid) localStorage.setItem('fvc_last_player_id', playerId);
        if (data?.valid && data?.activeTournament?.id) localStorage.setItem(`fvc_last_tournament_${playerId}`, data.activeTournament.id);
        setDashboard(data);
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.error('No se pudo cargar el magic link.', error);
        setDashboard({ valid: false, reason: 'No se pudo cargar Firestore. Revisá conexión o permisos.' });
      })
      .finally(() => setLoading(false));
  }, [playerId, params]);

  if (loading) return <SplashScreen />;
  if (!dashboard?.valid) return <InvalidLink reason={dashboard?.reason} />;
  if (showIntro) return <SplashScreen onEnter={() => setShowIntro(false)} playerName={dashboard?.player?.nickname || dashboard?.player?.name} tournamentName={dashboard?.activeTournament?.name} />;

  const { player, activeTournament, status, recentMatches, seasonPosition, results, tournaments = [], season } = dashboard;
  const stats = player.statsGlobal;
  const badges = badgesForPlayer({ titles: stats.titles, runnerUps: stats.runnerUps, goalsFor: stats.goalsFor, goalsAgainst: stats.goalsAgainst, wins: stats.wins, losses: stats.losses });
  const mainBadge = status.isChampion ? '🏆 Campeón' : badges[0];
  const annualPoints = seasonPosition.row?.points ?? stats.annualPoints?.[String(season)] ?? 0;
  const participant = status.participant;
  const tournamentTeam = participant?.teamName || '';
  const next = participant ? status.nextMatch : null;
  const last = status.lastMatch;
  const lost = status.lostMatch;

  return (
    <div className="space-y-6">
      <section className={`glass overflow-hidden rounded-[2rem] p-6 shadow-card ${status.isChampion ? 'border-pending/40 bg-pending/10' : ''}`}>
        <p className="text-xs font-black uppercase tracking-[.3em] text-electric">FIFAVIVA CUP · Modo jugador</p>
        <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black">{mainBadge}</div>
            <h1 className="text-5xl font-black md:text-6xl">{player.nickname}</h1>
            <p className="mt-2 text-slate-300">Perfil histórico: {player.name}</p>
            <p className="mt-2 text-sm font-black text-electric">Equipo en torneo activo: {tournamentTeam || 'pendiente / no cargado'}</p>
            <p className="mt-3 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-black">Estado: {status.state}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <StatCard label={`Puntos ${season}`} value={annualPoints} hot />
            <StatCard label="Posición anual" value={seasonPosition.position ? `#${seasonPosition.position}` : '-'} />
          </div>
        </div>
      </section>

      <section className="glass rounded-3xl p-5 shadow-card">
        <h2 className="text-xl font-black">Tu camino en el torneo</h2>
        {!activeTournament && <Empty text="Todavía no hay torneo activo." />}
        {activeTournament && !participant && <Empty text="Todavía no estás cargado en el torneo activo." />}
        {activeTournament && participant && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-3xl bg-white/5 p-4"><p className="text-xs uppercase tracking-[.2em] text-slate-400">Torneo activo</p><b className="mt-2 block text-lg">{activeTournament.name}</b><p className="text-sm text-slate-400">{activeTournament.status} · seed {participant.seed}</p></div>
            <div className="rounded-3xl bg-white/5 p-4"><p className="text-xs uppercase tracking-[.2em] text-slate-400">Equipo usado en este torneo</p><b className="mt-2 block text-lg">{tournamentTeam || 'Equipo pendiente'}</b><p className="text-sm text-slate-400">No editable desde el magic link.</p></div>
            <div className="rounded-3xl bg-white/5 p-4"><p className="text-xs uppercase tracking-[.2em] text-slate-400">Próximo rival</p>{next ? <><b className="mt-2 block text-lg">vs {next.playerAId === player.id ? next.playerBName : next.playerAName}</b><p className="text-sm text-slate-400">{roundLabels[next.round]} · {next.playerAId === player.id ? next.teamB : next.teamA}</p></> : <p className="mt-2 text-sm text-slate-300">{status.isChampion ? 'Levantaste la copa.' : status.eliminated ? 'Camino cerrado.' : 'Esperando rival.'}</p>}</div>
            <div className="rounded-3xl bg-white/5 p-4"><p className="text-xs uppercase tracking-[.2em] text-slate-400">Último resultado</p>{last ? <><b className="mt-2 block text-lg">{last.playerAName} {last.scoreA}-{last.scoreB} {last.playerBName}</b><p className={last.winnerId === player.id ? 'text-sm text-winner' : 'text-sm text-danger'}>{last.winnerId === player.id ? 'Victoria' : 'Derrota'} · {roundLabels[last.round]}</p></> : <p className="mt-2 text-sm text-slate-300">Todavía no jugaste.</p>}</div>
          </div>
        )}
        {lost && <p className="mt-3 rounded-2xl bg-danger/10 p-3 text-sm text-danger">Eliminado en {roundLabels[lost.round]} contra {lost.winnerId === lost.playerAId ? lost.playerAName : lost.playerBName}.</p>}
        {status.isChampion && <p className="mt-3 rounded-2xl bg-pending/10 p-3 text-sm font-black text-pending"><Crown className="mr-2 inline h-4 w-4" /> Campeón de la noche. Modo leyenda activado.</p>}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Últimos partidos">{recentMatches.length === 0 ? <Empty text="Aún no hay partidos cerrados." /> : recentMatches.map((match) => {
          const tournamentName = tournaments.find((tournament) => tournament.id === match.tournamentId)?.name || 'Torneo';
          return <div key={match.id} className="rounded-2xl bg-white/5 p-3 text-sm"><b>{match.playerAName} {match.scoreA}-{match.scoreB} {match.playerBName}</b><p className={match.winnerId === player.id ? 'text-winner' : 'text-danger'}>{match.winnerId === player.id ? 'Victoria' : 'Derrota'} · {roundLabels[match.round]}</p><p className="text-xs text-slate-400">Torneo: {tournamentName}</p></div>;
        })}</Panel>
        <Panel title="Ranking anual"><p className="text-xs text-slate-400">Acumula por jugador permanente, no por equipo ni por participación.</p><p className="mt-2 rounded-xl bg-electric/10 px-3 py-2 text-xs text-electric">Tip celu: girá el teléfono a horizontal para ver más columnas. También podés deslizar la tabla hacia los costados.</p><div className="mt-3 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[420px] text-sm"><thead className="bg-white/5 text-left text-xs uppercase tracking-[.2em] text-slate-400"><tr><th className="p-3">#</th><th className="p-3">Jugador</th><th className="p-3">Pts</th></tr></thead><tbody>{seasonPosition.top5.map((row, index) => <tr key={row.playerId} className={`border-t border-white/10 ${row.playerId === player.id ? 'bg-electric/10' : ''}`}><td className="p-3 font-black">{index + 1}</td><td className="p-3">{row.nickname}<p className="text-xs text-slate-400">{row.team || 'sin equipo'}</p></td><td className="p-3 font-black text-electric">{row.points}</td></tr>)}</tbody></table></div>{seasonPosition.pointsBehindAbove > 0 && <p className="mt-2 text-xs text-slate-400">Estás a {seasonPosition.pointsBehindAbove} pts del de arriba.</p>}</Panel>
        <Panel title="Torneos jugados"><p className="text-xs text-slate-400">Historial de torneos cerrados con posición y puntos.</p>{results.length === 0 ? <Empty text="Todavía no hay torneos cerrados." /> : <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full text-sm"><thead className="bg-white/5 text-left text-xs uppercase tracking-[.2em] text-slate-400"><tr><th className="p-3">Temporada</th><th className="p-3">Torneo</th><th className="p-3">Puesto</th><th className="p-3">Pts</th></tr></thead><tbody>{results.map((result) => <tr key={result.id} className="border-t border-white/10"><td className="p-3">{result.season}</td><td className="p-3">{result.tournamentName}</td><td className="p-3">{result.placement}</td><td className="p-3 font-black text-electric">+{result.annualPoints}</td></tr>)}</tbody></table></div>}</Panel>
        <Panel title="Badges"><div className="flex flex-wrap gap-2">{badges.map((badge) => <span key={badge} className="rounded-full border border-electric/30 bg-electric/10 px-3 py-2 text-xs font-black text-electric">{badge}</span>)}</div></Panel>
      </section>

      <section className="glass rounded-3xl p-5 shadow-card">
        <h2 className="text-xl font-black">Tabla de estadísticas</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-[.2em] text-slate-400"><tr><th className="p-3">Métrica</th><th className="p-3">Valor</th></tr></thead>
            <tbody>
              {[['Partidos jugados', stats.matches], ['Victorias', stats.wins], ['Derrotas', stats.losses], ['Goles a favor', stats.goalsFor], ['Goles en contra', stats.goalsAgainst], ['Diferencia de gol', stats.goalsFor - stats.goalsAgainst], ['Títulos', stats.titles], ['Subcampeonatos', stats.runnerUps], [`Puntos temporada ${season}`, annualPoints]].map(([label, value]) => <tr key={label} className="border-t border-white/10"><td className="p-3">{label}</td><td className="p-3 font-black text-electric">{value}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {activeTournament && <Link className="btn btn-primary" to={`/tournament/${activeTournament.id}`}>Ver torneo completo</Link>}
        <Link className="btn btn-ghost" to={`/season/${season}`}>Ver ranking anual</Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, hot = false }) { return <div className={`glass rounded-3xl p-4 text-center shadow-card ${hot ? 'bg-electric/10' : ''}`}><p className="text-[10px] uppercase tracking-[.22em] text-slate-400">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>; }
function Panel({ title, children }) { return <section className="glass rounded-3xl p-5 shadow-card"><h2 className="mb-4 text-xl font-black">{title}</h2><div className="space-y-2">{children}</div></section>; }
function Empty({ text }) { return <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">{text}</p>; }
function Skeleton() { return <div className="space-y-4"><div className="glass h-48 animate-pulse rounded-[2rem]" /><div className="grid gap-4 md:grid-cols-3"><div className="glass h-32 animate-pulse rounded-3xl" /><div className="glass h-32 animate-pulse rounded-3xl" /><div className="glass h-32 animate-pulse rounded-3xl" /></div></div>; }
function InvalidLink({ reason }) { return <div className="mx-auto max-w-lg glass rounded-3xl p-6 text-center shadow-card"><ShieldAlert className="mx-auto h-10 w-10 text-danger" /><h1 className="mt-3 text-2xl font-black">Link inválido</h1><p className="mt-2 text-slate-300">{reason || 'Este link no es válido o fue regenerado. Pedile uno nuevo al admin.'}</p></div>; }

function SplashScreen({ onEnter, playerName, tournamentName }) { return <div className="mx-auto max-w-3xl glass rounded-[2rem] p-8 text-center shadow-card"><p className="text-xs font-black uppercase tracking-[.35em] text-electric">FIFAVIVA CUP</p><h1 className="mt-4 text-5xl font-black md:text-7xl">Noche de torneo</h1><p className="mt-4 text-slate-300">{playerName ? `${playerName}, ` : ''}tu perfil está listo para competir{tournamentName ? ` en ${tournamentName}` : ''}.</p>{onEnter ? <button className="btn btn-primary mt-6" onClick={onEnter}><Trophy className="h-4 w-4" /> Entrar al torneo</button> : <p className="mt-6 text-sm text-slate-400">Cargando vestuario...</p>}</div>; }
