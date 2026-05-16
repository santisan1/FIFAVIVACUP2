import { DatabaseZap, Plus, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { createTournament, listTournaments, seedDemoData } from '../lib/firestore';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [name, setName] = useState(`Viva Cup ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`);
  const [season, setSeason] = useState(new Date().getFullYear());
  const [items, setItems] = useState([]);
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [message, setMessage] = useState('');
  const refresh = () => listTournaments().then(setItems);
  useEffect(() => { void refresh(); }, []);

  async function createDemo() {
    setLoadingSeed(true);
    setMessage('Creando demo con 16 jugadores, bracket y resultados...');
    try {
      const tournamentId = await seedDemoData();
      navigate(`/admin/tournament/${tournamentId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo crear la demo.');
    } finally {
      setLoadingSeed(false);
    }
  }

  return (
    <AdminLayout>
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <section className="glass rounded-[2rem] p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-[.3em] text-electric">Admin Mode</p>
          <h1 className="mt-2 text-3xl font-black">Control room</h1>
          <p className="mt-2 text-sm text-slate-300">Creá un torneo, cargá 16 jugadores, sorteá y administrá la noche.</p>
          <div className="mt-5 space-y-3"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /><input className="input" type="number" value={season} onChange={(e) => setSeason(Number(e.target.value))} /><button className="btn btn-primary w-full" onClick={async () => navigate(`/admin/tournament/${await createTournament({ name, season })}`)}><Plus className="h-4 w-4" /> Crear torneo</button></div>
          <div className="mt-5 rounded-3xl border border-dashed border-white/10 p-4">
            <h2 className="font-black">Desarrollo</h2>
            <p className="mt-1 text-sm text-slate-400">Seed demo data crea 16 jugadores fake, torneo demo, bracket sorteado, resultados, goles y ranking parcial.</p>
            <button className="btn btn-ghost mt-3 w-full" disabled={loadingSeed} onClick={createDemo}><DatabaseZap className="h-4 w-4" /> {loadingSeed ? 'Creando demo...' : 'Seed demo data'}</button>
            {message && <p className="mt-3 text-sm text-slate-300">{message}</p>}
          </div>
        </section>
        <section className="space-y-3"><h2 className="text-xl font-black">Torneos</h2>{items.length === 0 && <p className="glass rounded-3xl p-5 text-sm text-slate-400">No hay torneos todavía. Creá uno o usá seed demo data.</p>}{items.map((item) => <Link key={item.id} to={`/admin/tournament/${item.id}`} className="glass flex items-center justify-between rounded-3xl p-4 shadow-card"><span><b>{item.name}</b><p className="text-xs text-slate-400">{item.season} · {item.status}</p></span><Trophy className="text-electric" /></Link>)}</section>
      </div>
    </AdminLayout>
  );
}
