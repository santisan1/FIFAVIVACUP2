import { Copy, Dices, Link as LinkIcon, Monitor, Save, Swords, Trash2, Trophy, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { BracketView } from '../components/BracketView';
import { DrawReveal } from '../components/DrawReveal';
import { roundLabels } from '../lib/bracket';
import { addTournamentPlayer, closeMatch, getTournament, listMatches, listPlayers, listTournamentPlayers, removeTournamentPlayer, runDraw, updateMatchPlayers, updateTournamentPlayerTeam } from '../lib/firestore';
import { allPlayerLinksMessage, magicLinkForPlayer, whatsappMessageForPlayer } from '../lib/magicLinks';

const setupTabs = ['Resumen', 'Participantes', 'Sala', 'Sorteo'];
const liveTabs = ['Resumen', 'Sala', 'Sorteo', 'Bracket', 'Resultados'];

function normalize(value = '') {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function uniquePlayersForPicker(players) {
  const byId = new Map();
  players.forEach((player) => byId.set(player.id, player));
  const byName = new Map();
  [...byId.values()].forEach((player) => {
    const key = normalize(player.nickname || player.name);
    if (!byName.has(key)) byName.set(key, player);
  });
  return [...byName.values()].sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name));
}

export function AdminTournamentPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [parts, setParts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('Participantes');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [teamDraft, setTeamDraft] = useState('');
  const [teamEdits, setTeamEdits] = useState({});
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState('');

  const refresh = async () => {
    const [t, playerRows, participantRows, matchRows] = await Promise.all([getTournament(id), listPlayers(), listTournamentPlayers(id), listMatches(id)]);
    setTournament(t);
    setPlayers(playerRows);
    setParts(participantRows);
    setMatches(matchRows);
    setTeamEdits(Object.fromEntries(participantRows.map((part) => [part.id, part.teamName || ''])));
    setScoreDrafts((current) => Object.fromEntries(matchRows.map((match) => [match.id, current[match.id] ?? { scoreA: match.scoreA ?? '', scoreB: match.scoreB ?? '' }])));
  };

  useEffect(() => { void refresh(); }, [id]);

  const playerById = useMemo(() => Object.fromEntries(players.map((player) => [player.id, player])), [players]);
  const participants = useMemo(() => parts.map((part) => ({ ...part, player: playerById[part.playerId] })).filter((part) => part.player), [parts, playerById]);
  const available = useMemo(() => players.filter((player) => !parts.some((part) => part.playerId === player.id)), [players, parts]);
  const selectedPlayer = playerById[selectedPlayerId];
  const isSetup = tournament?.status !== 'live';
  const tabs = isSetup ? setupTabs : liveTabs;
  const readyCount = participants.filter((participant) => participant.teamName?.trim()).length;
  const readyMatches = matches.filter((match) => match.status !== 'finished' && match.playerAId && match.playerBId);
  const finishedMatches = matches.filter((match) => match.status === 'finished');
  const canDraw = parts.length === 16 && matches.length === 0;

  useEffect(() => {
    setTeamDraft(selectedPlayer?.currentTeam || '');
  }, [selectedPlayer]);

  async function notify(text) {
    setToast(text);
    window.setTimeout(() => setToast(''), 2200);
  }

  async function copyText(text, label) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1500);
  }

  async function handleAddParticipant() {
    try {
      setError('');
      if (!selectedPlayer) throw new Error('Elegí un jugador permanente para agregarlo al torneo.');
      await addTournamentPlayer(id, selectedPlayer, teamDraft || selectedPlayer.currentTeam || '');
      setSelectedPlayerId('');
      setTeamDraft('');
      await refresh();
      await notify('Participante agregado. Confirmá su equipo del torneo antes de sortear.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el participante.');
    }
  }

  async function saveParticipantTeam(participant) {
    try {
      setError('');
      await updateTournamentPlayerTeam(participant, teamEdits[participant.id] || '', { makeDefault: false });
      await refresh();
      await notify('Equipo del torneo guardado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el equipo.');
    }
  }

  async function handleDraw() {
    try {
      setError('');
      if (readyCount < parts.length && !window.confirm(`Faltan ${parts.length - readyCount} jugadores por entrar. ¿Querés sortear igual?`)) return;
      setDrawing(true);
      await runDraw(id);
      await refresh();
      setActiveTab('Sorteo');
      await notify('Sorteo creado. Revelá los cruces uno por uno.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sortear.');
    } finally {
      setDrawing(false);
    }
  }

  function setDraft(matchId, field, value) {
    setScoreDrafts((current) => ({ ...current, [matchId]: { ...current[matchId], [field]: value } }));
  }

  async function closeQuickMatch(match) {
    try {
      setError('');
      const draft = scoreDrafts[match.id] ?? {};
      const isTwoLegTie = tournament?.mode === 'two_legs' && match.round !== 'FINAL';
      const isLeg2 = (match.leg ?? 1) === 2;
      if (!match.playerAId || !match.playerBId) throw new Error('No podés cerrar un partido sin ambos jugadores.');
      if (draft.scoreA === '' || draft.scoreB === '') throw new Error('Cargá ambos scores.');
      if (!isTwoLegTie && match.round !== 'GROUP' && Number(draft.scoreA) === Number(draft.scoreB)) throw new Error('No se permiten empates en eliminación directa.');
      if (match.round === 'FINAL' && !window.confirm('¿Cerrar la final y coronar campeón? Esto guarda tournamentResults por playerId y actualiza el ranking anual.')) return;
      const options = {};
      if (match.round === 'FINAL' && Number(draft.scoreA) === Number(draft.scoreB)) {
        const penAInput = window.prompt(`Final empatada (${draft.scoreA}-${draft.scoreB}). Ingresá penales de ${match.playerAName}:`, '0');
        const penBInput = window.prompt(`Final empatada (${draft.scoreA}-${draft.scoreB}). Ingresá penales de ${match.playerBName}:`, '0');
        if (penAInput === null || penBInput === null) throw new Error('Cierre cancelado.');
        const penaltyA = Number(penAInput);
        const penaltyB = Number(penBInput);
        if (!Number.isFinite(penaltyA) || !Number.isFinite(penaltyB) || penaltyA < 0 || penaltyB < 0 || penaltyA === penaltyB) {
          throw new Error('Penales inválidos: cargá valores válidos y sin empate.');
        }
        options.penaltyA = penaltyA;
        options.penaltyB = penaltyB;
      }
      if (isTwoLegTie && isLeg2) {
        const leg1 = matches.find((item) => item.round === match.round && item.bracketPosition === match.bracketPosition && (item.leg ?? 1) === 1);
        if (!leg1 || leg1.status !== 'finished') throw new Error('Primero cerrá la ida de esta serie.');
        const aggA = Number(leg1.scoreA ?? 0) + Number(draft.scoreB);
        const aggB = Number(leg1.scoreB ?? 0) + Number(draft.scoreA);
        if (aggA === aggB) {
          const penAInput = window.prompt(`Global empatado (${aggA}-${aggB}). Ingresá penales de ${leg1.playerAName}:`, '0');
          const penBInput = window.prompt(`Global empatado (${aggA}-${aggB}). Ingresá penales de ${leg1.playerBName}:`, '0');
          if (penAInput === null || penBInput === null) throw new Error('Cierre cancelado.');
          const penaltyA = Number(penAInput);
          const penaltyB = Number(penBInput);
          if (!Number.isFinite(penaltyA) || !Number.isFinite(penaltyB) || penaltyA < 0 || penaltyB < 0 || penaltyA === penaltyB) {
            throw new Error('Penales inválidos: cargá valores válidos y sin empate.');
          }
          options.penaltyA = penaltyA;
          options.penaltyB = penaltyB;
        }
      }
      await closeMatch(match, Number(draft.scoreA), Number(draft.scoreB), [], options);
      await refresh();
      if (match.round === 'FINAL') {
        await notify('Final cerrada. Te llevamos al torneo público para ver show final + tablas.');
        navigate(`/tournament/${id}`);
        return;
      }
      await notify('Resultado cerrado. El ranking anual acumula por playerId.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el partido.');
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="glass rounded-[2rem] p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.3em] text-electric">{isSetup ? 'Setup del torneo' : 'Torneo en vivo'}</p>
              <h1 className="text-4xl font-black">{tournament?.name ?? 'Torneo'}</h1>
              <p className="mt-2 text-sm text-slate-300">Flujo MVP: crear jugadores permanentes → agregar 16 participantes → confirmar equipo en este torneo → copiar magic links → sortear → cargar resultados → ranking anual.</p>
              <p className="mt-1 text-sm text-slate-400">{parts.length}/16 participantes · estado {tournament?.status}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="btn btn-ghost" to={`/tournament/${id}`}>Ver torneo</Link>
              <Link className="btn btn-ghost" to={`/tv/${id}`}><Monitor className="h-4 w-4" /> Modo TV</Link>
              <button disabled={!canDraw || drawing} className="btn btn-primary disabled:opacity-40" onClick={handleDraw}><Dices className="h-4 w-4" /> Sortear</button>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-electric to-violet" style={{ width: `${Math.min(100, (parts.length / 16) * 100)}%` }} /></div>
          {error && <p className="mt-4 rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
          {toast && <p className="mt-4 rounded-2xl bg-winner/10 p-3 text-sm font-black text-winner">{toast}</p>}
          {drawing && <p className="mt-4 rounded-2xl bg-electric/10 p-3 text-sm font-black text-electric">🎲 La arena decide los cruces...</p>}
        </section>

        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab(tab)}>{tab === 'Resultados' && <Swords className="h-4 w-4" />} {tab === 'Resumen' && <Trophy className="h-4 w-4" />} {tab}</button>)}
        </nav>

        {activeTab === 'Resumen' && <SummaryTab parts={parts} readyMatches={readyMatches} finishedMatches={finishedMatches} setActiveTab={setActiveTab} />}
        {activeTab === 'Participantes' && <ParticipantsTab available={available} selectedPlayerId={selectedPlayerId} setSelectedPlayerId={setSelectedPlayerId} teamDraft={teamDraft} setTeamDraft={setTeamDraft} selectedPlayer={selectedPlayer} participants={participants} teamEdits={teamEdits} setTeamEdits={setTeamEdits} addParticipant={handleAddParticipant} saveParticipantTeam={saveParticipantTeam} refresh={refresh} matches={matches} />}
        {activeTab === 'Sorteo' && <DrawReveal participants={participants} mode={tournament?.mode} />}
        {activeTab === 'Bracket' && <section className="space-y-4"><BracketView matches={matches} onMatchClick={setSelectedMatch} admin />{matches.length === 0 && <Empty text="Confirmá 16 participantes y sorteá para crear el bracket." />}</section>}
        {activeTab === 'Resultados' && <ResultsTab matches={matches} scoreDrafts={scoreDrafts} setDraft={setDraft} closeQuickMatch={closeQuickMatch} openModal={setSelectedMatch} />}
                {activeTab === 'Links' && <LinksTab participants={participants} copied={copied} copyText={copyText} />}

        {selectedMatch && <ResultModal match={selectedMatch} participants={participants} onClose={() => setSelectedMatch(null)} onSaved={async () => { setSelectedMatch(null); await refresh(); await notify('Partido guardado y bracket actualizado.'); }} />}
      </div>
    </AdminLayout>
  );
}

