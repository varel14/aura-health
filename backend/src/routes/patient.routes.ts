import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, newId, requireAuth, requireRole, route } from '../auth.js';
import { mapDocument, mapPatient } from '../mappers.js';
import { todayISO } from '../services/time.js';

const router = Router();

router.use(requireAuth, requireRole('patient'));

// ---------------------------------------------------------------------------
// Patient profile + medical record
// ---------------------------------------------------------------------------

router.get('/me', route(async (req, res) => {
  const patient = await one(`SELECT * FROM patients WHERE id = $1`, [req.user!.patientId]);
  if (!patient) throw new HttpError(404, 'Dossier patient introuvable');
  res.json(mapPatient(patient));
}));

const EDITABLE = new Map([
  ['firstName', 'first_name'],
  ['lastName', 'last_name'],
  ['email', 'email'],
  ['phone', 'phone'],
  ['city', 'city'],
  ['address', 'address'],
  ['bloodType', 'blood_type'],
  ['heightCm', 'height_cm'],
  ['weightKg', 'weight_kg'],
]);

router.patch('/me', route(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, column] of EDITABLE) {
    if (body[key] !== undefined) {
      params.push(key === 'heightCm' || key === 'weightKg' ? Number(body[key]) : String(body[key]));
      sets.push(`${column} = $${params.length}`);
    }
  }
  if (body.emergencyContact !== undefined) {
    const c = body.emergencyContact as Record<string, unknown>;
    params.push(JSON.stringify({ name: String(c.name ?? ''), phone: String(c.phone ?? ''), relation: String(c.relation ?? '') }));
    sets.push(`emergency_contact = $${params.length}`);
  }
  if (sets.length === 0) throw new HttpError(400, 'Aucun champ modifiable fourni');
  params.push(req.user!.patientId);
  const updated = await one(`UPDATE patients SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
  res.json(mapPatient(updated!));
}));

// ---------------------------------------------------------------------------
// Medical documents
// ---------------------------------------------------------------------------

router.get('/documents', route(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM documents WHERE patient_id = $1 ORDER BY date DESC, created_at DESC`,
    [req.user!.patientId],
  );
  res.json(rows.map(mapDocument));
}));

router.post('/documents', route(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const name = String(body.name ?? '').trim();
  const type = String(body.type ?? 'compte-rendu').trim();
  if (!name) throw new HttpError(400, 'Le nom du document est requis');
  const date = String(body.date ?? todayISO());
  const doc = await one(
    `INSERT INTO documents (id, patient_id, name, type, date, source, size_kb) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [newId('doc'), req.user!.patientId, name, type, date, String(body.source ?? 'imported'), Number(body.sizeKb ?? 120)],
  );
  res.status(201).json(mapDocument(doc!));
}));

export default router;
