import { createContext, useContext, useMemo, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Role } from '@/models/types';
import { api, onTokenChange, restoreToken, setToken } from '@/services/api';

/**
 * Seeded demo accounts (backend/src/seed/seed.ts). Quick-access buttons sign
 * in through POST /api/auth/login with these identifiers and the demo PIN —
 * the same body a manual sign-in sends.
 */
export const DEMO_PIN = '1234';
export const DEMO_ACCOUNTS: Record<Role, string> = {
  patient: '+237 691 45 78 20',
  doctor: '+237 690 00 00 01',
  pharmacist: '+237 622 21 45 90',
  delivery: '+237 655 40 12 88',
  admin: '+237 690 00 00 00',
};

type LoginResponse = {
  token: string;
  role: Role;
  displayName?: string;
  patient?: { firstName: string; lastName: string };
  doctor?: { firstName: string; lastName: string };
  pharmacy?: { name: string };
  courier?: { firstName: string; lastName: string };
};

/** What a successful sign-in tells the caller: where to route and who greeted. */
export interface AuthSuccess {
  role: Role;
  name: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sex: 'M' | 'F';
  birthDate: string; // ISO yyyy-mm-dd
  city?: string;
  pin: string;
}

function greeting(res: LoginResponse): string {
  if (res.patient) return `${res.patient.firstName} ${res.patient.lastName}`;
  if (res.doctor) return `Dr ${res.doctor.firstName} ${res.doctor.lastName}`;
  if (res.pharmacy) return res.pharmacy.name;
  if (res.courier) return `${res.courier.firstName} ${res.courier.lastName}`;
  return res.displayName ?? '';
}

interface AuthContextValue {
  onboarded: boolean;
  role: Role | null;
  /** True while a sign-in round-trip is in flight. */
  signingIn: boolean;
  completeOnboarding: () => void;
  /** POST /api/auth/login {phone, pin} — « phone » accepts an e-mail too. */
  login: (identifier: string, pin: string) => Promise<AuthSuccess>;
  /** One-tap demo sign-ins: POST /api/auth/login with the seeded credentials. */
  signInPatient: () => Promise<AuthSuccess>;
  signInDoctor: () => Promise<AuthSuccess>;
  signInPharmacist: () => Promise<AuthSuccess>;
  signInDelivery: () => Promise<AuthSuccess>;
  signInAdmin: () => Promise<AuthSuccess>;
  /** POST /api/auth/register — creates the patient account and its session. */
  registerPatient: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [onboarded, setOnboarded] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const openSession = useCallback(async (res: LoginResponse): Promise<AuthSuccess> => {
    // Token first: AppDataContext listens for it and hydrates the session.
    setToken(res.token);
    setRole(res.role);
    return { role: res.role, name: greeting(res) };
  }, []);

  const login = useCallback(
    async (identifier: string, pin: string) => {
      setSigningIn(true);
      try {
        return await openSession(
          await api<LoginResponse>('/api/auth/login', { method: 'POST', body: { phone: identifier.trim(), pin } }),
        );
      } finally {
        setSigningIn(false);
      }
    },
    [openSession],
  );

  const signInAs = useCallback((demoRole: keyof typeof DEMO_ACCOUNTS) => login(DEMO_ACCOUNTS[demoRole], DEMO_PIN), [login]);

  const signOut = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* session is being discarded either way */
    }
    setToken(null);
    setRole(null);
  }, []);

  const registerPatient = useCallback(
    async (input: RegisterInput) => {
      setSigningIn(true);
      try {
        // The account is created with an active session: no extra sign-in step.
        await openSession(
          await api<LoginResponse>('/api/auth/register', { method: 'POST', body: input, auth: false }),
        );
      } finally {
        setSigningIn(false);
      }
    },
    [openSession],
  );

  // Session restore: a persisted token resumes the role after a restart.
  // AppDataContext reacts to the token change and rehydrates on its own.
  useEffect(() => {
    (async () => {
      AsyncStorage.getItem('aura.onboarded')
        .then((v) => v === '1' && setOnboarded(true))
        .catch(() => {});
      const hasToken = await restoreToken();
      if (!hasToken) return;
      try {
        const me = await api<{ role: Role }>('/api/auth/me');
        setRole(me.role);
      } catch {
        setToken(null);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      onboarded,
      role,
      signingIn,
      completeOnboarding: () => {
        setOnboarded(true);
        AsyncStorage.setItem('aura.onboarded', '1').catch(() => {});
      },
      login,
      signInPatient: () => signInAs('patient'),
      signInDoctor: () => signInAs('doctor'),
      signInPharmacist: () => signInAs('pharmacist'),
      signInDelivery: () => signInAs('delivery'),
      signInAdmin: () => signInAs('admin'),
      registerPatient,
      signOut,
    }),
    [onboarded, role, signingIn, login, signInAs, registerPatient, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Re-exported so AppDataContext can react to session changes. */
export { onTokenChange };
