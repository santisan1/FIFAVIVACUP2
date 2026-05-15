export function StatPill({ label, value }: { label: string; value: string | number }) {
  return <div className="glass rounded-2xl p-4"><p className="text-xs uppercase tracking-[.22em] text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}
