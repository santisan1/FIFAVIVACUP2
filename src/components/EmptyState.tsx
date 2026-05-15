export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="glass rounded-3xl p-6 text-center"><h3 className="text-lg font-black">{title}</h3><p className="mt-2 text-sm text-slate-400">{description}</p></div>;
}
