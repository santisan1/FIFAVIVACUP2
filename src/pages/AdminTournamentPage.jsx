import { Copy, Dices, Link as LinkIcon, Monitor, Save, Trash2, Trophy, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { BracketView } from '../components/BracketView';
import { ScorersTable } from '../components/ScorersTable';
import { roundLabels } from '../lib/bracket';
import { addTournamentPlayer, buildScorers, closeMatch, getTournament, listMatches, listPlayers, listTournamentPlayers, openTournamentLobby, removeTournamentPlayer, resetTournamentPresence, runDraw, setTournamentPlayerReady, updateMatchPlayers, updateTournamentPlayerTeam, updateTournamentStatus } from '../lib/firestore';
import { getAllJoinWhatsappMessages, getJoinLink, getJoinWhatsappMessage } from '../lib/magicLinks';

const setupTabs = ['Resumen', 'Participantes', 'Sala', 'Sorteo'];
const liveTabs = ['Resumen', 'Sala', 'Sorteo', 'Bracket', 'Resultados', 'Goleadores'];

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
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [parts, setParts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [activeTab, setActiveTab] = useState('Participantes');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [teamDraft, setTeamDraft] = useState('');
  const [teamEdits, setTeamEdits] = useState({});
  const [habitualEdits, setHabitualEdits] = useState({});
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState('');

  const refresh = async () => {
    const [t, playerRows, participantRows, matchRows, scorerRows] = await Promise.all([getTournament(id), listPlayers(), listTournamentPlayers(id), listMatches(id), buildScorers(id)]);
    setTournament(t);
    setPlayers(playerRows);
    setParts(participantRows);
    setMatches(matchRows);
    setScorers(scorerRows);
    setTeamEdits(Object.fromEntries(participantRows.map((part) => [part.id, part.teamName || ''])));
    setScoreDrafts((current) => Object.fromEntries(matchRows.map((match) => [match.id, current[match.id] ?? { scoreA: match.scoreA ?? '', scoreB: match.scoreB ?? '' }])));
  };

  useEffect(() => { void refresh(); }, [id]);

  const playerById = useMemo(() => Object.fromEntries(players.map((player) => [player.id, player])), [players]);
  const participants = useMemo(() => parts.map((part) => ({ ...part, player: playerById[part.playerId] })).filter((part) => part.player), [parts, playerById]);
  const participantIds = useMemo(() => new Set(parts.map((part) => part.playerId)), [parts]);
  const available = useMemo(() => uniquePlayersForPicker(players).filter((player) => !participantIds.has(player.id)), [players, participantIds]);
  const selectedPlayer = playerById[selectedPlayerId];
  const readyMatches = matches.filter((match) => match.status !== 'finished' && match.playerAId && match.playerBId);
  const finishedMatches = matches.filter((match) => match.status === 'finished');
  const readyCount = parts.filter((part) => part.ready).length;
  const canDraw = parts.length === 16 && matches.length === 0;
  const isSetup = !matches.length && ['draft', 'lobby'].includes(tournament?.status);
  const tabs = isSetup ? setupTabs : liveTabs;

  useEffect(() => {
    setTeamDraft(selectedPlayer?.currentTeam || '');
  }, [selectedPlayer]);

  useEffect(() => {
    if (!isSetup && !liveTabs.includes(activeTab)) setActiveTab('Resultados');
    if (isSetup && !setupTabs.includes(activeTab)) setActiveTab('Participantes');
  }, [activeTab, isSetup]);

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
      if (!selectedPlayer) throw new Error('Elegí un jugador para agregarlo al torneo.');
      if (participantIds.has(selectedPlayer.id)) throw new Error('Este jugador ya está en este torneo.');
      await addTournamentPlayer(id, selectedPlayer, teamDraft || selectedPlayer.currentTeam || '');
      setSelectedPlayerId('');
      setTeamDraft('');
      await refresh();
      await notify('Jugador agregado al torneo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el jugador.');
    }
  }

  async function saveParticipantTeam(participant) {
    try {
      setError('');
      await updateTournamentPlayerTeam(participant, teamEdits[participant.id] || '', { makeDefault: Boolean(habitualEdits[participant.id]) });
      await refresh();
      await notify('Equipo guardado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el equipo.');
    }
  }

  async function handleDraw() {
    try {
      setError('');
      if (readyCount < parts.length && !window.confirm(`Faltan ${parts.length - readyCount} jugadores por entrar. ¿Querés sortear igual?`)) return;
      setDrawing(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
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
      if (!match.playerAId || !match.playerBId) throw new Error('No podés cerrar un partido sin ambos jugadores.');
      if (draft.scoreA === '' || draft.scoreB === '') throw new Error('Cargá ambos scores.');
      if (Number(draft.scoreA) === Number(draft.scoreB)) throw new Error('No se permiten empates en eliminación directa.');
      if (match.round === 'FINAL' && !window.confirm('¿Cerrar la final y coronar campeón?')) return;
      await closeMatch(match, Number(draft.scoreA), Number(draft.scoreB), []);
      await refresh();
      await notify('Resultado cerrado. Ganador avanzado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el partido.');
    }
  }


  async function handleOpenLobby() {
    await openTournamentLobby(id);
    await refresh();
    await notify('Sala abierta. Mandá los links a los jugadores.');
  }

  async function markReady(participant, ready = true) {
    await setTournamentPlayerReady(participant, ready);
    await refresh();
  }

  async function resetPresence() {
    if (!window.confirm('¿Resetear la presencia de todos los jugadores?')) return;
    await resetTournamentPresence(id);
    await refresh();
  }

  async function startTournament() {
    await updateTournamentStatus(id, 'active');
    await refresh();
    setActiveTab('Resultados');
    await notify('Torneo en vivo. Ya podés cargar resultados.');
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="glass rounded-[2rem] p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.3em] text-electric">{isSetup ? 'Setup del torneo' : 'Torneo en vivo'}</p>
              <h1 className="text-4xl font-black">{tournament?.name ?? 'Torneo'}</h1>
              <p className="mt-2 text-sm text-slate-300">{isSetup ? 'Elegí jugadores, confirmá equipos y copiá magic links antes del sorteo.' : 'Bracket, resultados, goleadores y modo TV para la juntada.'}</p>
              <p className="mt-1 text-sm text-slate-400">{parts.length}/16 jugadores · {readyCount}/{parts.length || 16} presentes · {tournament?.status}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="btn btn-ghost" to={`/tournament/${id}`}>Ver torneo</Link>
              <Link className="btn btn-ghost" to={`/tv/${id}`}><Monitor className="h-4 w-4" /> Modo TV</Link>
              <button disabled={!canDraw || drawing} className="btn btn-primary disabled:opacity-40" onClick={handleDraw}><Dices className="h-4 w-4" /> Iniciar sorteo</button>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-electric to-violet" style={{ width: `${Math.min(100, (parts.length / 16) * 100)}%` }} /></div>
          {error && <p className="mt-4 rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
          {toast && <p className="mt-4 rounded-2xl bg-winner/10 p-3 text-sm font-black text-winner">{toast}</p>}
          {drawing && <p className="mt-4 rounded-2xl bg-electric/10 p-3 text-sm font-black text-electric">🎲 Revelando cruces...</p>}
        </section>

        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}
        </nav>

        {activeTab === 'Resumen' && <SummaryTab parts={parts} readyMatches={readyMatches} finishedMatches={finishedMatches} scorers={scorers} setActiveTab={setActiveTab} isSetup={isSetup} />}
        {activeTab === 'Participantes' && <ParticipantsTab available={available} selectedPlayerId={selectedPlayerId} setSelectedPlayerId={setSelectedPlayerId} teamDraft={teamDraft} setTeamDraft={setTeamDraft} selectedPlayer={selectedPlayer} participants={participants} teamEdits={teamEdits} setTeamEdits={setTeamEdits} habitualEdits={habitualEdits} setHabitualEdits={setHabitualEdits} addParticipant={handleAddParticipant} saveParticipantTeam={saveParticipantTeam} refresh={refresh} matches={matches} />}
        {activeTab === 'Sala' && <LobbyTab tournament={tournament} participants={participants} players={players} readyCount={readyCount} copied={copied} copyText={copyText} openLobby={handleOpenLobby} markReady={markReady} resetPresence={resetPresence} handleDraw={handleDraw} canDraw={canDraw} drawing={drawing} /> }
        {activeTab === 'Sorteo' && <DrawTab canDraw={canDraw} drawing={drawing} handleDraw={handleDraw} participants={participants} matches={matches} startTournament={startTournament} tournament={tournament} />}
        {activeTab === 'Bracket' && <section className="space-y-4"><BracketView matches={matches} onMatchClick={setSelectedMatch} admin />{matches.length === 0 && <Empty text="Confirmá 16 jugadores e iniciá el sorteo." />}</section>}
        {activeTab === 'Resultados' && <ResultsTab matches={matches} scoreDrafts={scoreDrafts} setDraft={setDraft} closeQuickMatch={closeQuickMatch} openModal={setSelectedMatch} />}
        {activeTab === 'Goleadores' && <section className="glass rounded-3xl p-5 shadow-card"><h2 className="mb-3 text-2xl font-black">Top goleadores</h2><ScorersTable rows={scorers} /></section>}


        {selectedMatch && <ResultModal match={selectedMatch} participants={participants} onClose={() => setSelectedMatch(null)} onSaved={async () => { setSelectedMatch(null); await refresh(); await notify('Partido guardado y bracket actualizado.'); }} />}
      </div>
    </AdminLayout>
  );
}

