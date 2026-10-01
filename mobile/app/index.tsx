import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function Entry() {
  const { onboarded, role } = useAuth();
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (role === 'doctor') return <Redirect href="/(doctor)" />;
  if (role === 'patient') return <Redirect href="/(patient)" />;
  if (role === 'pharmacist') return <Redirect href="/(pharmacy)" />;
  if (role === 'delivery') return <Redirect href="/(delivery)" />;
  if (role === 'admin') return <Redirect href="/(admin)" />;
  return <Redirect href="/(auth)/login" />;
}
