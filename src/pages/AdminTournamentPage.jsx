import { motion } from 'framer-motion';
import { Dices, Monitor, Save, Trash2, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { BracketView } from '../components/BracketView';
import { ScorersTable } from '../components/ScorersTable';
import { addTournamentPlayer, buildScorers, closeMatch, getTournament, listMatches, listPlayers, listTournamentPlayers, removeTournamentPlayer, runDraw, updateMatchPlayers } from '../lib/firestore';

export function AdminTournamentPage() {
  const { id = '' } = useParams();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [parts, setParts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [scorers, setScorers] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const refresh = async () => {
    setTournament(await getTournament(id));
    setPlayers(await listPlayers());
    setParts(await listTournamentPlayers(id));
    setMatches(await listMatches(id));
    setScorers(await buildScorers(id));
  };

  useEffect(() => { void refresh(); }, [id]);

  const available = useMemo(() => players.filter((player) => !parts.some((part) => part.playerId === player.id)), [players, parts]);

  async function handleDraw() {
    try {
      setError('');
      setDrawing(true);
      await new Promise((resolve) => setTimeout(resolve, 1400));
      await runDraw(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sortear.');
    } finally {
      setDrawing(false);
    }
  }

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
  const editableMatch = {
    ...match,
    ...(playerA ? { playerAId: playerA.playerId, playerAName: playerA.playerNickname, teamA: playerA.teamName } : {}),
    ...(playerB ? { playerBId: playerB.playerId, playerBName: playerB.playerNickname, teamB: playerB.teamName } : {}),
  };

  async function saveManualCross() {
    await updateMatchPlayers(match, { playerA, playerB });
  }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el partido.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-xl rounded-[2rem] p-5 shadow-card">
        <div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Carga rápida</p><h2 className="text-2xl font-black">{editableMatch.playerAName || 'Jugador A'} vs {editableMatch.playerBName || 'Jugador B'}</h2></div><button className="btn btn-ghost" onClick={onClose}>Cerrar</button></div>
        {error && <p className="mt-4 rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 grid gap-2 md:grid-cols-2">
          <select className="input" value={playerAId} onChange={(e) => setPlayerAId(e.target.value)}><option value="">Jugador A</option>{participants.map((participant) => <option key={participant.id} value={participant.playerId}>{participant.playerNickname} · {participant.teamName}</option>)}</select>
          <select className="input" value={playerBId} onChange={(e) => setPlayerBId(e.target.value)}><option value="">Jugador B</option>{participants.map((participant) => <option key={participant.id} value={participant.playerId}>{participant.playerNickname} · {participant.teamName}</option>)}</select>
        </div>
        <button className="btn btn-ghost mt-3 w-full text-xs" onClick={saveManualCross}>Guardar cruce manual</button>
        <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><ScoreBox name={editableMatch.playerAName || 'A'} value={scoreA} setValue={setScoreA} /><span className="text-2xl font-black text-slate-500">VS</span><ScoreBox name={editableMatch.playerBName || 'B'} value={scoreB} setValue={setScoreB} /></div>
        <div className="space-y-2"><p className="text-sm font-black">Goleadores rápidos</p>{goals.map((goal, index) => <div key={index} className="grid grid-cols-[1fr_1fr_80px] gap-2"><select className="input" value={goal.playerOwnerId} onChange={(e) => setGoals(goals.map((g, i) => i === index ? { ...g, playerOwnerId: e.target.value, playerOwnerName: e.target.value === editableMatch.playerAId ? editableMatch.playerAName : editableMatch.playerBName } : g))}><option value={editableMatch.playerAId}>{editableMatch.playerAName}</option><option value={editableMatch.playerBId}>{editableMatch.playerBName}</option></select><input className="input" placeholder="Mbappé" value={goal.scorerName} onChange={(e) => setGoals(goals.map((g, i) => i === index ? { ...g, scorerName: e.target.value } : g))} /><input className="input" type="number" min={1} value={goal.quantity} onChange={(e) => setGoals(goals.map((g, i) => i === index ? { ...g, quantity: Number(e.target.value) } : g))} /></div>)}<button className="btn btn-ghost w-full" onClick={() => setGoals([...goals, { playerOwnerId: editableMatch.playerAId || '', playerOwnerName: editableMatch.playerAName, scorerName: '', quantity: 1 }])}>+ goleador</button></div>
        <button className="btn btn-primary mt-5 w-full" onClick={closeCurrentMatch}><Save className="h-4 w-4" /> Cerrar partido y avanzar ganador</button>
        {match.round === 'FINAL' && <p className="mt-3 text-center text-sm text-pending"><Trophy className="inline h-4 w-4" /> Esto corona campeón, guarda resultados anuales y finaliza el torneo.</p>}
      </div>
    </div>
  );
}

function ScoreBox({ name, value, setValue }) {
  return <label className="rounded-3xl bg-white/5 p-4 text-center"><span className="text-sm font-black">{name}</span><input className="mt-2 w-full bg-transparent text-center text-6xl font-black outline-none" type="number" min={0} value={value} onChange={(e) => setValue(Number(e.target.value))} /></label>;
}