function SummaryTab({ parts, readyMatches, finishedMatches, scorers, setActiveTab, isSetup }) {
  return <div className="grid gap-5 lg:grid-cols-[1fr_360px]"><section className="glass rounded-3xl p-5 shadow-card"><h2 className="text-2xl font-black">{isSetup ? 'Setup' : 'Torneo en vivo'}</h2><div className="mt-4 grid gap-3 md:grid-cols-4"><Stat label="Jugadores" value={`${parts.length}/16`} /><Stat label="Listos" value={readyMatches.length} /><Stat label="Cerrados" value={finishedMatches.length} /><Stat label="Goleadores" value={scorers.length} /></div><div className="mt-5 flex flex-wrap gap-2"><button className="btn btn-primary" onClick={() => setActiveTab('Participantes')}>Jugadores de este torneo</button><button className="btn btn-ghost" onClick={() => setActiveTab('Sala')}>Sala / links</button><button className="btn btn-ghost" onClick={() => setActiveTab(isSetup ? 'Sorteo' : 'Resultados')}>{isSetup ? 'Ir al sorteo' : 'Cargar resultados'}</button></div></section><section className="glass rounded-3xl p-5 shadow-card"><h2 className="font-black">Modelo simple</h2><p className="mt-3 text-sm text-slate-300">El equipo pertenece a este torneo. Las estadísticas y puntos se acumulan en el jugador permanente.</p></section></div>;
}

