import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { EmptyState } from '../components/EmptyState';
import { PlayerCard } from '../components/PlayerCard';
import { createPlayer, importSamplePlayers, listUsers } from '../lib/firestore';
import type { AppUser } from '../types';

export function AdminPlayersPage() {
  const [users, setUsers] = useState<AppUser[]>([]); const [form, setForm] = useState({ name: '', nickname: '', phone: '', teamName: '' });
  const refresh = () => listUsers().then(setUsers); useEffect(() => { void refresh(); }, []);
  return <AdminLayout><div className="space-y-6"><div><h1 className="text-4xl font-black">Jugadores</h1><p className="text-slate-400">Cargá amigos y dejá el equipo sugerido listo para participantes.</p></div><form className="glass grid gap-3 rounded-3xl p-4 md:grid-cols-5" onSubmit={(e) => { e.preventDefault(); createPlayer(form).then(() => { setForm({ name: '', nickname: '', phone: '', teamName: '' }); refresh(); }); }}><input className="input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><input className="input" placeholder="Nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} required /><input className="input" placeholder="WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><input className="input" placeholder="Equipo" value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} /><button className="btn btn-primary">Crear</button></form><button className="btn btn-ghost" onClick={() => importSamplePlayers().then(refresh)}>Importar 16 jugadores sample</button>{users.length ? <div className="grid gap-3 md:grid-cols-3">{users.map((user) => <PlayerCard key={user.id} user={user} />)}</div> : <EmptyState title="Sin jugadores" description="Creá uno o importá los 16 ejemplos editables." />}</div></AdminLayout>;
}
