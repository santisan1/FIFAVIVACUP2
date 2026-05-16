import { createContext, useContext } from 'react';
const AuthContext = createContext({ firebaseUser: null, profile: null, loading: false, refreshProfile: async () => undefined });
export function AuthProvider({ children }) { return <AuthContext.Provider value={{ firebaseUser: null, profile: null, loading: false, refreshProfile: async () => undefined }}>{children}</AuthContext.Provider>; }
export function useAuth() { return useContext(AuthContext); }