function ParticipantsTab({ available, selectedPlayerId, setSelectedPlayerId, teamDraft, setTeamDraft, selectedPlayer, participants, teamEdits, setTeamEdits, habitualEdits, setHabitualEdits, addParticipant, saveParticipantTeam, refresh, matches }) {
  const bracketStarted = matches.length > 0;
  return <div className="grid gap-5 lg:grid-cols-[380px_1fr]"><section className="glass rounded-3xl p-5 shadow-card"><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Agregar jugador</p><h2 className="mt-2 text-2xl font-black">Jugadores permanentes</h2><div className="mt-4 space-y-3"><select className="input" value={selectedPlayerId} disabled={participants.length >= 16 || bracketStarted} onChange={(e) => setSelectedPlayerId(e.target.value)}><option value="">Seleccionar jugador</option>{available.map((player) => <option key={player.id} value={player.id}>{player.nickname || player.name}</option>)}</select><input className="input" placeholder="Equipo para este torneo" value={teamDraft} disabled={!selectedPlayer || participants.length >= 16 || bracketStarted} onChange={(e) => setTeamDraft(e.target.value)} /><button className="btn btn-primary w-full" disabled={!selectedPlayer || participants.length >= 16 || bracketStarted} onClick={addParticipant}><UsersRound className="h-4 w-4" /> Agregar</button></div></section><section className="glass rounded-3xl p-5 shadow-card"><h2 className="text-2xl font-black">Jugadores de este torneo ({participants.length}/16)</h2><div className="mt-4 space-y-2">{participants.map((part) => <div key={part.id} className="grid gap-2 rounded-3xl bg-white/5 p-3 md:grid-cols-[1fr_1.3fr_auto]"><b className="self-center">{part.playerNickname || part.playerName}</b><div><input className="input" value={teamEdits[part.id] ?? ''} onChange={(e) => setTeamEdits((current) => ({ ...current, [part.id]: e.target.value }))} placeholder="Equipo" /><label className="mt-2 flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={Boolean(habitualEdits[part.id])} onChange={(e) => setHabitualEdits((current) => ({ ...current, [part.id]: e.target.checked }))} /> Guardar también como equipo habitual</label></div><div className="flex flex-wrap gap-2 self-start"><button className="btn btn-ghost text-xs" onClick={() => saveParticipantTeam(part)}><Save className="h-3 w-3" /> Guardar equipo</button><button className="btn btn-ghost text-xs" disabled={bracketStarted} onClick={() => removeTournamentPlayer(part.id).then(refresh)}><Trash2 className="h-3 w-3 text-danger" /> Quitar</button></div></div>)}{participants.length === 0 && <Empty text="Agregá jugadores para preparar el torneo." />}</div></section></div>;
}

function LobbyTab({ tournament, participants, players, readyCount, copied, copyText, openLobby, markReady, resetPresence, handleDraw, canDraw, drawing }) {
  const playerById = Object.fromEntries(players.map((player) => [player.id, player]));
  const lobbyPlayers = participants.map((participant) => ({ ...participant, player: playerById[participant.playerId] })).filter((participant) => participant.player);
  const progress = participants.length ? Math.round((readyCount / participants.length) * 100) : 0;
  const allReady = participants.length === 16 && readyCount === 16;
  const tournamentForLinks = tournament || { id: '', name: 'FIFA Viva Cup' };
  return <section className="glass rounded-3xl p-5 shadow-card"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Sala de espera</p><h2 className="mt-2 text-3xl font-black">Mandá los links y esperá a que todos entren</h2><p className="mt-2 text-sm text-slate-400">Cada jugador que abre su link aparece en verde.</p></div><div className="text-center"><b className="text-5xl text-electric">{readyCount}/{participants.length || 16}</b><p className="text-xs uppercase tracking-[.2em] text-slate-400">presentes</p></div></div><div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-winner to-electric" style={{ width: `${progress}%` }} /></div>{allReady && <div className="mt-5 rounded-3xl border border-winner/30 bg-winner/10 p-5 text-center text-2xl font-black text-winner">🎆 Todos están adentro</div>}<div className="mt-5 flex flex-wrap gap-2"><button className="btn btn-ghost" onClick={openLobby}>Abrir sala</button><button className="btn btn-primary" disabled={!lobbyPlayers.length} onClick={() => copyText(getAllJoinWhatsappMessages(lobbyPlayers.map((item) => item.player), lobbyPlayers, tournamentForLinks), 'all-join') }><Copy className="h-4 w-4" /> {copied === 'all-join' ? 'Copiado' : 'Copiar todos los mensajes'}</button><button className="btn btn-ghost" onClick={resetPresence}>Resetear presencia</button><button className="btn btn-primary" disabled={!canDraw || drawing} onClick={handleDraw}>{allReady ? 'Iniciar sorteo épico' : 'Iniciar sorteo igual'}</button></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{lobbyPlayers.map((participant) => <div key={participant.id} className={`rounded-3xl p-4 ${participant.ready ? 'bg-winner/15 ring-1 ring-winner/30' : 'bg-white/5'}`}><div className="flex items-start justify-between gap-2"><div><b>{participant.playerNickname || participant.playerName}</b><p className="text-sm text-slate-400">{participant.teamName || 'Equipo pendiente'}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${participant.ready ? 'bg-winner/20 text-winner' : 'bg-white/10 text-slate-400'}`}>{participant.ready ? 'Listo' : 'Pendiente'}</span></div><p className="mt-2 text-xs text-slate-500">{participant.joinedAt?.seconds ? new Date(participant.joinedAt.seconds * 1000).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'Sin entrada todavía'}</p><div className="mt-3 grid gap-2"><button className="btn btn-ghost text-xs" onClick={() => copyText(getJoinLink(tournamentForLinks.id, participant.player.id, participant.player.accessToken), `join-${participant.playerId}`)}><LinkIcon className="h-3 w-3" /> {copied === `join-${participant.playerId}` ? 'Copiado' : 'Copiar link'}</button><button className="btn btn-ghost text-xs" onClick={() => copyText(getJoinWhatsappMessage(participant.player, participant, tournamentForLinks), `wa-${participant.playerId}`)}>Mensaje WhatsApp</button><button className="btn btn-ghost text-xs" onClick={() => markReady(participant, !participant.ready)}>{participant.ready ? 'Marcar pendiente' : 'Marcar presente manualmente'}</button></div></div>)}{!lobbyPlayers.length && <Empty text="Agregá jugadores para abrir la sala." />}</div></section>;
}

function DrawTab({ canDraw, drawing, handleDraw, participants, matches, startTournament, tournament }) {
  const [revealed, setRevealed] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const sortedMatches = [...matches].sort((a, b) => a.kickoffOrder - b.kickoffOrder);
  async function startReveal() {
    setCountdown(3);
    window.setTimeout(() => setCountdown(2), 700);
    window.setTimeout(() => setCountdown(1), 1400);
    window.setTimeout(() => { setCountdown(null); setRevealed(1); }, 2100);
  }
  const hasMatches = sortedMatches.length > 0;
  const visibleCount = tournament?.status === 'active' ? sortedMatches.length : revealed;
  return <section className="glass rounded-3xl p-5 text-center shadow-card"><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Setup → Sala → Sorteo → Torneo en vivo</p><h2 className="mt-2 text-3xl font-black">Sorteo épico</h2>{!hasMatches && <><p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">Cuando inicies, se crean 8 cruces únicos de octavos.</p><div className="mx-auto mt-5 grid max-w-3xl gap-2 md:grid-cols-4">{participants.map((participant) => <div key={participant.id} className="rounded-2xl bg-white/5 p-3 text-sm"><b>{participant.playerNickname}</b><p className="text-xs text-slate-400">{participant.teamName || 'Equipo pendiente'}</p></div>)}</div><button className="btn btn-primary mt-5" disabled={!canDraw || drawing} onClick={handleDraw}><Dices className="h-4 w-4" /> {drawing ? 'Sorteando...' : 'Iniciar sorteo épico'}</button>{!canDraw && <p className="mt-3 text-sm text-slate-400">Necesitás 16 jugadores y no tener bracket creado.</p>}</>}{hasMatches && <div className="mt-5"><p className="text-sm text-slate-400">{tournament?.status === 'draw' ? 'Sorteo en curso' : 'Cruces creados'}</p>{countdown && <div className="my-8 text-8xl font-black text-electric">{countdown}</div>}{!countdown && revealed === 0 && <button className="btn btn-primary" onClick={startReveal}>Revelar cruces</button>}<div className="mt-5 grid gap-3 md:grid-cols-2">{sortedMatches.slice(0, visibleCount).map((match) => <div key={match.id} className="rounded-3xl bg-white/5 p-5"><p className="text-xs font-black uppercase tracking-[.2em] text-electric">Octavos {match.matchNumber}</p><div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><span><b>{match.playerAName}</b><p className="text-xs text-slate-400">{match.teamA}</p></span><b className="text-2xl">VS</b><span><b>{match.playerBName}</b><p className="text-xs text-slate-400">{match.teamB}</p></span></div></div>)}</div><div className="mt-5 flex flex-wrap justify-center gap-2">{revealed > 0 && revealed < sortedMatches.length && <button className="btn btn-primary" onClick={() => setRevealed(revealed + 1)}>Siguiente cruce</button>}{revealed > 0 && revealed < sortedMatches.length && <button className="btn btn-ghost" onClick={() => setRevealed(sortedMatches.length)}>Saltar animación</button>}{visibleCount >= sortedMatches.length && tournament?.status !== 'active' && <button className="btn btn-primary" onClick={startTournament}>Arrancar torneo</button>}</div></div>}</section>;
}

function ResultModal({ match, participants, onClose, onSaved }) {
  const [scoreA, setScoreA] = useState(match.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(match.scoreB ?? 0);
  const [playerAId, setPlayerAId] = useState(match.playerAId || '');
  const [playerBId, setPlayerBId] = useState(match.playerBId || '');
  const [error, setError] = useState('');
  const [goals, setGoals] = useState([
    { playerOwnerId: match.playerAId || '', playerOwnerName: match.playerAName, scorerName: '', quantity: 1 },
    { playerOwnerId: match.playerBId || '', playerOwnerName: match.playerBName, scorerName: '', quantity: 1 },
  ]);

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
      if (match.round === 'FINAL' && !window.confirm('¿Cerrar la final y coronar campeón? Esta acción guarda resultados por jugador.')) return;
      await saveManualCross();
      await closeMatch(editableMatch, Number(scoreA), Number(scoreB), goals);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cerrar el partido.'); }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="glass w-full max-w-xl rounded-[2rem] p-5 shadow-card"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Carga rápida</p><h2 className="text-2xl font-black">{editableMatch.playerAName || 'Jugador A'} vs {editableMatch.playerBName || 'Jugador B'}</h2></div><button className="btn btn-ghost" onClick={onClose}>Cerrar</button></div>{error && <p className="mt-4 rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}<div className="mt-5 grid gap-2 md:grid-cols-2"><select className="input" value={playerAId} onChange={(e) => setPlayerAId(e.target.value)}><option value="">Jugador A</option>{participants.map((participant) => <option key={participant.id} value={participant.playerId}>{participant.playerNickname} · {participant.teamName}</option>)}</select><select className="input" value={playerBId} onChange={(e) => setPlayerBId(e.target.value)}><option value="">Jugador B</option>{participants.map((participant) => <option key={participant.id} value={participant.playerId}>{participant.playerNickname} · {participant.teamName}</option>)}</select></div><button className="btn btn-ghost mt-3 w-full text-xs" onClick={saveManualCross}>Guardar cruce manual</button><div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><ScoreBox name={editableMatch.playerAName || 'A'} value={scoreA} setValue={setScoreA} /><span className="text-2xl font-black text-slate-500">VS</span><ScoreBox name={editableMatch.playerBName || 'B'} value={scoreB} setValue={setScoreB} /></div><div className="space-y-2"><p className="text-sm font-black">Goleadores rápidos</p>{goals.map((goal, index) => <div key={index} className="grid grid-cols-[1fr_1fr_80px] gap-2"><select className="input" value={goal.playerOwnerId} onChange={(e) => setGoals(goals.map((g, i) => i === index ? { ...g, playerOwnerId: e.target.value, playerOwnerName: e.target.value === editableMatch.playerAId ? editableMatch.playerAName : editableMatch.playerBName } : g))}><option value={editableMatch.playerAId}>{editableMatch.playerAName}</option><option value={editableMatch.playerBId}>{editableMatch.playerBName}</option></select><input className="input" placeholder="Mbappé" value={goal.scorerName} onChange={(e) => setGoals(goals.map((g, i) => i === index ? { ...g, scorerName: e.target.value } : g))} /><input className="input" type="number" min={1} value={goal.quantity} onChange={(e) => setGoals(goals.map((g, i) => i === index ? { ...g, quantity: Number(e.target.value) } : g))} /></div>)}<button className="btn btn-ghost w-full" onClick={() => setGoals([...goals, { playerOwnerId: editableMatch.playerAId || '', playerOwnerName: editableMatch.playerAName, scorerName: '', quantity: 1 }])}>+ goleador</button></div><button className="btn btn-primary mt-5 w-full" onClick={closeCurrentMatch}><Save className="h-4 w-4" /> Cerrar partido y avanzar ganador</button>{match.round === 'FINAL' && <p className="mt-3 text-center text-sm text-pending"><Trophy className="inline h-4 w-4" /> Esto corona campeón, guarda resultados anuales y finaliza el torneo.</p>}</div></div>;
}

function Stat({ label, value }) { return <div className="rounded-3xl bg-white/5 p-4 text-center"><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">{label}</p><b className="mt-1 block text-3xl">{value}</b></div>; }
function Empty({ text }) { return <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">{text}</p>; }
function ScoreBox({ name, value, setValue }) { return <label className="rounded-3xl bg-white/5 p-4 text-center"><span className="text-sm font-black">{name}</span><input className="mt-2 w-full bg-transparent text-center text-6xl font-black outline-none" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} /></label>; }
