import { Copy, KeyRound, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { createPlayer, listPlayers, playerMagicLink, regeneratePlayerToken } from '../lib/firestore';

export function AdminPlayersPage() {
  const [players, setPlayers] = useState([]);
  const [copied, setCopied] = useState('');
  const [form, setForm] = useState({ name: '', nickname: '', currentTeam: '', avatarUrl: '' });
  const refresh = () => listPlayers().then(setPlayers);

  useEffect(() => { void refresh(); }, []);

  async function submitPlayer(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    await createPlayer(form);
    setForm({ name: '', nickname: '', currentTeam: '', avatarUrl: '' });
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
    await refresh();
  }

  return (
    <AdminLayout>
      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <section className="glass rounded-[2rem] p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-[.3em] text-electric">Roster</p>
          <h1 className="mt-2 text-3xl font-black">Jugadores</h1>
          <p className="mt-2 text-sm text-slate-300">Cada jugador queda con un accessToken propio para su magic link y todas sus stats anuales.</p>
          <form className="mt-5 space-y-3" onSubmit={submitPlayer}>
            <input className="input" placeholder="Nombre real" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Apodo visible" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
            <input className="input" placeholder="Equipo actual / favorito" value={form.currentTeam} onChange={(e) => setForm({ ...form, currentTeam: e.target.value })} />
            <input className="input" placeholder="Avatar URL opcional" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
            <button className="btn btn-primary w-full" type="submit"><Plus className="h-4 w-4" /> Crear jugador</button>
          </form>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {players.map((player) => (
            <article key={player.id} className="glass rounded-3xl p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <b className="text-lg">{player.nickname}</b>
                  <p className="text-sm text-slate-300">{player.name} · {player.currentTeam || 'Sin equipo'}</p>
                </div>
                <KeyRound className="h-5 w-5 text-electric" />
              </div>
              <p className="mt-3 break-all rounded-2xl bg-black/20 p-3 text-[11px] text-slate-400">{playerMagicLink(player)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="btn btn-ghost text-xs" onClick={() => copyLink(player)}><Copy className="h-3 w-3" /> {copied === player.id ? 'Copiado' : 'Copiar link'}</button>
                <button className="btn btn-ghost text-xs" onClick={() => rotateToken(player.id)}><RefreshCw className="h-3 w-3" /> Nuevo token</button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <span className="rounded-2xl bg-white/5 p-2"><b>{player.statsGlobal?.annualPoints?.[String(new Date().getFullYear())] ?? 0}</b><br />pts año</span>
                <span className="rounded-2xl bg-white/5 p-2"><b>{player.statsGlobal?.titles ?? 0}</b><br />títulos</span>
                <span className="rounded-2xl bg-white/5 p-2"><b>{player.statsGlobal?.wins ?? 0}</b><br />wins</span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </AdminLayout>
  );
}
