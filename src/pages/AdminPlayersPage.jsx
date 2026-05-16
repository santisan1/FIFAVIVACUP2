import { Copy, KeyRound, Plus, RefreshCw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { createPlayer, listPlayers, playerMagicLink, regeneratePlayerToken, updatePlayer } from '../lib/firestore';

export function AdminPlayersPage() {
  const [players, setPlayers] = useState([]);
  const [copied, setCopied] = useState('');
  const [editing, setEditing] = useState({});
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', nickname: '', currentTeam: '', avatarUrl: '' });
  const refresh = () => listPlayers().then((rows) => {
    setPlayers(rows);
    setEditing(Object.fromEntries(rows.map((player) => [player.id, {
      name: player.name || '',
      nickname: player.nickname || '',
      currentTeam: player.currentTeam || '',
      avatarUrl: player.avatarUrl || '',
    }])));
  });

  useEffect(() => { void refresh(); }, []);

  const playerIndex = useMemo(() => new Map(players.flatMap((player) => [[normalize(player.name || ''), player], [normalize(player.nickname || ''), player]].filter(([key]) => key))), [players]);

  async function submitPlayer(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    await createPlayer(form);
    setMessage('Jugador creado con magic link listo.');
    setForm({ name: '', nickname: '', currentTeam: '', avatarUrl: '' });
    await refresh();
  }

  async function savePlayer(playerId) {
    const draft = editing[playerId];
    if (!draft?.name?.trim()) return;
    await updatePlayer(playerId, {
      name: draft.name.trim(),
      nickname: draft.nickname.trim() || draft.name.trim(),
      currentTeam: draft.currentTeam.trim(),
      avatarUrl: draft.avatarUrl.trim(),
    });
    setMessage('Jugador actualizado.');
    window.setTimeout(() => setMessage(''), 1800);
    await refresh();
  }

  async function copyLink(player) {
    const link = playerMagicLink(player);
    await navigator.clipboard.writeText(link);
    setCopied(player.id);
    window.setTimeout(() => setCopied(''), 1500);
  }

  async function rotateToken(playerId) {
    await regeneratePlayerToken(playerId);
    setMessage('Token regenerado. Los links viejos quedaron inválidos.');
    window.setTimeout(() => setMessage(''), 2200);
    await refresh();
  }

  function updateDraft(playerId, field, value) {
    setEditing((current) => ({ ...current, [playerId]: { ...current[playerId], [field]: value } }));
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="glass rounded-[2rem] p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-[.3em] text-electric">Roster</p>
          <h1 className="mt-2 text-3xl font-black">Jugadores</h1>
          <p className="mt-2 text-sm text-slate-300">Cada jugador queda con un accessToken propio para su magic link y todas sus stats anuales.</p>
          {message && <p className="mt-4 rounded-2xl bg-winner/10 p-3 text-sm font-black text-winner">{message}</p>}
          <form className="mt-5 space-y-3" onSubmit={submitPlayer}>
            <input className="input" placeholder="Nombre real" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Apodo visible" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
            <input className="input" placeholder="Equipo actual / favorito" value={form.currentTeam} onChange={(e) => setForm({ ...form, currentTeam: e.target.value })} />
            <input className="input" placeholder="Avatar URL opcional" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
            <button className="btn btn-primary w-full" type="submit"><Plus className="h-4 w-4" /> Crear jugador</button>
          </form>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {players.map((player) => {
            const draft = editing[player.id] ?? { name: '', nickname: '', currentTeam: '', avatarUrl: '' };
            return (
              <article key={player.id} className="glass rounded-3xl p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <b className="text-lg">{player.nickname}</b>
                    <p className="text-sm text-slate-300">{player.name} · {player.currentTeam || 'Sin equipo'}</p>
                  </div>
                  <KeyRound className="h-5 w-5 text-electric" />
                </div>
                <div className="mt-4 grid gap-2">
                  <input className="input" value={draft.name} onChange={(e) => updateDraft(player.id, 'name', e.target.value)} placeholder="Nombre" />
                  <input className="input" value={draft.nickname} onChange={(e) => updateDraft(player.id, 'nickname', e.target.value)} placeholder="Apodo" />
                  <input className="input" value={draft.currentTeam} onChange={(e) => updateDraft(player.id, 'currentTeam', e.target.value)} placeholder="Equipo" />
                </div>
                <p className="mt-3 break-all rounded-2xl bg-black/20 p-3 text-[11px] text-slate-400">{playerMagicLink(player)}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button className="btn btn-ghost text-xs" onClick={() => savePlayer(player.id)}><Save className="h-3 w-3" /> Guardar</button>
                  <button className="btn btn-ghost text-xs" onClick={() => copyLink(player)}><Copy className="h-3 w-3" /> {copied === player.id ? 'Copiado' : 'Copiar'}</button>
                  <button className="btn btn-ghost text-xs" onClick={() => rotateToken(player.id)}><RefreshCw className="h-3 w-3" /> Token</button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <span className="rounded-2xl bg-white/5 p-2"><b>{player.statsGlobal?.annualPoints?.[String(new Date().getFullYear())] ?? 0}</b><br />pts año</span>
                  <span className="rounded-2xl bg-white/5 p-2"><b>{player.statsGlobal?.titles ?? 0}</b><br />títulos</span>
                  <span className="rounded-2xl bg-white/5 p-2"><b>{player.statsGlobal?.wins ?? 0}</b><br />wins</span>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </AdminLayout>
  );
}

function MagicLinksPanel({ title, players, copied, copyText, rotateToken }) {
  if (!players.length) return <section className="glass rounded-3xl p-5 text-sm text-slate-400">Todavía no hay jugadores para mostrar links.</section>;
  return (
    <section className="glass rounded-[2rem] p-5 shadow-card">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.3em] text-electric">WhatsApp ready</p><h2 className="text-2xl font-black">{title}</h2></div><button className="btn btn-primary" onClick={() => copyText(allPlayerLinksMessage(players), 'all-links')}><Copy className="h-4 w-4" /> {copied === 'all-links' ? 'Copiado' : 'Copiar todos los mensajes'}</button></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {players.map((player) => <div key={player.id} className="rounded-3xl bg-white/5 p-4"><div className="flex items-start justify-between gap-3"><span><b>{player.nickname || player.name}</b><p className="text-sm text-slate-400">{player.currentTeam || 'Equipo pendiente'}</p></span><button className="text-xs text-electric" onClick={() => rotateToken(player.id)}>Regenerar token</button></div><p className="mt-3 break-all rounded-2xl bg-black/20 p-3 text-[11px] text-slate-400">{magicLinkForPlayer(player)}</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="btn btn-ghost text-xs" onClick={() => copyText(magicLinkForPlayer(player), `link-${player.id}`)}><Copy className="h-3 w-3" /> {copied === `link-${player.id}` ? 'Copiado' : 'Copiar link'}</button><button className="btn btn-ghost text-xs" onClick={() => copyText(whatsappMessageForPlayer(player), `wa-${player.id}`)}><MessageCircle className="h-3 w-3" /> {copied === `wa-${player.id}` ? 'Copiado' : 'Mensaje WhatsApp'}</button></div></div>)}
      </div>
    </section>
  );
}
