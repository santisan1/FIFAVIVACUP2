import { CheckCircle2, ShieldAlert, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { joinTournamentLobby } from '../lib/firestore';

function stateText(status) {
  if (status === 'draw') return 'Sorteo en curso. Mirá la pantalla grande.';
  if (status === 'active') return 'Torneo en vivo. Revisá tu próximo partido.';
  if (status === 'finished') return 'Torneo terminado. Ya podés ver tu resultado final.';
  return 'Estás adentro. Esperando sorteo.';
}

export function JoinPage() {
  const { tournamentId = '', playerId = '' } = useParams();
  const [params] = useSearchParams();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [activeTab, setActiveTab] = useState('Sala');

  useEffect(() => {
    const introSeen = localStorage.getItem(`fvc_intro_seen_${playerId}`) === '1';
    setShowIntro(!introSeen);
    const incomingToken = params.get('token');
    if (incomingToken) localStorage.setItem(`fvc_magic_${playerId}`, incomingToken);
    const persistedToken = incomingToken || localStorage.getItem(`fvc_magic_${playerId}`) || '';
    setLoading(true);
    void joinTournamentLobby(tournamentId, playerId, persistedToken)
      .then(setDashboard)
      .catch((error) => {
        if (import.meta.env.DEV) console.error('No se pudo entrar a la sala.', error);
        setDashboard({ valid: false, reason: 'No se pudo cargar Firestore. Revisá conexión o permisos.' });
      })
      .finally(() => setLoading(false));
  }, [tournamentId, playerId, params]);

  if (loading) return <div className="mx-auto max-w-xl glass h-80 animate-pulse rounded-[2rem]" />;
  if (!dashboard?.valid) return <InvalidJoin reason={dashboard?.reason} />;
  if (showIntro) return <JoinSplashScreen playerName={dashboard?.player?.nickname || dashboard?.player?.name} tournamentName={dashboard?.tournament?.name} onEnter={() => { localStorage.setItem(`fvc_intro_seen_${playerId}`, '1'); setShowIntro(false); }} />;

  const { player, tournament, participant, readyCount, participantsCount, status } = dashboard;
  const progress = participantsCount ? Math.round((readyCount / participantsCount) * 100) : 0;
  const nextMatch = status?.nextMatch;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="glass overflow-hidden rounded-[2rem] p-6 text-center shadow-card">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-winner/15 text-winner"><CheckCircle2 className="h-9 w-9" /></div>
        <p className="mt-4 text-xs font-black uppercase tracking-[.3em] text-electric">Sala FIFAVIVA CUP</p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">Estás adentro, {player.nickname || player.name}</h1>
        <p className="mt-3 text-xl font-black text-winner">Equipo: {participant.teamName || 'pendiente'}</p>
        <p className="mt-2 text-slate-300">{stateText(tournament.status)}</p>
      </section>

      <nav className="flex flex-wrap gap-2">
        {['Sala', 'Torneo', 'Perfil'].map((tab) => (
          <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </nav>

      {activeTab === 'Sala' && <section className="glass rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.2em] text-slate-400">{tournament.name}</p><h2 className="text-2xl font-black">Jugadores presentes</h2></div><b className="text-3xl text-electric">{readyCount}/{participantsCount}</b></div>
        <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-winner to-electric" style={{ width: `${progress}%` }} /></div>
        <p className="mt-3 text-sm text-slate-400">Cuando estén todos, el admin inicia el sorteo. Si es modo grupos, primero se arman 4 grupos y después pasan los 2 mejores a cuartos.</p>
      </section>}

      {activeTab === 'Torneo' && <section className="glass rounded-3xl p-5 shadow-card">
        <p className="text-xs uppercase tracking-[.2em] text-slate-400">Seguimiento del torneo</p>
        <h3 className="mt-1 text-xl font-black">Estado: {status?.state || 'En competencia'}</h3>
        {nextMatch ? (
          <p className="mt-2 text-slate-300">
            Próximo partido: <b>{nextMatch.playerAName}</b> vs <b>{nextMatch.playerBName}</b>
          </p>
        ) : (
          <p className="mt-2 text-slate-400">Todavía no hay próximo partido confirmado para vos.</p>
        )}
      </section>}

      {activeTab === 'Perfil' && <section className="glass rounded-3xl p-5 shadow-card">
        <p className="text-xs uppercase tracking-[.2em] text-slate-400">Perfil rápido</p>
        <h3 className="mt-1 text-2xl font-black">{player.nickname || player.name}</h3>
        <p className="mt-2 text-slate-300">Equipo asignado: <b>{participant.teamName || 'pendiente'}</b></p>
        <p className="mt-1 text-slate-400">Torneo: {tournament.name}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="btn btn-primary" to={`/player/${player.id}?token=${player.accessToken}`}>Abrir perfil completo</Link>
          <Link className="btn btn-ghost" to={`/season/${new Date().getFullYear()}`}>Ver ranking</Link>
        </div>
      </section>}

      <div className="flex flex-wrap justify-center gap-3">
        <Link className="btn btn-primary" to={`/player/${player.id}?token=${player.accessToken}`}>Ver mi perfil</Link>
        <Link className="btn btn-ghost" to={`/tournament/${tournament.id}`}>Ver torneo</Link>
      </div>
    </div>
  );
}

function JoinSplashScreen({ onEnter, playerName, tournamentName }) {
  return <div className="mx-auto max-w-3xl glass rounded-[2rem] p-8 text-center shadow-card"><p className="text-xs font-black uppercase tracking-[.35em] text-electric">FIFAVIVA CUP</p><h1 className="mt-4 text-5xl font-black md:text-7xl">Bienvenido a la sala</h1><p className="mt-4 text-slate-300">{playerName ? `${playerName}, ` : ''}preparate para seguir {tournamentName || 'el torneo'} en vivo.</p><button className="btn btn-primary mt-6" onClick={onEnter}><Trophy className="h-4 w-4" /> Entrar ahora</button></div>;
}

function InvalidJoin({ reason }) {
  return <div className="mx-auto max-w-lg glass rounded-3xl p-6 text-center shadow-card"><ShieldAlert className="mx-auto h-10 w-10 text-danger" /><h1 className="mt-3 text-2xl font-black">No pudiste entrar a la sala</h1><p className="mt-2 text-slate-300">{reason || 'Link inválido. Pedile uno nuevo al admin.'}</p><Trophy className="mx-auto mt-5 h-8 w-8 text-electric" /></div>;
}
