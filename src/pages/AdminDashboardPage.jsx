import { CheckCircle2, ClipboardList, DatabaseZap, Link as LinkIcon, Plus, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { createTournament, getActiveTournament, listTournaments, seedDemoData } from '../lib/firestore';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [name, setName] = useState(`Viva Cup ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`);
  const [season, setSeason] = useState(new Date().getFullYear());
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    const [tournaments, activeTournament] = await Promise.all([listTournaments(), getActiveTournament()]);
    setItems(tournaments);
    setActive(activeTournament);
  };
  useEffect(() => { void refresh(); }, []);

  async function createNewTournament() {
    const tournamentId = await createTournament({ name, season });
    navigate(`/admin/tournament/${tournamentId}`);
  }

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
      <div className="space-y-6">
        <section className="glass rounded-[2rem] p-5 shadow-card md:p-6">
          <p className="text-xs font-black uppercase tracking-[.3em] text-electric">Preparar torneo en 5 minutos</p>
          <h1 className="mt-2 text-4xl font-black">Control room de la noche</h1>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {['Crear torneo', 'Agregar jugadores', 'Copiar magic links', 'Sortear cruces', 'Cargar resultados'].map((step, index) => <Step key={step} number={index + 1} label={step} />)}
          </div>
        </section>

        {active && (
          <section className="glass flex flex-col gap-4 rounded-[2rem] p-5 shadow-card md:flex-row md:items-center md:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[.25em] text-winner">Torneo activo detectado</p><h2 className="mt-1 text-3xl font-black">{active.name}</h2><p className="text-sm text-slate-400">{active.season} · {active.status}</p></div>
            <div className="flex flex-wrap gap-2"><Link className="btn btn-primary" to={`/admin/tournament/${active.id}`}>Gestionar ahora</Link><Link className="btn btn-ghost" to={`/tournament/${active.id}`}>Vista pública</Link><Link className="btn btn-ghost" to={`/tv/${active.id}`}>Modo TV</Link></div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <section className="glass rounded-[2rem] p-5 shadow-card">
            <p className="text-xs font-black uppercase tracking-[.3em] text-electric">Paso 1</p>
            <h2 className="mt-2 text-3xl font-black">Crear torneo</h2>
            <p className="mt-2 text-sm text-slate-300">Creá el torneo y entrá directo a cargar participantes.</p>
            <div className="mt-5 space-y-3">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input" type="number" value={season} onChange={(e) => setSeason(Number(e.target.value))} />
              <button className="btn btn-primary w-full" onClick={createNewTournament}><Plus className="h-4 w-4" /> Crear torneo</button>
            </div>
            <div className="mt-5 rounded-3xl border border-dashed border-white/10 p-4">
              <h3 className="font-black">Demo para probar el flujo</h3>
              <p className="mt-1 text-sm text-slate-400">Crea 16 jugadores fake, torneo demo, bracket sorteado, resultados, goles y ranking parcial.</p>
              <button className="btn btn-ghost mt-3 w-full" disabled={loadingSeed} onClick={createDemo}><DatabaseZap className="h-4 w-4" /> {loadingSeed ? 'Creando demo...' : 'Seed demo data'}</button>
              {message && <p className="mt-3 text-sm text-slate-300">{message}</p>}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black">Torneos recientes</h2>
            {items.length === 0 && <p className="glass rounded-3xl p-5 text-sm text-slate-400">No hay torneos todavía. Creá uno o usá seed demo data.</p>}
            {items.map((item) => <Link key={item.id} to={`/admin/tournament/${item.id}`} className="glass flex items-center justify-between rounded-3xl p-4 shadow-card"><span><b>{item.name}</b><p className="text-xs text-slate-400">{item.season} · {item.status}</p></span><Trophy className="text-electric" /></Link>)}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function Step({ number, label }) { return <div className="rounded-3xl bg-white/5 p-4"><div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-electric/20 text-sm font-black text-electric">{number}</span><CheckCircle2 className="h-4 w-4 text-winner" /></div><p className="font-black">{label}</p>{number === 2 && <Users className="mt-3 h-5 w-5 text-electric" />}{number === 3 && <LinkIcon className="mt-3 h-5 w-5 text-electric" />}{number === 5 && <ClipboardList className="mt-3 h-5 w-5 text-electric" />}</div>; }
