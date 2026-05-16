import { Plus, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { createTournament, listTournaments } from '../lib/firestore';
export function AdminDashboardPage() {
    const navigate = useNavigate();
    const [name, setName] = useState(`Viva Cup ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`);
    const [season, setSeason] = useState(new Date().getFullYear());
    const [items, setItems] = useState([]);
    const refresh = () => listTournaments().then(setItems);
    useEffect(() => { void refresh(); }, []);
    return <AdminLayout><div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><section className="glass rounded-[2rem] p-5"><h1 className="text-3xl font-black">Control room</h1><p className="mt-2 text-sm text-slate-300">Creá un torneo y cargá 16 jugadores. Simple, rápido y mobile-first.</p><div className="mt-5 space-y-3"><input className="input" value={name} onChange={(e) => setName(e.target.value)}/><input className="input" type="number" value={season} onChange={(e) => setSeason(Number(e.target.value))}/><button className="btn btn-primary w-full" onClick={async () => navigate(`/admin/tournament/${await createTournament({ name, season })}`)}><Plus className="h-4 w-4"/> Crear torneo</button></div></section><section className="space-y-3"><h2 className="text-xl font-black">Torneos</h2>{items.map((item) => <Link key={item.id} to={`/admin/tournament/${item.id}`} className="glass flex items-center justify-between rounded-3xl p-4"><span><b>{item.name}</b><p className="text-xs text-slate-400">{item.season} · {item.status}</p></span><Trophy className="text-electric"/></Link>)}</section></div></AdminLayout>;
}
