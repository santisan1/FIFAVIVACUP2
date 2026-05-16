import { useState } from 'react';
const PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || 'viva2026';
export function AdminRoute({ children }) {
    const [ok, setOk] = useState(localStorage.getItem('viva-admin') === PASSCODE);
    const [code, setCode] = useState('');
    if (ok)
        return <>{children}</>;
    return (<div className="mx-auto max-w-md space-y-4 rounded-[2rem] glass p-6 shadow-card">
      <p className="text-sm font-black uppercase tracking-[.3em] text-electric">Zona admin</p>
      <h1 className="text-3xl font-black">Entrá con passcode</h1>
      <p className="text-sm text-slate-300">Protección simple para la juntada. Configurable con VITE_ADMIN_PASSCODE.</p>
      <input className="input text-center text-2xl font-black tracking-[.4em]" type="password" value={code} onChange={(event) => setCode(event.target.value)} placeholder="••••"/>
      <button className="btn btn-primary w-full" onClick={() => { if (code === PASSCODE) {
        localStorage.setItem('viva-admin', code);
        setOk(true);
    } }}>Entrar al control room</button>
    </div>);
}
