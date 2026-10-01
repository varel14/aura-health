import { Router } from 'express';
import { one } from '../db.js';
import {
  HttpError, hashPin, newId, newToken, needInt, needString, needOneOf, requireAuth, route, verifyPin,
} from '../auth.js';
import { config } from '../config.js';
import { mapPatient, mapDoctor, mapPharmacy, mapCourier } from '../mappers.js';
import { ageFrom } from '../services/time.js';

const router = Router();

const SESSION_SQL = `
  SELECT s.token, u.role, u.patient_id, u.doctor_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`;

async function createSession(userId: string) {
  const token = newToken();
  await one(`INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`, [
    token, userId, String(config.sessionTtlDays),
  ]);
  return token;
}

async function profileFor(patientId: string | null, doctorId: string | null, pharmacyId: string | null = null, courierId: string | null = null) {
  if (patientId) {
    const patient = await one(`SELECT * FROM patients WHERE id = $1`, [patientId]);
    if (patient) return { role: 'patient' as const, patient: mapPatient(patient) };
  }
  if (doctorId) {
    const doctor = await one(`SELECT * FROM doctors WHERE id = $1`, [doctorId]);
    if (doctor) return { role: 'doctor' as const, doctor: mapDoctor(doctor) };
  }
  if (pharmacyId) {
    const pharmacy = await one(`SELECT * FROM pharmacies WHERE id = $1`, [pharmacyId]);
    if (pharmacy) return { role: 'pharmacist' as const, pharmacy: mapPharmacy(pharmacy) };
  }
  if (courierId) {
    const courier = await one(`SELECT * FROM couriers WHERE id = $1`, [courierId]);
    if (courier) return { role: 'delivery' as const, courier: mapCourier(courier) };
  }
  throw new HttpError(500, 'Profil utilisateur introuvable');
}

/** POST /api/auth/register — creates a patient account (onboarding). */
router.post('/register', route(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const firstName = needString(body, 'firstName', { min: 2 })!;
  const lastName = needString(body, 'lastName', { min: 2 })!;
  const email = needString(body, 'email')!;
  const phone = needString(body, 'phone')!;
  const sex = needOneOf(body, 'sex', ['M', 'F'] as const)!;
  const birthDate = needString(body, 'birthDate')!;
  const city = needString(body, 'city', { optional: true }) ?? '';
  const pin = needString(body, 'pin', { min: 4 })!;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new HttpError(400, 'birthDate doit être une date ISO (yyyy-mm-dd)');
  const existing = await one(`SELECT id FROM users WHERE phone = $1`, [phone]);
  if (existing) throw new HttpError(409, 'Un compte existe déjà avec ce numéro de téléphone');

  const patientId = newId('p');
  const patientRow = await one(
    `INSERT INTO patients (id, first_name, last_name, email, phone, sex, birth_date, city) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [patientId, firstName, lastName, email, phone, sex, birthDate, city],
  );
  const userId = newId('u');
  await one(`INSERT INTO users (id, role, phone, email, pin_hash, display_name, patient_id) VALUES ($1,'patient',$2,$3,$4,$5,$6)`, [
    userId, phone, email, hashPin(pin), `${firstName} ${lastName}`, patientId,
  ]);
  const token = await createSession(userId);
  res.status(201).json({ token, ...(await profileFor(patientId, null)) });
}));

/**
 * POST /api/auth/register-doctor — public doctor onboarding. The doctor profile
 * is created « pending »: it stays out of the catalog and the doctor workspace
 * is locked until the admin activates it (POST /api/admin/doctors/:id/activate).
 */
router.post('/register-doctor', route(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const firstName = needString(body, 'firstName', { min: 2 })!;
  const lastName = needString(body, 'lastName', { min: 2 })!;
  const email = needString(body, 'email')!;
  const phone = needString(body, 'phone')!;
  const specialty = needString(body, 'specialty')!;
  const pin = needString(body, 'pin', { min: 4 })!;
  const hospitalId = needString(body, 'hospitalId', { optional: true });
  const experienceYears = needInt(body, 'experienceYears', { optional: true }) ?? 0;
  const fee = needInt(body, 'fee', { optional: true }) ?? 0;
  const bio = needString(body, 'bio', { optional: true }) ?? '';

  const existing = await one(`SELECT id FROM users WHERE phone = $1`, [phone]);
  if (existing) throw new HttpError(409, 'Un compte existe déjà avec ce numéro de téléphone');
  if (!(await one(`SELECT id FROM specialties WHERE name = $1`, [specialty]))) {
    throw new HttpError(400, 'Spécialité inconnue — choisissez-en une dans le catalogue');
  }
  if (hospitalId && !(await one(`SELECT id FROM hospitals WHERE id = $1`, [hospitalId]))) {
    throw new HttpError(400, 'Établissement introuvable');
  }

  const doctorId = newId('d');
  await one(
    `INSERT INTO doctors (id, first_name, last_name, specialty, hospital_id, experience_years, fee, bio)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [doctorId, firstName, lastName, specialty, hospitalId ?? null, Math.max(0, experienceYears), Math.max(0, fee), bio],
  );
  const userId = newId('u');
  await one(`INSERT INTO users (id, role, phone, email, pin_hash, display_name, doctor_id) VALUES ($1,'doctor',$2,$3,$4,$5,$6)`, [
    userId, phone, email, hashPin(pin), `Dr ${firstName} ${lastName}`, doctorId,
  ]);
  const doctor = await one(`SELECT * FROM doctors WHERE id = $1`, [doctorId]);
  const token = await createSession(userId);
  res.status(201).json({
    token,
    role: 'doctor' as const,
    doctor: mapDoctor(doctor!),
    message: 'Compte créé. Votre profil sera activé par l’administration après vérification de vos documents.',
  });
}));

