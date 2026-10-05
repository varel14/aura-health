/**
 * HTTP layer for the Aura Health backend (see backend/README.md).
 * Every service call funnels through `api()` so screens exercise real
 * loading / error states against the running API.
 */
import { Platform } from 'react-native';

/**
 * Base URL of the API.
 * - Android emulator reaches the host machine via 10.0.2.2
 * - iOS simulator / device on the same LAN: localhost or EXPO_PUBLIC_API_URL
 */
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:4001' : 'http://localhost:4001');

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Bearer token store — shared between AuthContext and every service call.
// Persisted so the session survives an app restart (or a full page reload on
// web). AsyncStorage loads lazily; see `restoreToken()`.
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'aura.session.token';

let currentToken: string | null = null;
let restored = false;
let restorePromise: Promise<boolean> | null = null;
const listeners = new Set<(token: string | null) => void>();

export function getToken(): string | null {
  return currentToken;
}

export function setToken(token: string | null) {
  currentToken = token;
  restored = true;
  if (token) {
    AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
  } else {
    AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
  }
  listeners.forEach((fn) => fn(token));
}

/**
 * Loads the persisted token once at startup; returns true when a session
 * exists. Concurrent callers share the same storage read, so a screen mounted
 * before restoration (deep link, page reload) can simply await this.
 */
export function restoreToken(): Promise<boolean> {
  if (restored) return Promise.resolve(currentToken !== null);
  restorePromise ??= (async () => {
    try {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      // A login may have happened while the read was in flight — keep the
      // freshest token (memory wins over storage).
      if (stored && currentToken === null) {
        currentToken = stored;
        listeners.forEach((fn) => fn(stored));
      }
    } catch {
      /* storage unavailable — session stays in memory */
    } finally {
      restored = true;
      restorePromise = null;
    }
    return currentToken !== null;
  })();
  return restorePromise;
}

/** Subscribes to session changes; returns an unsubscribe function. */
export function onTokenChange(fn: (token: string | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Request helper
// ---------------------------------------------------------------------------

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Set false for public endpoints (catalog, health). Default true. */
  auth?: boolean;
};

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  // Deep-linked screens can mount before the persisted token is loaded —
  // wait for restoration instead of sending an anonymous request.
  if (auth && !currentToken) await restoreToken();
  const url = `${API_BASE}${path}`;
  const startedAt = Date.now();
  console.log(`[api] → ${method} ${url}${body !== undefined ? ` ${JSON.stringify(body)}` : ''}`);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth && currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.log(`[api] ✗ ${method} ${url} — réseau injoignable (${Date.now() - startedAt}ms):`, err);
    throw new ApiError('Serveur injoignable — vérifiez votre connexion.');
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && typeof (json as { error: unknown }).error === 'string'
        ? (json as { error: string }).error
        : `Erreur ${res.status}`;
    console.log(`[api] ✗ ${method} ${url} ${res.status} (${Date.now() - startedAt}ms) — ${message}`);
    throw new ApiError(message, res.status);
  }
  console.log(`[api] ← ${method} ${url} ${res.status} (${Date.now() - startedAt}ms)`);
  return json as T;
}

/** Appends non-empty filters as query parameters. */
export function qs(params: Record<string, string | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value === true ? 'true' : String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}