function SummaryTab({ parts, readyMatches, finishedMatches, setActiveTab }) {
  return <div className="grid gap-5 lg:grid-cols-[1fr_360px]"><section className="glass rounded-3xl p-5 shadow-card"><h2 className="text-2xl font-black">Resumen operativo</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><Stat label="Participantes" value={`${parts.length}/16`} /><Stat label="Listos" value={readyMatches.length} /><Stat label="Cerrados" value={finishedMatches.length} /></div><div className="mt-5 flex flex-wrap gap-2"><button className="btn btn-primary" onClick={() => setActiveTab('Participantes')}>Participantes de este torneo</button><button className="btn btn-ghost" onClick={() => setActiveTab('Links')}>Magic links de perfiles</button><button className="btn btn-ghost" onClick={() => setActiveTab('Resultados')}>Cargar resultados</button></div></section><section className="glass rounded-3xl p-5 shadow-card"><h2 className="font-black">Regla anual</h2><p className="mt-3 text-sm text-slate-300">Los puntos se acumulan por playerId. El equipo se guarda en tournamentPlayers y tournamentResults solo como contexto del torneo.</p></section></div>;
}

function ParticipantsTab({ available, selectedPlayerId, setSelectedPlayerId, teamDraft, setTeamDraft, selectedPlayer, participants, teamEdits, setTeamEdits, addParticipant, saveParticipantTeam, refresh, matches }) {
  const bracketStarted = matches.length > 0;
  return <div className="grid gap-5 lg:grid-cols-[420px_1fr]"><section className="glass rounded-3xl p-5 shadow-card"><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Jugadores permanentes</p><h2 className="mt-2 text-2xl font-black">Agregar al torneo</h2><p className="mt-2 text-sm text-slate-400">Elegí un perfil histórico existente. No hay self-registration: el admin carga los 16 participantes.</p><div className="mt-4 space-y-3"><select className="input" value={selectedPlayerId} disabled={participants.length >= 16} onChange={(e) => setSelectedPlayerId(e.target.value)}><option value="">Seleccionar jugador permanente</option>{available.map((player) => <option key={player.id} value={player.id}>{player.nickname || player.name}</option>)}</select><label className="block"><span className="text-xs font-black uppercase tracking-[.2em] text-slate-400">Equipo en este torneo</span><input className="input mt-2" placeholder="Equipo usado en este torneo" value={teamDraft} disabled={!selectedPlayer || participants.length >= 16} onChange={(e) => setTeamDraft(e.target.value)} /></label><button className="btn btn-primary w-full" disabled={!selectedPlayer || participants.length >= 16} onClick={addParticipant}><UsersRound className="h-4 w-4" /> Agregar participante</button></div></section><section className="glass rounded-3xl p-5 shadow-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Participantes de este torneo</p><h2 className="mt-2 text-2xl font-black">Equipo en este torneo ({participants.length}/16)</h2></div>{bracketStarted && <span className="rounded-full bg-pending/10 px-3 py-1 text-xs font-black text-pending">Bracket ya sorteado</span>}</div><p className="mt-2 text-sm text-slate-400">Editar este campo cambia el equipo del participante en este torneo.</p><div className="mt-4 space-y-3">{participants.map((part) => <div key={part.id} className="rounded-3xl bg-white/5 p-4"><div className="grid gap-3 xl:grid-cols-[1fr_1.2fr_auto]"><div><b>{part.playerNickname || part.playerName}</b><p className="text-xs text-slate-400">Seed {part.seed}</p></div><input className="input" value={teamEdits[part.id] ?? ''} onChange={(e) => setTeamEdits((current) => ({ ...current, [part.id]: e.target.value }))} placeholder="Equipo en este torneo" /><div className="flex flex-wrap gap-2"><button className="btn btn-ghost text-xs" onClick={() => saveParticipantTeam(part)}><Save className="h-3 w-3" /> Guardar equipo</button><button className="btn btn-ghost text-xs" disabled={bracketStarted} onClick={() => removeTournamentPlayer(part.id).then(refresh)}><Trash2 className="h-3 w-3 text-danger" /></button></div></div></div>)}{participants.length === 0 && <Empty text="Todavía no agregaste participantes." />}</div><p className="mt-4 text-xs text-slate-400">El sorteo se desbloquea al llegar a 16 participantes confirmados.</p></section></div>;
}


