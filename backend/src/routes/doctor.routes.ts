import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, requireActiveDoctor, requireAuth, requireRole, route } from '../auth.js';
import { mapAppointment, mapDoctorPatientFile, mapSymptomPrep } from '../mappers.js';
import { todayISO } from '../services/time.js';

const router = Router();

// Doctors awaiting admin activation cannot use the workspace yet.
router.use(requireAuth, requireRole('doctor'), requireActiveDoctor);

/** GET /api/doctor/patients — the doctor's patient files. */
router.get('/patients', route(async (req, res) => {
  const { rows } = await query(`SELECT * FROM doctor_patients WHERE doctor_id = $1 ORDER BY id`, [req.user!.doctorId]);
  res.json(rows.map(mapDoctorPatientFile));
}));

router.get('/patients/:id', route(async (req, res) => {
  const row = await one(`SELECT * FROM doctor_patients WHERE id = $1 AND doctor_id = $2`, [req.params.id, req.user!.doctorId]);
  if (!row) throw new HttpError(404, 'Dossier patient introuvable');
  res.json(mapDoctorPatientFile(row));
}));

/**
 * GET /api/doctor/symptom-preps?patientId= — symptom preps of the doctor's
 * patients, INCLUDING the Groq AI diagnostic. This is the only endpoint that
 * exposes the diagnostic (physician-only, enforced by the role gate above).
 */
router.get('/symptom-preps', route(async (req, res) => {
  const patientId = (req.query as Record<string, string | undefined>).patientId;
  const params: unknown[] = [req.user!.doctorId];
  let clause = '';
  if (patientId) {
    params.push(patientId);
    clause = `AND sp.patient_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT sp.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name
     FROM symptom_preps sp JOIN patients p ON p.id = sp.patient_id
     WHERE EXISTS (SELECT 1 FROM appointments a WHERE a.doctor_id = $1 AND a.patient_id = sp.patient_id) ${clause}
     ORDER BY sp.created_at DESC`,
    params,
  );
  res.json(
    rows.map((r) => ({
      ...mapSymptomPrep(r, { includeDiagnostic: true }),
      patientId: r.patient_id,
      patientName: `${r.patient_first_name} ${r.patient_last_name}`,
    })),
  );
}));

/** GET /api/doctor/agenda?date= — the doctor's day, enriched with patient info. */
router.get('/agenda', route(async (req, res) => {
  const date = String((req.query as Record<string, string | undefined>).date ?? todayISO());
  const { rows } = await query(
    `SELECT a.*, p.birth_date AS patient_birth_date, p.blood_type, p.phone AS patient_phone
     FROM appointments a LEFT JOIN patients p ON p.id = a.patient_id
     WHERE a.doctor_id = $1 AND a.date = $2 AND a.status <> 'cancelled'
     ORDER BY a.time`,
    [req.user!.doctorId, date],
  );
  res.json({ date, appointments: rows.map((r) => ({ ...mapAppointment(r), patientPhone: r.patient_phone ?? undefined, bloodType: r.blood_type ?? undefined })) });
}));

export default router;
