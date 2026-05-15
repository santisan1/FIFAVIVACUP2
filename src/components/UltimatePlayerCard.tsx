import type { AppUser, Participant } from '../types';

export function UltimatePlayerCard({ user, participant }: { user: AppUser; participant?: Participant | null }) {
  return <div className="relative overflow-hidden rounded-[2rem] border border-yellow-300/30 bg-gradient-to-br from-yellow-200/20 via-slate-900 to-cyan-500/10 p-5 shadow-card">
    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-electric/20 blur-2xl" />
    <p className="text-xs font-black uppercase tracking-[.35em] text-yellow-200">Viva Ultimate</p>
    <div className="mt-5 flex items-center gap-4">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-electric to-violet text-3xl font-black">{user.nickname.slice(0, 2).toUpperCase()}</div>
      <div><h2 className="text-3xl font-black">{user.nickname}</h2><p className="text-slate-300">{user.name}</p></div>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl bg-black/20 p-3"><p className="text-slate-400">Equipo</p><p className="font-black">{participant?.teamName ?? user.favoriteTeam ?? 'A definir'}</p></div><div className="rounded-2xl bg-black/20 p-3"><p className="text-slate-400">Rol</p><p className="font-black">{user.role}</p></div></div>
  </div>;
}