function groupMatchesForResults(matches) {
  const grouped = new Map();
  matches.forEach((match) => {
    const isTwoLegTie = (match.leg ?? 1) >= 1 && match.round !== 'FINAL';
    if (!isTwoLegTie) {
      grouped.set(`single-${match.id}`, { type: 'single', matches: [match] });
      return;
    }
    const key = `${match.round}-${match.bracketPosition ?? match.matchNumber}`;
    const current = grouped.get(key) ?? { type: 'twoLegs', matches: [] };
    current.matches.push(match);
    grouped.set(key, current);
  });
  return Array.from(grouped.values()).map((group) => {
    const ordered = [...group.matches].sort((a, b) => Number(a.leg ?? 1) - Number(b.leg ?? 1));
    return { ...group, matches: ordered };
  });
}

function ResultsTab({ matches, scoreDrafts, setDraft, closeQuickMatch, openModal }) {
  const groupedMatches = groupMatchesForResults(matches);
  return <section className="glass rounded-3xl p-5 shadow-card"><h2 className="text-2xl font-black">Resultados rápidos</h2><p className="text-sm text-slate-400">Ahora podés cargar ida y vuelta en una misma card (4 casilleros) y ver el global antes de cerrar la serie.</p><div className="mt-4 grid gap-3 xl:grid-cols-2">{groupedMatches.map((group) => {
    const leg1 = group.matches[0];
    const leg2 = group.matches[1];
    const leg1A = Number(scoreDrafts[leg1.id]?.scoreA ?? leg1.scoreA ?? 0);
    const leg1B = Number(scoreDrafts[leg1.id]?.scoreB ?? leg1.scoreB ?? 0);
    const leg2A = Number(scoreDrafts[leg2?.id]?.scoreA ?? leg2?.scoreA ?? 0);
    const leg2B = Number(scoreDrafts[leg2?.id]?.scoreB ?? leg2?.scoreB ?? 0);
    const aggregateA = leg1A + leg2B;
    const aggregateB = leg1B + leg2A;
    return <div key={`${leg1.round}-${leg1.bracketPosition}-${leg1.id}`} className="rounded-3xl bg-white/5 p-4"><p className="text-xs font-black uppercase tracking-[.2em] text-electric">{roundLabels[leg1.round]}{group.type === 'twoLegs' ? ' · Ida y vuelta' : leg1.round === 'FINAL' ? ' · Partido único' : ''}</p><p className="mt-1 text-sm"><b>{leg1.playerAName || 'Jugador A'}</b> vs <b>{leg1.playerBName || 'Jugador B'}</b></p>
      {group.type === 'twoLegs' ? <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="rounded-2xl bg-black/20 p-3 text-xs font-black uppercase tracking-[.2em] text-slate-300">Ida<div className="mt-2 grid grid-cols-2 gap-2"><div><input className="input text-center text-xl font-black" type="number" min="0" value={scoreDrafts[leg1.id]?.scoreA ?? ''} onChange={(e) => setDraft(leg1.id, 'scoreA', e.target.value)} /><p className="mt-1 text-center text-[10px] font-bold normal-case tracking-normal text-slate-400">{leg1.playerAName || 'Jugador A'}</p></div><div><input className="input text-center text-xl font-black" type="number" min="0" value={scoreDrafts[leg1.id]?.scoreB ?? ''} onChange={(e) => setDraft(leg1.id, 'scoreB', e.target.value)} /><p className="mt-1 text-center text-[10px] font-bold normal-case tracking-normal text-slate-400">{leg1.playerBName || 'Jugador B'}</p></div></div></label>
        <label className="rounded-2xl bg-black/20 p-3 text-xs font-black uppercase tracking-[.2em] text-slate-300">Vuelta<div className="mt-2 grid grid-cols-2 gap-2"><div><input className="input text-center text-xl font-black" type="number" min="0" disabled={!leg2} value={scoreDrafts[leg2?.id]?.scoreA ?? ''} onChange={(e) => leg2 && setDraft(leg2.id, 'scoreA', e.target.value)} /><p className="mt-1 text-center text-[10px] font-bold normal-case tracking-normal text-slate-400">{leg2?.playerAName || 'Jugador A'}</p></div><div><input className="input text-center text-xl font-black" type="number" min="0" disabled={!leg2} value={scoreDrafts[leg2?.id]?.scoreB ?? ''} onChange={(e) => leg2 && setDraft(leg2.id, 'scoreB', e.target.value)} /><p className="mt-1 text-center text-[10px] font-bold normal-case tracking-normal text-slate-400">{leg2?.playerBName || 'Jugador B'}</p></div></div></label>
      </div> : <label className="mt-4 block rounded-2xl bg-black/20 p-3 text-xs font-black uppercase tracking-[.2em] text-slate-300">{leg1.round === 'FINAL' ? 'Final a partido único' : 'Partido único'}<div className="mt-2 grid grid-cols-2 gap-2"><div><input className="input text-center text-xl font-black" type="number" min="0" value={scoreDrafts[leg1.id]?.scoreA ?? ''} onChange={(e) => setDraft(leg1.id, 'scoreA', e.target.value)} /><p className="mt-1 text-center text-[10px] font-bold normal-case tracking-normal text-slate-400">{leg1.playerAName || 'Jugador A'}</p></div><div><input className="input text-center text-xl font-black" type="number" min="0" value={scoreDrafts[leg1.id]?.scoreB ?? ''} onChange={(e) => setDraft(leg1.id, 'scoreB', e.target.value)} /><p className="mt-1 text-center text-[10px] font-bold normal-case tracking-normal text-slate-400">{leg1.playerBName || 'Jugador B'}</p></div></div></label>}
      {group.type === 'twoLegs' && <p className="mt-3 rounded-2xl bg-electric/10 px-3 py-2 text-sm font-black text-electric">Global parcial: {aggregateA} - {aggregateB}</p>}
      {leg1.round === 'FINAL' && <p className="mt-3 rounded-2xl bg-pending/10 px-3 py-2 text-xs font-bold text-pending">Si empatan, al cerrar se te van a pedir penales para definir campeón y disparar el show final + ranking.</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-3"><button className="btn btn-ghost text-xs" onClick={() => openModal(leg1)}>Editar cruce</button><button className="btn btn-primary text-xs" disabled={leg1.status === 'finished'} onClick={() => closeQuickMatch(leg1)}>{group.type === 'twoLegs' ? (leg1.status === 'finished' ? 'Ida cerrada' : 'Cerrar ida') : (leg1.status === 'finished' ? 'Partido cerrado' : 'Cerrar partido')}</button>{group.type === 'twoLegs' && leg2 && <button className="btn btn-primary text-xs" disabled={leg2.status === 'finished'} onClick={() => closeQuickMatch(leg2)}>{leg2.status === 'finished' ? 'Vuelta cerrada' : 'Cerrar vuelta'}</button>}</div></div>;
  })}{matches.length === 0 && <Empty text="No hay partidos. Sorteá cruces después de confirmar los 16 equipos." />}</div></section>;
}

function LinksTab({ participants, copied, copyText }) {
  const players = participants.map((part) => ({ ...part.player, tournamentTeamName: part.teamName }));
  return <section className="glass rounded-3xl p-5 shadow-card"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Magic links de perfiles</p><h2 className="text-2xl font-black">Copiar links para participantes</h2><p className="text-sm text-slate-400">El link sigue siendo /player/:playerId?token=xxx. Al entrar verá su equipo del torneo activo.</p></div><button className="btn btn-primary" onClick={() => copyText(allPlayerLinksMessage(players), 'all-tournament-links')}><Copy className="h-4 w-4" /> {copied === 'all-tournament-links' ? 'Copiado' : 'Copiar todos'}</button></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{players.map((player) => <div key={player.id} className="rounded-3xl bg-white/5 p-4"><b>{player.nickname || player.name}</b><p className="text-sm text-slate-400">Equipo en este torneo: {player.tournamentTeamName || 'pendiente'}</p><p className="mt-3 break-all rounded-2xl bg-black/20 p-3 text-[11px] text-slate-400">{magicLinkForPlayer(player)}</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="btn btn-ghost text-xs" onClick={() => copyText(magicLinkForPlayer(player), `tl-${player.id}`)}><LinkIcon className="h-3 w-3" /> {copied === `tl-${player.id}` ? 'Copiado' : 'Copiar link'}</button><button className="btn btn-ghost text-xs" onClick={() => copyText(whatsappMessageForPlayer(player), `tw-${player.id}`)}>{copied === `tw-${player.id}` ? 'Copiado' : 'Mensaje WhatsApp'}</button></div></div>)}{players.length === 0 && <Empty text="Agregá participantes al torneo para ver sus links." />}</div></section>;
}

function ResultModal({ match, participants, onClose, onSaved }) {
  const [scoreA, setScoreA] = useState(match.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(match.scoreB ?? 0);
  const [playerAId, setPlayerAId] = useState(match.playerAId || '');
  const [playerBId, setPlayerBId] = useState(match.playerBId || '');
  const [error, setError] = useState('');
  const [goals] = useState([]);
  const [penaltyA, setPenaltyA] = useState('');
  const [penaltyB, setPenaltyB] = useState('');

  const playerA = participants.find((participant) => participant.playerId === playerAId);
  const playerB = participants.find((participant) => participant.playerId === playerBId);
  const editableMatch = { ...match, ...(playerA ? { playerAId: playerA.playerId, playerAName: playerA.playerNickname, teamA: playerA.teamName } : {}), ...(playerB ? { playerBId: playerB.playerId, playerBName: playerB.playerNickname, teamB: playerB.teamName } : {}) };

  async function saveManualCross() { await updateMatchPlayers(match, { playerA, playerB }); }
  async function closeCurrentMatch() {
    try {
      setError('');
      if (!editableMatch.playerAId || !editableMatch.playerBId) throw new Error('Definí los dos jugadores antes de cerrar el partido.');
      if (editableMatch.playerAId === editableMatch.playerBId) throw new Error('Un jugador no puede jugar contra sí mismo.');
      if (scoreA === '' || scoreB === '') throw new Error('Cargá ambos resultados.');
      if (Number(scoreA) === Number(scoreB)) throw new Error('Debe haber un ganador.');
      if (match.round === 'FINAL' && !window.confirm('¿Cerrar la final y coronar campeón? Esta acción guarda tournamentResults por playerId.')) return;
      await saveManualCross();
      await closeMatch(editableMatch, Number(scoreA), Number(scoreB), goals, { penaltyA: penaltyA === '' ? null : Number(penaltyA), penaltyB: penaltyB === '' ? null : Number(penaltyB) });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cerrar el partido.'); }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="glass w-full max-w-xl rounded-[2rem] p-5 shadow-card"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Carga rápida</p><h2 className="text-2xl font-black">{editableMatch.playerAName || 'Jugador A'} vs {editableMatch.playerBName || 'Jugador B'}</h2></div><button className="btn btn-ghost" onClick={onClose}>Cerrar</button></div>{error && <p className="mt-4 rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}<div className="mt-5 grid gap-2 md:grid-cols-2"><select className="input" value={playerAId} onChange={(e) => setPlayerAId(e.target.value)}><option value="">Jugador A</option>{participants.map((participant) => <option key={participant.id} value={participant.playerId}>{participant.playerNickname} · {participant.teamName}</option>)}</select><select className="input" value={playerBId} onChange={(e) => setPlayerBId(e.target.value)}><option value="">Jugador B</option>{participants.map((participant) => <option key={participant.id} value={participant.playerId}>{participant.playerNickname} · {participant.teamName}</option>)}</select></div><button className="btn btn-ghost mt-3 w-full text-xs" onClick={saveManualCross}>Guardar cruce manual</button><div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><ScoreBox name={editableMatch.playerAName || 'A'} value={scoreA} setValue={setScoreA} /><span className="text-2xl font-black text-slate-500">VS</span><ScoreBox name={editableMatch.playerBName || 'B'} value={scoreB} setValue={setScoreB} /></div><div className="grid gap-2 md:grid-cols-2"><input className="input" type="number" min="0" placeholder="Penales A (si global empata)" value={penaltyA} onChange={(e) => setPenaltyA(e.target.value)} /><input className="input" type="number" min="0" placeholder="Penales B (si global empata)" value={penaltyB} onChange={(e) => setPenaltyB(e.target.value)} /></div><button className="btn btn-primary mt-5 w-full" onClick={closeCurrentMatch}><Save className="h-4 w-4" /> Cerrar partido y avanzar ganador</button>{match.round === 'FINAL' && <p className="mt-3 text-center text-sm text-pending"><Trophy className="inline h-4 w-4" /> Esto corona campeón, guarda resultados anuales y finaliza el torneo.</p>}</div></div>;
}

function Stat({ label, value }) { return <div className="rounded-3xl bg-white/5 p-4 text-center"><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">{label}</p><b className="mt-1 block text-3xl">{value}</b></div>; }
function Empty({ text }) { return <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">{text}</p>; }
function ScoreBox({ name, value, setValue }) { return <label className="rounded-3xl bg-white/5 p-4 text-center"><span className="text-sm font-black">{name}</span><input className="mt-2 w-full bg-transparent text-center text-6xl font-black outline-none" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} /></label>; }
