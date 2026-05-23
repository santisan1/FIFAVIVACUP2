import { Crown, Radio, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BracketView } from '../components/BracketView';
import { DrawReveal } from '../components/DrawReveal';
import { roundLabels } from '../lib/bracket';
import { buildRanking, getPlayer, getTournament, listFeed, listMatches, listTournamentPlayers, listTournamentResultsBySeason } from '../lib/firestore';

export function TournamentPage() {
  const { id = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [feed, setFeed] = useState([]);
  const [champion, setChampion] = useState('');
  const [participants, setParticipants] = useState([]);
  const [tournamentResults, setTournamentResults] = useState([]);
  const [finalStep, setFinalStep] = useState(0);
  const [showAnnual, setShowAnnual] = useState(false);

  async function refreshTournamentData({ showLoader = false } = {}) {
    if (showLoader) setLoading(true);
    const t = await getTournament(id);
    setTournament(t);
    const [matchRows, feedRows, rankingRows, participantRows, seasonResults] = await Promise.all([listMatches(id), listFeed(id), t ? buildRanking(t.season) : Promise.resolve([]), listTournamentPlayers(id), t ? listTournamentResultsBySeason(t.season) : Promise.resolve([])]);
    setMatches(matchRows);
    setFeed(feedRows);
    setRanking(rankingRows.slice(0, 5));
    setParticipants(participantRows);
    setTournamentResults(seasonResults.filter((result) => result.tournamentId === id));
    if (t?.championPlayerId) setChampion((await getPlayer(t.championPlayerId))?.nickname ?? 'Campeón');
    else setChampion('');
    if (showLoader) setLoading(false);
  }

  useEffect(() => {
    void refreshTournamentData({ showLoader: true });
  }, [id]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      void refreshTournamentData();
    }, 4000);
    return () => clearInterval(intervalId);
  }, [id]);

  useEffect(() => {
    if (tournament?.status !== 'finished') {
      setFinalStep(0);
      setShowAnnual(false);
      return;
    }
    setFinalStep(0);
    setShowAnnual(false);
    const timers = [1200, 2600, 4200].map((time, index) => setTimeout(() => setFinalStep(index + 1), time));
    return () => timers.forEach(clearTimeout);
  }, [tournament?.status, id]);

  useEffect(() => {
    if (tournament?.status !== 'finished' || tournamentResults.length > 0 || !tournament?.season) return;
    const refreshId = setTimeout(() => {
      void listTournamentResultsBySeason(tournament.season).then((seasonResults) => {
        setTournamentResults(seasonResults.filter((result) => result.tournamentId === id));
      });
    }, 1500);
    return () => clearTimeout(refreshId);
  }, [tournament?.status, tournament?.season, tournamentResults.length, id]);

  const pending = useMemo(() => matches.filter((match) => match.status !== 'finished' && match.playerAId && match.playerBId).slice(0, 5), [matches]);
  const latest = useMemo(() => matches.filter((match) => match.status === 'finished').slice(-5).reverse(), [matches]);

  const readyCount = useMemo(() => participants.filter((participant) => participant.ready).length, [participants]);
  const drawDefined = useMemo(() => matches.length > 0, [matches]);
  const isSorteado = drawDefined;
  const groupStandings = useMemo(() => buildGroupData(matches), [matches]);
  const qfExists = useMemo(() => matches.some((m) => m.round === 'QF'), [matches]);

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
          {tournament.status === 'draw' && !isSorteado && <><h2 className="text-3xl font-black">Sorteo en curso</h2><p className="mt-2 text-slate-300">Los cruces se están revelando con suspenso, uno por uno.</p><div className="mt-5 text-left"><DrawReveal participants={participants} mode={tournament.mode} /></div></>}
        </section>
      )}

      {tournament.status === 'finished' && (
        <section className="glass rounded-3xl p-6 shadow-card">
          <h2 className="text-3xl font-black">🏆 Show final</h2>
          {!showAnnual ? (
            <>
              <p className="mt-2 text-slate-300">Revelando podio y tabla del torneo.</p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <PodiumCard label="3º puesto" player={tournamentResults[2]} active={finalStep >= 1} accent="from-amber-600/20 to-white/5" />
                <PodiumCard label="2º puesto" player={tournamentResults[1]} active={finalStep >= 2} accent="from-slate-300/20 to-white/5" />
                <PodiumCard label="Campeón" player={tournamentResults[0]} active={finalStep >= 3} accent="from-winner/20 to-white/5" />
              </div>
              <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-[.2em] text-slate-400"><tr><th className="p-3">Pos</th><th className="p-3">Jugador</th><th className="p-3">Pts anual</th></tr></thead>
                  <tbody>
                    {tournamentResults.map((row, index) => (
                      <tr key={row.id || row.playerId} className="border-t border-white/10"><td className="p-3 font-black">{index + 1}</td><td className="p-3">{row.playerNickname}</td><td className="p-3 text-electric font-black">+{row.annualPoints}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" onClick={() => setShowAnnual(true)}>Siguiente: tabla anual</button>
                <Link className="btn btn-ghost" to={`/season/${tournament.season}`}>Ver detalle completo</Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-slate-300">Tabla anual actualizada.</p>
              <div className="mt-4 overflow-x-auto rounded-3xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-[.2em] text-slate-400"><tr><th className="p-3">Rank</th><th className="p-3">Jugador</th><th className="p-3">Pts</th></tr></thead>
                  <tbody>
                    {ranking.map((row, index) => (
                      <tr key={row.playerId} className="border-t border-white/10"><td className="p-3 font-black">#{index + 1}</td><td className="p-3">{row.nickname}</td><td className="p-3 text-electric font-black">{row.points}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}


      {tournament.mode === 'groups_16' && Object.keys(groupStandings).length > 0 && (
        <section className={`glass rounded-3xl p-5 shadow-card ${qfExists ? 'opacity-60' : ''}`}>
          <h2 className="text-2xl font-black">Grupos y clasificación</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {['A','B','C','D'].map((g) => (
              <div key={g} className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm"><thead className="bg-white/5 text-xs uppercase text-slate-300"><tr><th className="p-2 text-left">Grupo {g}</th><th className="p-2">PJ</th><th className="p-2">GF</th><th className="p-2">GC</th><th className="p-2">PTS</th></tr></thead><tbody>{(groupStandings[g]||[]).map((r,i)=><tr key={r.id} className="border-t border-white/10"><td className="p-2">{i+1}. {r.name}</td><td className="p-2 text-center">{r.pj}</td><td className="p-2 text-center">{r.gf}</td><td className="p-2 text-center">{r.ga}</td><td className="p-2 text-center font-black text-electric">{r.pts}</td></tr>)}</tbody></table>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-white/5 p-3 text-sm">
            <b>Cruces a cuartos:</b> A1 vs B2 · C1 vs D2 · B1 vs A2 · D1 vs C2
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <BracketView matches={matches} />
        <aside className="space-y-5">
          <Panel title="Próximos partidos">{pending.length ? pending.map((match) => <MiniMatch key={match.id} match={match} />) : <Empty text="No hay partidos pendientes listos." />}</Panel>
          <Panel title="Últimos resultados">{latest.length ? latest.map((match) => <MiniMatch key={match.id} match={match} result />) : <Empty text="Todavía no hay resultados." />}</Panel>
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


function buildGroupData(matches) {
  const groupMatches = matches.filter((m) => m.round === 'GROUP');
  const byGroup = new Map();
  groupMatches.forEach((m) => {
    const g = m.groupName || '?';
    const row = byGroup.get(g) || [];
    row.push(m);
    byGroup.set(g, row);
  });
  const standings = {};
  byGroup.forEach((groupRows, g) => {
    const table = new Map();
    const up = (id, name, team, gf, ga, pts) => {
      const r = table.get(id) || { id, name, team, pts: 0, gf: 0, ga: 0, pj: 0, gd: 0 };
      r.pts += pts; r.gf += gf; r.ga += ga; r.pj += 1; r.gd = r.gf - r.ga;
      table.set(id, r);
    };
    groupRows.filter((m) => m.status === 'finished').forEach((m) => {
      const sa = Number(m.scoreA ?? 0); const sb = Number(m.scoreB ?? 0);
      up(m.playerAId, m.playerAName, m.teamA, sa, sb, sa === sb ? 1 : sa > sb ? 3 : 0);
      up(m.playerBId, m.playerBName, m.teamB, sb, sa, sa === sb ? 1 : sb > sa ? 3 : 0);
    });
    groupRows.forEach((m) => {
      if (!table.has(m.playerAId)) table.set(m.playerAId, { id: m.playerAId, name: m.playerAName, team: m.teamA, pts: 0, gf: 0, ga: 0, pj: 0, gd: 0 });
      if (!table.has(m.playerBId)) table.set(m.playerBId, { id: m.playerBId, name: m.playerBName, team: m.teamB, pts: 0, gf: 0, ga: 0, pj: 0, gd: 0 });
    });
    standings[g] = [...table.values()].sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);
  });
  return standings;
}

function Empty({ text }) { return <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">{text}</p>; }
