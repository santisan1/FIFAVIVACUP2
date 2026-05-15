import type { AppUser } from '../types';
export function PlayerCard({ user }: { user: AppUser }) { return <div className="glass rounded-2xl p-4"><p className="font-black">{user.nickname}</p><p className="text-sm text-slate-400">{user.favoriteTeam ?? 'Sin equipo favorito'}</p></div>; }
