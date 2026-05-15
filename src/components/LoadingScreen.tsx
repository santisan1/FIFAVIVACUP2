import { Trophy } from 'lucide-react';

export function LoadingScreen({ label = 'Cargando Viva Cup...' }: { label?: string }) {
  return <div className="grid min-h-[50vh] place-items-center text-center"><div className="space-y-4"><Trophy className="mx-auto h-12 w-12 animate-pulse text-electric" /><p className="text-sm text-slate-300">{label}</p></div></div>;
}
