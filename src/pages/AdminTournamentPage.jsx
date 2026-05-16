import { motion } from 'framer-motion';
import { Dices, Monitor, Save, Trash2, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { BracketView } from '../components/BracketView';
import { ScorersTable } from '../components/ScorersTable';
import { roundLabels } from '../lib/bracket';
import { addTournamentPlayers, buildScorers, closeMatch, getTournament, listMatches, listPlayers, listTournamentPlayers, removeTournamentPlayer, runDraw, updateMatchPlayers } from '../lib/firestore';
import { allPlayerLinksMessage, magicLinkForPlayer, whatsappMessageForPlayer } from '../lib/magicLinks';

const tabs = ['Resumen', 'Participantes', 'Bracket', 'Resultados', 'Goleadores', 'Links'];

export function AdminTournamentPage() {
  const { id = '' } = useParams();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [parts, setParts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [scorers, setScorers] = useState([]);
  const [activeTab, setActiveTab] = useState('Resumen');
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
    setScoreDrafts((current) => ({ ...Object.fromEntries(matchRows.map((match) => [match.id, current[match.id] ?? { scoreA: match.scoreA ?? '', scoreB: match.scoreB ?? '' }])) }));
  };

  useEffect(() => { void refresh(); }, [id]);

  const playerById = useMemo(() => Object.fromEntries(players.map((player) => [player.id, player])), [players]);
  const tournamentPlayers = useMemo(() => parts.map((part) => ({ ...part, player: playerById[part.playerId] })).filter((part) => part.player), [parts, playerById]);
  const available = useMemo(() => players.filter((player) => !parts.some((part) => part.playerId === player.id)), [players, parts]);
  const pendingMatches = useMemo(() => matches.filter((match) => match.status !== 'finished'), [matches]);
  const finishedMatches = useMemo(() => matches.filter((match) => match.status === 'finished'), [matches]);
  const readyMatches = useMemo(() => pendingMatches.filter((match) => match.playerAId && match.playerBId), [pendingMatches]);

  async function notify(text) {
    setToast(text);
    window.setTimeout(() => setToast(''), 2200);
  }

  async function copyText(text, label) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1500);
  }

  async function handleDraw() {
    try {
      setError('');
      setDrawing(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      await runDraw(id);
      await refresh();
      setActiveTab('Resultados');
      await notify('Sorteo listo. Ya podés cargar resultados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sortear.');
    } finally {
      setDrawing(false);
    }
  }

  async function addSelected() {
    const selectedPlayers = players.filter((player) => selectedIds.includes(player.id));
    const added = await addTournamentPlayers(id, selectedPlayers);
    setSelectedIds([]);
    await refresh();
    await notify(`${added} jugadores agregados al torneo.`);
  }

  async function fillFirst16() {
    const added = await addTournamentPlayers(id, available.slice(0, Math.max(0, 16 - parts.length)));
    await refresh();
    await notify(`${added} jugadores agregados para completar el plantel.`);
  }

  async function addAllAvailable() {
    const added = await addTournamentPlayers(id, available);
    await refresh();
    await notify(`${added} jugadores agregados al torneo.`);
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
      await notify('Resultado cerrado. Ganador avanzado, bracket y ranking actualizados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el partido.');
    }
  }

  const canDraw = parts.length === 16 && matches.length === 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="glass rounded-[2rem] p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.3em] text-electric">Gestión de torneo</p>
              <h1 className="text-4xl font-black">{tournament?.name ?? 'Torneo'}</h1>
              <p className="text-sm text-slate-400">{parts.length}/16 jugadores · estado {tournament?.status}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="btn btn-ghost" to={`/tournament/${id}`}>Vista pública</Link>
              <Link className="btn btn-ghost" to={`/tv/${id}`}><Monitor className="h-4 w-4" /> Modo TV</Link>
              <button disabled={parts.length !== 16 || matches.length > 0 || drawing} className="btn btn-primary disabled:opacity-40" onClick={handleDraw}><Dices className="h-4 w-4" /> Sortear cruces</button>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-electric to-violet" style={{ width: `${Math.min(100, (parts.length / 16) * 100)}%` }} /></div>
          {error && <p className="mt-4 rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
          {toast && <p className="mt-4 rounded-2xl bg-winner/10 p-3 text-sm font-black text-winner">{toast}</p>}
          {drawing && <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-5 rounded-3xl border border-electric/30 bg-electric/10 p-5 text-center text-2xl font-black">🎲 La arena decide los cruces...</motion.div>}
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-5">
            <section className="glass rounded-3xl p-4 shadow-card">
              <h2 className="font-black">Agregar jugadores</h2>
              <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                {available.map((player) => <button key={player.id} disabled={parts.length >= 16} className="btn btn-ghost w-full justify-between" onClick={() => addTournamentPlayer(id, player).then(refresh)}><span>{player.nickname}</span><span className="text-xs text-slate-400">{player.currentTeam}</span></button>)}
              </div>
            </section>
            <section className="glass rounded-3xl p-4 shadow-card">
              <h2 className="font-black">Plantel ({parts.length}/16)</h2>
              <div className="mt-3 space-y-2">
                {parts.map((part) => <div key={part.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-3"><span><b>{part.playerNickname}</b><p className="text-xs text-slate-400">{part.teamName}</p></span><button onClick={() => removeTournamentPlayer(part.id).then(refresh)}><Trash2 className="h-4 w-4 text-danger" /></button></div>)}
              </div>
            </section>
            <section className="glass rounded-3xl p-4 shadow-card"><h2 className="mb-3 font-black">Tabla goleadores</h2><ScorersTable rows={scorers} /></section>
          </aside>
          <section className="space-y-4"><BracketView matches={matches} onMatchClick={setSelected} admin /></section>
        </div>
        {selected && <ResultModal match={selected} participants={parts} onClose={() => setSelected(null)} onSaved={async () => { setSelected(null); setToast('Partido guardado y bracket actualizado.'); window.setTimeout(() => setToast(''), 2200); await refresh(); }} />}
      </div>
    </AdminLayout>
  );
}

function SummaryTab({ parts, matches, readyMatches, scorers, setActiveTab }) {
  const finished = matches.filter((match) => match.status === 'finished');
  return <div className="grid gap-5 lg:grid-cols-[1fr_360px]"><section className="glass rounded-3xl p-5 shadow-card"><h2 className="text-2xl font-black">Resumen operativo</h2><div className="mt-4 grid gap-3 md:grid-cols-4"><Stat label="Plantel" value={`${parts.length}/16`} /><Stat label="Pendientes" value={readyMatches.length} /><Stat label="Cerrados" value={finished.length} /><Stat label="Goleadores" value={scorers.length} /></div><div className="mt-5 flex flex-wrap gap-2"><button className="btn btn-primary" onClick={() => setActiveTab('Participantes')}>Agregar jugadores</button><button className="btn btn-ghost" onClick={() => setActiveTab('Resultados')}>Cargar resultados</button><button className="btn btn-ghost" onClick={() => setActiveTab('Links')}>Copiar links</button></div></section><section className="glass rounded-3xl p-5 shadow-card"><h2 className="font-black">Próximos partidos</h2><div className="mt-3 space-y-2">{readyMatches.slice(0, 4).map((match) => <MiniMatch key={match.id} match={match} />)}{readyMatches.length === 0 && <Empty text="No hay partidos listos todavía." />}</div></section></div>;
}

function ParticipantsTab({ parts, available, selectedIds, setSelectedIds, addSelected, addAllAvailable, fillFirst16, refresh }) {
  function toggle(id) { setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  return <div className="grid gap-5 lg:grid-cols-[1fr_420px]"><section className="glass rounded-3xl p-5 shadow-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Jugadores disponibles</h2><p className="text-sm text-slate-400">Seleccioná hasta completar 16. Se usa currentTeam como equipo por defecto.</p></div><div className="flex flex-wrap gap-2"><button className="btn btn-ghost" onClick={addAllAvailable}>Agregar todos</button><button className="btn btn-ghost" onClick={fillFirst16}>Completar con primeros 16</button><button className="btn btn-primary" disabled={!selectedIds.length} onClick={addSelected}><ListChecks className="h-4 w-4" /> Agregar seleccionados</button></div></div><div className="mt-4 grid gap-2 md:grid-cols-2">{available.map((player) => <label key={player.id} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/5 p-3"><input type="checkbox" checked={selectedIds.includes(player.id)} disabled={parts.length + selectedIds.length >= 16 && !selectedIds.includes(player.id)} onChange={() => toggle(player.id)} /><span><b>{player.nickname}</b><p className="text-xs text-slate-400">{player.currentTeam || 'Sin equipo'}</p></span></label>)}{available.length === 0 && <Empty text="No quedan jugadores disponibles." />}</div></section><section className="glass rounded-3xl p-5 shadow-card"><h2 className="text-2xl font-black"><UsersRound className="mr-2 inline h-5 w-5 text-electric" /> Plantel ({parts.length}/16)</h2><div className="mt-3 space-y-2">{parts.map((part) => <div key={part.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-3"><span><b>{part.playerNickname}</b><p className="text-xs text-slate-400">{part.teamName}</p></span><button onClick={() => removeTournamentPlayer(part.id).then(refresh)}><Trash2 className="h-4 w-4 text-danger" /></button></div>)}{parts.length === 0 && <Empty text="Todavía no agregaste participantes." />}</div><div className="mt-4 text-xs text-slate-400">El sorteo se desbloquea únicamente al llegar a 16/16.</div></section></div>;
}

function ResultsTab({ matches, scoreDrafts, setDraft, closeQuickMatch, openModal }) {
  return <section className="glass rounded-3xl p-5 shadow-card"><div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Resultados rápidos</h2><p className="text-sm text-slate-400">Cargá score y cerrá. El modal queda para agregar goleadores.</p></div></div><div className="mt-4 grid gap-3 xl:grid-cols-2">{matches.map((match) => <div key={match.id} className="rounded-3xl bg-white/5 p-4"><p className="text-xs font-black uppercase tracking-[.2em] text-electric">{roundLabels[match.round]}</p><div className="mt-3 grid grid-cols-[1fr_80px] items-center gap-3"><span><b>{match.playerAName || 'Jugador A'}</b><p className="text-xs text-slate-400">{match.teamA || 'Equipo pendiente'}</p></span><input className="input text-center text-2xl font-black" type="number" min="0" value={scoreDrafts[match.id]?.scoreA ?? ''} onChange={(e) => setDraft(match.id, 'scoreA', e.target.value)} /></div><div className="my-3 h-px bg-white/10" /><div className="grid grid-cols-[1fr_80px] items-center gap-3"><span><b>{match.playerBName || 'Jugador B'}</b><p className="text-xs text-slate-400">{match.teamB || 'Equipo pendiente'}</p></span><input className="input text-center text-2xl font-black" type="number" min="0" value={scoreDrafts[match.id]?.scoreB ?? ''} onChange={(e) => setDraft(match.id, 'scoreB', e.target.value)} /></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><button className="btn btn-ghost text-xs" onClick={() => setDraft(match.id, 'saved', true)}><Save className="h-3 w-3" /> Guardar resultado</button><button className="btn btn-ghost text-xs" onClick={() => openModal(match)}>Cargar goleadores</button><button className="btn btn-primary text-xs" onClick={() => closeQuickMatch(match)}>Cerrar partido</button></div></div>)}{matches.length === 0 && <Empty text="No hay partidos pendientes. Sorteá cruces o esperá clasificados." />}</div></section>;
}

function LinksTab({ players, copied, copyText }) {
  return <section className="glass rounded-3xl p-5 shadow-card"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Links del torneo</p><h2 className="text-2xl font-black">Magic links para WhatsApp</h2></div><button className="btn btn-primary" onClick={() => copyText(allPlayerLinksMessage(players), 'all-tournament-links')}><Copy className="h-4 w-4" /> {copied === 'all-tournament-links' ? 'Copiado' : 'Copiar todos'}</button></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{players.map((player) => <div key={player.id} className="rounded-3xl bg-white/5 p-4"><b>{player.nickname || player.name}</b><p className="text-sm text-slate-400">{player.currentTeam || 'Equipo pendiente'}</p><p className="mt-3 break-all rounded-2xl bg-black/20 p-3 text-[11px] text-slate-400">{magicLinkForPlayer(player)}</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="btn btn-ghost text-xs" onClick={() => copyText(magicLinkForPlayer(player), `tl-${player.id}`)}><LinkIcon className="h-3 w-3" /> {copied === `tl-${player.id}` ? 'Copiado' : 'Copiar link'}</button><button className="btn btn-ghost text-xs" onClick={() => copyText(whatsappMessageForPlayer(player), `tw-${player.id}`)}>{copied === `tw-${player.id}` ? 'Copiado' : 'Mensaje WhatsApp'}</button></div></div>)}{players.length === 0 && <Empty text="Agregá jugadores al torneo para ver sus links." />}</div></section>;
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
      if (Number(scoreA) === Number(scoreB)) throw new Error('Debe haber un ganador. Si hubo penales, cargá el score final con ganador.');
      if (match.round === 'FINAL' && !window.confirm('¿Cerrar la final y coronar campeón? Esta acción actualiza ranking anual y perfil de jugadores.')) return;
      await saveManualCross();
      await closeMatch(editableMatch, Number(scoreA), Number(scoreB), goals);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cerrar el partido.'); }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="glass w-full max-w-xl rounded-[2rem] p-5 shadow-card"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Carga rápida</p><h2 className="text-2xl font-black">{editableMatch.playerAName || 'Jugador A'} vs {editableMatch.playerBName || 'Jugador B'}</h2></div><button className="btn btn-ghost" onClick={onClose}>Cerrar</button></div>{error && <p className="mt-4 rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}<div className="mt-5 grid gap-2 md:grid-cols-2"><select className="input" value={playerAId} onChange={(e) => setPlayerAId(e.target.value)}><option value="">Jugador A</option>{participants.map((participant) => <option key={participant.id} value={participant.playerId}>{participant.playerNickname} · {participant.teamName}</option>)}</select><select className="input" value={playerBId} onChange={(e) => setPlayerBId(e.target.value)}><option value="">Jugador B</option>{participants.map((participant) => <option key={participant.id} value={participant.playerId}>{participant.playerNickname} · {participant.teamName}</option>)}</select></div><button className="btn btn-ghost mt-3 w-full text-xs" onClick={saveManualCross}>Guardar cruce manual</button><div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><ScoreBox name={editableMatch.playerAName || 'A'} value={scoreA} setValue={setScoreA} /><span className="text-2xl font-black text-slate-500">VS</span><ScoreBox name={editableMatch.playerBName || 'B'} value={scoreB} setValue={setScoreB} /></div><div className="space-y-2"><p className="text-sm font-black">Goleadores rápidos</p>{goals.map((goal, index) => <div key={index} className="grid grid-cols-[1fr_1fr_80px] gap-2"><select className="input" value={goal.playerOwnerId} onChange={(e) => setGoals(goals.map((g, i) => i === index ? { ...g, playerOwnerId: e.target.value, playerOwnerName: e.target.value === editableMatch.playerAId ? editableMatch.playerAName : editableMatch.playerBName } : g))}><option value={editableMatch.playerAId}>{editableMatch.playerAName}</option><option value={editableMatch.playerBId}>{editableMatch.playerBName}</option></select><input className="input" placeholder="Mbappé" value={goal.scorerName} onChange={(e) => setGoals(goals.map((g, i) => i === index ? { ...g, scorerName: e.target.value } : g))} /><input className="input" type="number" min={1} value={goal.quantity} onChange={(e) => setGoals(goals.map((g, i) => i === index ? { ...g, quantity: Number(e.target.value) } : g))} /></div>)}<button className="btn btn-ghost w-full" onClick={() => setGoals([...goals, { playerOwnerId: editableMatch.playerAId || '', playerOwnerName: editableMatch.playerAName, scorerName: '', quantity: 1 }])}>+ goleador</button></div><button className="btn btn-primary mt-5 w-full" onClick={closeCurrentMatch}><Save className="h-4 w-4" /> Cerrar partido y avanzar ganador</button>{match.round === 'FINAL' && <p className="mt-3 text-center text-sm text-pending"><Trophy className="inline h-4 w-4" /> Esto corona campeón, guarda resultados anuales y finaliza el torneo.</p>}</div></div>;
}

function Stat({ label, value }) { return <div className="rounded-3xl bg-white/5 p-4 text-center"><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">{label}</p><b className="mt-1 block text-3xl">{value}</b></div>; }
function MiniMatch({ match }) { return <div className="rounded-2xl bg-white/5 p-3 text-sm"><b>{match.playerAName} vs {match.playerBName}</b><p className="text-xs text-slate-400">{roundLabels[match.round]}</p></div>; }
function Empty({ text }) { return <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">{text}</p>; }
function ScoreBox({ name, value, setValue }) { return <label className="rounded-3xl bg-white/5 p-4 text-center"><span className="text-sm font-black">{name}</span><input className="mt-2 w-full bg-transparent text-center text-6xl font-black outline-none" type="number" min={0} value={value} onChange={(e) => setValue(Number(e.target.value))} /></label>; }
