export function ErrorState({ title = 'Algo salió mal', description }) {
    return <div className="rounded-3xl border border-danger/30 bg-danger/10 p-5"><h3 className="font-black text-danger">{title}</h3><p className="mt-1 text-sm text-slate-300">{description}</p></div>;
}
