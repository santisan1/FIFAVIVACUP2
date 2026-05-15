import { createContext, type AnchorHTMLAttributes, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

const RouterContext = createContext({ path: '/', navigate: (_to: string) => undefined as void });

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  const value = useMemo(() => ({ path, navigate: (to: string) => { window.history.pushState(null, '', to); setPath(to); } }), [path]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() { return useContext(RouterContext); }
export function Link({ to, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const { navigate } = useRouter();
  return <a href={to} onClick={(event) => { event.preventDefault(); onClick?.(event); navigate(to); }} {...props} />;
}
