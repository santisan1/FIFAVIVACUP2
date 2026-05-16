import { Copy, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { createPlayer, listPlayers } from '../lib/firestore';
export function AdminPlayersPage() {
    const [players, setPlayers] = useState([]);
    const [form, setForm] = useState({ name: '', nickname: '', currentTeam: '' });
    const refresh = () => listPlayers().then(setPlayers);
    useEffect(() => { void refresh(); }, []);
    return <AdminLayout><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><section className="glass rounded-[2rem] p-5"><h1 className="text-3xl font-black">Jugadores</h1><div className="mt-5 space-y-3"><input className="input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/><input className="input" placeholder="Apodo" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })}/><input className="input" placeholder="Equipo actual" value={form.currentTeam} onChange={(e) => setForm({ ...form, currentTeam: e.target.value })}/><button className="btn btn-primary w-full" onClick={async () => { await createPlayer(form); setForm({ name: '', nickname: '', currentTeam: '' }); await refresh(); }}><Plus className="h-4 w-4"/> Crear jugador</button></div></section><section className="grid gap-3 md:grid-cols-2">{players.map((player) => <div key={player.id} className="glass rounded-3xl p-4"><b className="text-lg">{player.nickname}</b><p className="text-sm text-slate-300">{player.name} · {player.currentTeam}</p><button className="mt-3 btn btn-ghost w-full text-xs" onClick={() => navigator.clipboard.writeText(`${location.origin}/player/${player.id}?token=${player.accessToken}`)}><Copy className="h-3 w-3"/> Copiar magic link</button></div>)}</section></div></AdminLayout>;
}
