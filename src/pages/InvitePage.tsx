import { useEffect, useState } from 'react';
import { loginWithInvite } from '../lib/auth';
import { useRouter } from '../components/Router';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorState } from '../components/ErrorState';

export function InvitePage({ token }: { token: string }) {
  const { navigate } = useRouter();
  const [error, setError] = useState('');
  useEffect(() => { loginWithInvite(token).then(() => navigate('/me')).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Invite inválido')); }, [token, navigate]);
  if (error) return <ErrorState title="Invite inválido" description={error} />;
  return <LoadingScreen label="Validando link privado y abriendo tu vestuario..." />;
}
