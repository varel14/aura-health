import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { one } from './db.js';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps an async route so rejections hit the central error handler. */
export function route(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function needString(body: Record<string, unknown>, key: string, opts: { min?: number; optional?: boolean } = {}): string | undefined {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') {
    if (opts.optional) return undefined;
    throw new HttpError(400, `Champ requis manquant : ${key}`);
  }
  const value = String(raw).trim();
  if (opts.min !== undefined && value.length < opts.min) {
    throw new HttpError(400, `Le champ ${key} doit contenir au moins ${opts.min} caractères`);
  }
  return value;
}

export function needOneOf<T extends string>(body: Record<string, unknown>, key: string, allowed: readonly T[], opts: { optional?: boolean } = {}): T | undefined {
  const raw = body[key] === undefined ? undefined : String(body[key]);
  if (raw === undefined) {
    if (opts.optional) return undefined;
    throw new HttpError(400, `Champ requis manquant : ${key}`);
  }
  if (!allowed.includes(raw as T)) {
    throw new HttpError(400, `Valeur invalide pour ${key} : ${raw} (attendu : ${allowed.join(', ')})`);
  }
  return raw as T;
}

export function needInt(body: Record<string, unknown>, key: string, opts: { optional?: boolean } = {}): number | undefined {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') {
    if (opts.optional) return undefined;
    throw new HttpError(400, `Champ requis manquant : ${key}`);
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new HttpError(400, `Le champ ${key} doit être un nombre`);
  return Math.round(n);
}

/** Validates an ISO date (yyyy-mm-dd). */
export function needDate(body: Record<string, unknown>, key: string, opts: { optional?: boolean } = {}): string | undefined {
  const raw = needString(body, key, opts);
  if (raw === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00`))) {
    throw new HttpError(400, `Le champ ${key} doit être une date ISO (yyyy-mm-dd)`);
  }
  return raw;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export function needTime(body: Record<string, unknown>, key: string, opts: { optional?: boolean } = {}): string | undefined {
  const raw = needString(body, key, opts);
  if (raw === undefined) return undefined;
  if (!TIME_RE.test(raw)) throw new HttpError(400, `Le champ ${key} doit être une heure HH:mm`);
  return raw;
}

// ---------------------------------------------------------------------------
// Pin hashing (scrypt, no native deps)
// ---------------------------------------------------------------------------

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function newToken(): string {
  return randomBytes(24).toString('hex');
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

export type AppRole = 'patient' | 'doctor' | 'pharmacist' | 'delivery' | 'admin';

export interface AuthUser {
  id: string;
  role: AppRole;
  displayName: string;
  patientId: string | null;
  doctorId: string | null;
  pharmacyId: string | null;
  courierId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new HttpError(401, 'Authentification requise');
    const row = await one<{
      id: string; role: string; display_name: string;
      patient_id: string | null; doctor_id: string | null;
      pharmacy_id: string | null; courier_id: string | null; expires_at: string;
    }>(
      `SELECT u.id, u.role, u.display_name, u.patient_id, u.doctor_id, u.pharmacy_id, u.courier_id, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > now()`,
      [token],
    );
    if (!row) throw new HttpError(401, 'Session expirée ou invalide');
    req.user = {
      id: row.id,
      role: row.role as AuthUser['role'],
      displayName: row.display_name,
      patientId: row.patient_id,
      doctorId: row.doctor_id,
      pharmacyId: row.pharmacy_id,
      courierId: row.courier_id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: AppRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'Authentification requise'));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, `Accès réservé au rôle « ${roles.join(' » ou « ')} »`));
    }
    next();
  };
}

/**
 * After requireRole('doctor'): rejects doctors whose profile has not been
 * activated by the admin (pending or rejected). Seeded/demo doctors are active.
 */
export async function requireActiveDoctor(req: Request, _res: Response, next: NextFunction) {
  try {
    const row = await one<{ activation_status: string }>(
      `SELECT activation_status FROM doctors WHERE id = $1`,
      [req.user!.doctorId],
    );
    if (!row || row.activation_status !== 'active') {
      return next(new HttpError(403, 'Compte médecin en attente de validation par l’administration'));
    }
    next();
  } catch (err) {
    next(err);
  }
}
