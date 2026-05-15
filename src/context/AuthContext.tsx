import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../lib/firebase';
import { getUserProfile } from '../lib/firestore';
import type { AppUser } from '../types';

interface AuthContextValue { firebaseUser: User | null; profile: AppUser | null; loading: boolean; refreshProfile: () => Promise<void>; }
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(user: User | null) {
    if (!user) { setProfile(null); return; }
    setProfile(await getUserProfile(user.uid));
  }

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    setLoading(true); setFirebaseUser(user); await loadProfile(user); setLoading(false);
  }), []);

  const value = useMemo(() => ({ firebaseUser, profile, loading, refreshProfile: () => loadProfile(firebaseUser) }), [firebaseUser, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
