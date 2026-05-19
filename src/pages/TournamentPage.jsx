import { Crown, Radio, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BracketView } from '../components/BracketView';
import { DrawReveal } from '../components/DrawReveal';
import { ScorersTable } from '../components/ScorersTable';
import { roundLabels } from '../lib/bracket';
import { buildRanking, buildScorers, getPlayer, getTournament, listFeed, listMatches, listTournamentPlayers, listTournamentResultsBySeason } from '../lib/firestore';

export function TournamentPage() {
  const { id = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [feed, setFeed] = useState([]);
  const [champion, setChampion] = useState('');
  const [participants, setParticipants] = useState([]);
  const [tournamentResults, setTournamentResults] = useState([]);
  const [finalStep, setFinalStep] = useState(0);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      const t = await getTournament(id);
      setTournament(t);
      const [matchRows, scorerRows, feedRows, rankingRows, participantRows, seasonResults] = await Promise.all([listMatches(id), buildScorers(id), listFeed(id), t ? buildRanking(t.season) : Promise.resolve([]), listTournamentPlayers(id), t ? listTournamentResultsBySeason(t.season) : Promise.resolve([])]);
      setMatches(matchRows);
      setScorers(scorerRows);
      setFeed(feedRows);
      setRanking(rankingRows.slice(0, 5));
      setParticipants(participantRows);
      setTournamentResults(seasonResults.filter((result) => result.tournamentId === id));
      if (t?.championPlayerId) setChampion((await getPlayer(t.championPlayerId))?.nickname ?? 'Campeón');
    })().finally(() => setLoading(false));
  }, [id]);

  const pending = useMemo(() => matches.filter((match) => match.status !== 'finished' && match.playerAId && match.playerBId).slice(0, 5), [matches]);
  const latest = useMemo(() => matches.filter((match) => match.status === 'finished').slice(-5).reverse(), [matches]);

  const readyCount = useMemo(() => participants.filter((participant) => participant.ready).length, [participants]);
  const drawDefined = useMemo(() => matches.filter((match) => match.round === 'R16' && match.playerAId && match.playerBId).length === 8, [matches]);
  const podium = useMemo(() => [...tournamentResults].sort((a, b) => a.finalPosition - b.finalPosition).slice(0, 3), [tournamentResults]);

  useEffect(() => {
    if (tournament?.status !== 'finished') return undefined;
    const timers = [setTimeout(() => setFinalStep(1), 1200), setTimeout(() => setFinalStep(2), 2600), setTimeout(() => setFinalStep(3), 4300)];
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [tournament?.status]);

  if (loading) return <div className="space-y-5"><div className="glass h-56 animate-pulse rounded-[2rem]" /><div className="glass h-96 animate-pulse rounded-3xl" /></div>;
  if (!tournament) return <section className="glass rounded-[2rem] p-8 text-center"><h1 className="text-3xl font-black">Torneo no encontrado</h1><p className="mt-2 text-slate-400">Revisá el link o pedile uno nuevo al admin.</p></section>;

  return (
    <div className="space-y-6">
      <section className="glass relative overflow-hidden rounded-[2rem] p-6 shadow-card md:p-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.16),transparent_24rem)]" />
        <p className="inline-flex rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-xs font-black uppercase tracking-[.3em] text-electric"><Radio className="mr-2 h-4 w-4" /> Public Tournament Mode</p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><h1 className="text-4xl font-black md:text-6xl">{tournament.name}</h1><p className="mt-2 text-slate-300">Estado: <b>{tournament.status}</b> · Temporada {tournament.season}</p></div>
          <div className="flex flex-wrap gap-2">{champion && <span className="btn bg-pending/15 text-pending"><Crown className="h-4 w-4" /> {champion}</span>}<Link className="btn btn-ghost" to={`/season/${tournament.season}`}>Ranking anual</Link><Link className="btn btn-primary" to={`/tv/${id}`}>Modo pantalla</Link></div>
        </div>
      </section>

      {(['draft', 'lobby'].includes(tournament.status) || (tournament.status === 'draw' && !drawDefined)) && (
        <section className="glass rounded-3xl p-5 text-center shadow-card">
          {tournament.status === 'draft' && <><h2 className="text-3xl font-black">Torneo en preparación</h2><p className="mt-2 text-slate-300">El admin está cargando jugadores y equipos.</p></>}
          {tournament.status === 'lobby' && <><h2 className="text-3xl font-black">Sala pública</h2><p className="mt-2 text-slate-300">{readyCount}/{participants.length || 16} jugadores presentes. Esperando sorteo.</p><div className="mt-4 h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-winner to-electric" style={{ width: `${participants.length ? (readyCount / participants.length) * 100 : 0}%` }} /></div></>}
          {tournament.status === 'draw' && <><h2 className="text-3xl font-black">Sorteo en curso</h2><p className="mt-2 text-slate-300">Esperando que el admin active el ritual del sorteo.</p><div className="mt-5 text-left"><DrawReveal participants={participants} /></div></>}
        </section>
      )}

      {tournament.status === 'finished' && (
        <section className="glass rounded-[2rem] p-6 shadow-card">
          <p className="text-xs font-black uppercase tracking-[.3em] text-pending">Coronación FIFAVIVA CUP</p>
          <h2 className="mt-2 text-4xl font-black">Show final del torneo</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <PodiumCard label="3° puesto" player={podium[2]} active={finalStep >= 1} accent="from-amber-900/60 to-amber-700/30" />
            <PodiumCard label="2° puesto" player={podium[1]} active={finalStep >= 2} accent="from-slate-300/40 to-slate-100/20" />
            <PodiumCard label="🏆 Campeón" player={podium[0]} active={finalStep >= 3} accent="from-pending/60 to-yellow-200/30" />
          </div>
          {finalStep >= 3 && (
            <div className="mt-6">
              <h3 className="text-2xl font-black">Stats del torneo (16 jugadores)</h3>
              <p className="text-sm text-slate-300">Primero ves el torneo puntual. Tocá siguiente para ver cómo quedó el ranking anual actualizado.</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {[...tournamentResults].sort((a, b) => a.finalPosition - b.finalPosition).map((result) => (
                  <div key={result.id} className="rounded-2xl bg-white/5 p-3 text-sm">
                    <b>#{result.finalPosition} {result.playerNickname}</b>
                    <p className="text-slate-300">Pts torneo: +{result.annualPoints} · ⚽ {result.goalsFor} · 🛡️ {result.goalsAgainst}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link className="btn btn-primary" to={`/season/${tournament.season}`}>Siguiente: ver ranking anual actualizado</Link>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <BracketView matches={matches} />
        <aside className="space-y-5">
          <Panel title="Próximos partidos">{pending.length ? pending.map((match) => <MiniMatch key={match.id} match={match} />) : <Empty text="No hay partidos pendientes listos." />}</Panel>
          <Panel title="Últimos resultados">{latest.length ? latest.map((match) => <MiniMatch key={match.id} match={match} result />) : <Empty text="Todavía no hay resultados." />}</Panel>
          <Panel title="Goleadores"><ScorersTable rows={scorers.slice(0, 5)} /></Panel>
          <Panel title="Ranking corto">{ranking.length ? ranking.map((row, index) => <div key={row.playerId} className="flex items-center justify-between rounded-2xl bg-white/5 p-3 text-sm"><span>#{index + 1} {row.nickname}</span><b className="text-electric">{row.points} pts</b></div>) : <Empty text="Todavía no hay puntos en el ranking." />}</Panel>
          <Panel title="Feed narrativo">{feed.length ? feed.map((event) => <p key={event.id} className="rounded-2xl bg-white/5 p-3 text-sm text-slate-200">{event.text}</p>) : <Empty text="La historia empieza con el sorteo." />}</Panel>
        </aside>
      </div>
    </div>
  );
}

function PodiumCard({ label, player, active, accent }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-b p-4 transition duration-700 ${accent} ${active ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-20'}`}>
      <p className="text-xs uppercase tracking-[.25em] text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-black">{player?.playerNickname ?? '...'}</p>
      <p className="text-sm text-slate-300">{player ? `${player.annualPoints} pts · ${player.placement}` : 'Esperando reveal...'}</p>
    </div>
  );
}

function MiniMatch({ match, result = false }) { return <div className="rounded-2xl bg-white/5 p-3 text-sm"><div className="flex items-center justify-between gap-2"><b>{match.playerAName} vs {match.playerBName}</b><span className="text-xs text-electric">{roundLabels[match.round]}</span></div><p className="text-slate-400">{result ? `${match.scoreA}-${match.scoreB}` : `${match.teamA} vs ${match.teamB}`}</p></div>; }
function Panel({ title, children }) { return <section className="glass rounded-3xl p-4 shadow-card"><h2 className="mb-3 font-black"><Trophy className="mr-2 inline h-4 w-4 text-electric" />{title}</h2><div className="space-y-2">{children}</div></section>; }
function Empty({ text }) { return <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">{text}</p>; }
