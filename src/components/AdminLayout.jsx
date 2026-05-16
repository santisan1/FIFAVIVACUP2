import { Link } from 'react-router-dom';
export function AdminLayout({ children }) {
    return <div className="space-y-6"><div className="flex flex-wrap gap-2"><Link className="btn btn-ghost" to="/admin">Dashboard</Link><Link className="btn btn-ghost" to="/admin/players">Jugadores</Link></div>{children}</div>;
}
