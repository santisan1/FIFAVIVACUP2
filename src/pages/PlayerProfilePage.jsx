import { Crown, ShieldAlert, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ScorersTable } from '../components/ScorersTable';
import { getPlayerDashboard } from '../lib/firestore';
import { badgesForPlayer } from '../lib/narratives';
import { roundLabels } from '../lib/bracket';

export function PlayerProfilePage() {
  const { playerId = '' } = useParams();
  const [params] = useSearchParams();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void getPlayerDashboard(playerId, params.get('token')).then(setDashboard).finally(() => setLoading(false));
  }, [playerId, params]);

  if (loading) return <Skeleton />;
  if (!dashboard?.valid) return <InvalidLink />;

  const { player, activeTournament, status, recentMatches, seasonPosition, results, season } = dashboard;
  const stats = player.statsGlobal;
  const badges = badgesForPlayer({ titles: stats.titles, runnerUps: stats.runnerUps, goalsFor: stats.goalsFor, goalsAgainst: stats.goalsAgainst, wins: stats.wins, losses: stats.losses });
  const mainBadge = status.isChampion ? '🏆 Campeón' : badges[0];
  const annualPoints = stats.annualPoints?.[String(season)] ?? seasonPosition.row?.points ?? 0;
  const next = status.nextMatch;
  const last = status.lastMatch;
  const lost = status.lostMatch;

  return (
    <div className="space-y-6">
      <section className={`glass overflow-hidden rounded-[2rem] p-6 shadow-card ${status.isChampion ? 'border-pending/40 bg-pending/10' : ''}`}>
        <p className="text-xs font-black uppercase tracking-[.3em] text-electric">Player Magic Link Mode</p>
        <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black">{mainBadge}</div>
            <h1 className="text-5xl font-black md:text-6xl">{player.nickname}</h1>
            <p className="mt-2 text-slate-300">{player.name} · {player.currentTeam || 'Equipo pendiente'}</p>
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
        {activeTournament && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl bg-white/5 p-4"><p className="text-xs uppercase tracking-[.2em] text-slate-400">Torneo activo</p><b className="mt-2 block text-lg">{activeTournament.name}</b><p className="text-sm text-slate-400">{activeTournament.status}</p></div>
            <div className="rounded-3xl bg-white/5 p-4"><p className="text-xs uppercase tracking-[.2em] text-slate-400">Próximo paso</p>{next ? <><b className="mt-2 block text-lg">vs {next.playerAId === player.id ? next.playerBName : next.playerAName}</b><p className="text-sm text-slate-400">{roundLabels[next.round]} · {next.playerAId === player.id ? next.teamB : next.teamA}</p></> : <p className="mt-2 text-sm text-slate-300">{status.isChampion ? 'Levantaste la copa.' : status.eliminated ? 'Camino cerrado.' : 'Esperando rival.'}</p>}</div>
            <div className="rounded-3xl bg-white/5 p-4"><p className="text-xs uppercase tracking-[.2em] text-slate-400">Último resultado</p>{last ? <><b className="mt-2 block text-lg">{last.playerAName} {last.scoreA}-{last.scoreB} {last.playerBName}</b><p className={last.winnerId === player.id ? 'text-sm text-winner' : 'text-sm text-danger'}>{last.winnerId === player.id ? 'Victoria' : 'Derrota'} · {roundLabels[last.round]}</p></> : <p className="mt-2 text-sm text-slate-300">Todavía no jugaste.</p>}</div>
          </div>
        )}
        {lost && <p className="mt-3 rounded-2xl bg-danger/10 p-3 text-sm text-danger">Eliminado en {roundLabels[lost.round]} contra {lost.winnerId === lost.playerAId ? lost.playerAName : lost.playerBName}.</p>}
        {status.isChampion && <p className="mt-3 rounded-2xl bg-pending/10 p-3 text-sm font-black text-pending"><Crown className="mr-2 inline h-4 w-4" /> Campeón de la noche. Modo leyenda activado.</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-9">
        {[['PJ', stats.matches], ['W', stats.wins], ['L', stats.losses], ['GF', stats.goalsFor], ['GC', stats.goalsAgainst], ['DIF', stats.goalsFor - stats.goalsAgainst], ['Títulos', stats.titles], ['Finales', stats.runnerUps], ['Pts', annualPoints]].map(([label, value]) => <StatCard key={label} label={label} value={value} />)}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Últimos partidos">{recentMatches.length === 0 ? <Empty text="Aún no hay partidos cerrados." /> : recentMatches.map((match) => <div key={match.id} className="rounded-2xl bg-white/5 p-3 text-sm"><b>{match.playerAName} {match.scoreA}-{match.scoreB} {match.playerBName}</b><p className={match.winnerId === player.id ? 'text-winner' : 'text-danger'}>{match.winnerId === player.id ? 'Victoria' : 'Derrota'} · {roundLabels[match.round]}</p></div>)}</Panel>
        <Panel title="Ranking anual"><div className="space-y-2">{seasonPosition.top5.map((row, index) => <div key={row.playerId} className={`flex items-center justify-between rounded-2xl p-3 text-sm ${row.playerId === player.id ? 'bg-electric/15' : 'bg-white/5'}`}><span>#{index + 1} {row.nickname}</span><b>{row.points} pts</b></div>)}{seasonPosition.pointsBehindAbove > 0 && <p className="text-xs text-slate-400">Estás a {seasonPosition.pointsBehindAbove} pts del de arriba.</p>}</div></Panel>
        <Panel title="Top goleadores del torneo"><ScorersTable rows={status.topScorers ?? []} highlightPlayerId={player.id} /></Panel>
        <Panel title="Torneos jugados">{results.length === 0 ? <Empty text="Todavía no hay torneos cerrados." /> : results.slice(0, 5).map((result) => <div key={result.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-3 text-sm"><span>{result.tournamentName}<br /><small className="text-slate-400">{result.placement}</small></span><b className="text-electric">+{result.annualPoints}</b></div>)}</Panel>
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
function InvalidLink() { return <div className="mx-auto max-w-lg glass rounded-3xl p-6 text-center shadow-card"><ShieldAlert className="mx-auto h-10 w-10 text-danger" /><h1 className="mt-3 text-2xl font-black">Link inválido</h1><p className="mt-2 text-slate-300">Este link no es válido o fue regenerado. Pedile uno nuevo al admin.</p></div>; }