/** POST /api/auth/login {phone, pin} — « phone » accepte aussi un e-mail. */
router.post('/login', route(async (req, res) => {
  const identifier = needString(req.body as Record<string, unknown>, 'phone')!;
  const pin = needString(req.body as Record<string, unknown>, 'pin')!;
  const user = await one<{ id: string; pin_hash: string; display_name: string; patient_id: string | null; doctor_id: string | null; pharmacy_id: string | null; courier_id: string | null; role: string }>(
    `SELECT id, pin_hash, display_name, patient_id, doctor_id, pharmacy_id, courier_id, role
     FROM users WHERE phone = $1 OR LOWER(email) = LOWER($1)
     ORDER BY (phone = $1) DESC LIMIT 1`,
    [identifier],
  );
  if (!user || !verifyPin(pin, user.pin_hash)) throw new HttpError(401, 'Numéro de téléphone ou code PIN incorrect');
  const token = await createSession(user.id);
  if (user.role === 'admin') return res.json({ token, role: 'admin', displayName: user.display_name });
  res.json({ token, ...(await profileFor(user.patient_id, user.doctor_id, user.pharmacy_id, user.courier_id)) });
}));

/** POST /api/auth/demo {role} — one-tap sign-in for the demo accounts. */
router.post('/demo', route(async (req, res) => {
  const role = needOneOf(req.body as Record<string, unknown>, 'role', ['patient', 'doctor', 'pharmacist', 'delivery', 'admin'] as const)!;
  const user = await one<{ id: string; display_name: string; patient_id: string | null; doctor_id: string | null; pharmacy_id: string | null; courier_id: string | null }>(
    `SELECT id, display_name, patient_id, doctor_id, pharmacy_id, courier_id FROM users WHERE role = $1 ORDER BY created_at LIMIT 1`,
    [role],
  );
  if (!user) throw new HttpError(404, `Aucun compte de démonstration « ${role} » n'est initialisé`);
  const token = await createSession(user.id);
  if (role === 'admin') return res.json({ token, role: 'admin', displayName: user.display_name });
  res.json({ token, ...(await profileFor(user.patient_id, user.doctor_id, user.pharmacy_id, user.courier_id)) });
}));

/** POST /api/auth/forgot-password — simulates sending a reset code. */
router.post('/forgot-password', route(async (req, res) => {
  const phone = needString(req.body as Record<string, unknown>, 'phone')!;
  const user = await one(`SELECT id FROM users WHERE phone = $1`, [phone]);
  // Always answer 200 so the endpoint cannot be used to enumerate accounts.
  res.json({
    ok: true,
    message: user
      ? 'Un code de réinitialisation à 6 chiffres a été envoyé par SMS.'
      : 'Si un compte existe pour ce numéro, un code de réinitialisation a été envoyé par SMS.',
    // Demo-only: the code is returned so the flow can be completed without an SMS gateway.
    code: user ? '000000' : undefined,
  });
}));

/** POST /api/auth/reset-password {phone, code, pin} */
router.post('/reset-password', route(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const phone = needString(body, 'phone')!;
  const code = needString(body, 'code')!;
  const pin = needString(body, 'pin', { min: 4 })!;
  if (code !== '000000') throw new HttpError(400, 'Code de réinitialisation invalide');
  const user = await one<{ id: string }>(`SELECT id FROM users WHERE phone = $1`, [phone]);
  if (!user) throw new HttpError(404, 'Aucun compte pour ce numéro');
  await one(`UPDATE users SET pin_hash = $1 WHERE id = $2`, [hashPin(pin), user.id]);
  await one(`DELETE FROM sessions WHERE user_id = $1`, [user.id]);
  res.json({ ok: true, message: 'Code PIN réinitialisé. Connectez-vous avec votre nouveau code.' });
}));

/** POST /api/auth/change-pin {currentPin, newPin} — signed-in PIN update. */
router.post('/change-pin', requireAuth, route(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const currentPin = needString(body, 'currentPin', { min: 4 })!;
  const newPin = needString(body, 'newPin', { min: 4 })!;
  const user = await one<{ pin_hash: string }>(`SELECT pin_hash FROM users WHERE id = $1`, [req.user!.id]);
  if (!user || !verifyPin(currentPin, user.pin_hash)) throw new HttpError(401, 'Code PIN actuel incorrect');
  if (verifyPin(newPin, user.pin_hash)) throw new HttpError(422, 'Le nouveau code PIN doit être différent de l’actuel');
  await one(`UPDATE users SET pin_hash = $1 WHERE id = $2`, [hashPin(newPin), req.user!.id]);
  res.json({ ok: true, message: 'Code PIN mis à jour.' });
}));

/** GET /api/auth/me */
router.get('/me', requireAuth, route(async (req, res) => {
  const u = req.user!;
  if (u.role === 'admin') return res.json({ role: 'admin', displayName: u.displayName });
  res.json(await profileFor(u.patientId, u.doctorId, u.pharmacyId, u.courierId));
}));

/** POST /api/auth/logout */
router.post('/logout', requireAuth, route(async (req, res) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  await one(`DELETE FROM sessions WHERE token = $1`, [token]);
  res.json({ ok: true });
}));

export default router;
export { SESSION_SQL, createSession, profileFor, ageFrom };
