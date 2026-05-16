import { createContext, useContext, useEffect, useMemo, useState } from 'react';
const RouterContext = createContext({ path: '/', navigate: (_to) => undefined });
export function RouterProvider({ children }) {
    const [path, setPath] = useState(window.location.pathname);
    useEffect(() => {
        const handler = () => setPath(window.location.pathname);
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, []);
    const value = useMemo(() => ({ path, navigate: (to) => { window.history.pushState(null, '', to); setPath(to); } }), [path]);
    return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}
export function useRouter() { return useContext(RouterContext); }
export function Link({ to, onClick, ...props }) {
    const { navigate } = useRouter();
    return <a href={to} onClick={(event) => { event.preventDefault(); onClick?.(event); navigate(to); }} {...props}/>;
}
