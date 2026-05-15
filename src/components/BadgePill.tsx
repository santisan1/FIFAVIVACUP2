export function BadgePill({ icon, label }: { icon: string; label: string }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold"><span>{icon}</span>{label}</span>;
}
