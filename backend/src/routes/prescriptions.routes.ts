import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, newId, needString, requireAuth, route } from '../auth.js';
import { mapPrescription } from '../mappers.js';
import { notify } from '../services/notify.js';
import { expiryFor, newPrescriptionCode, statusFor } from '../services/triage.js';
import { todayISO } from '../services/time.js';

const router = Router();

router.use(requireAuth);

/** GET /api/prescriptions — patient: own list; doctor: what they issued. */
router.get('/', route(async (req, res) => {
  const user = req.user!;
  const where = user.role === 'patient' ? 'WHERE patient_id = $1' : 'WHERE doctor_id = $1';
  const { rows } = await query(`SELECT * FROM prescriptions ${where} ORDER BY date DESC, created_at DESC`, [
    user.role === 'patient' ? user.patientId : user.doctorId,
  ]);
  res.json(rows.map(mapPrescription));
}));

router.get('/:id', route(async (req, res) => {
  const user = req.user!;
  const rx = await one(
    `SELECT * FROM prescriptions WHERE id = $1 AND ${user.role === 'patient' ? 'patient_id' : 'doctor_id'} = $2`,
    [req.params.id, user.role === 'patient' ? user.patientId : user.doctorId],
  );
  if (!rx) throw new HttpError(404, 'Ordonnance introuvable');
  res.json(mapPrescription(rx));
}));

interface RxLine {
  medicationId?: string;
  name: string;
  dosage: string;
  form: string;
  quantity: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

function parseLines(raw: unknown): RxLine[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, 'Au moins une ligne de prescription est requise (lines)');
  return (raw as Record<string, unknown>[]).map((line, i) => {
    const name = String(line.name ?? '').trim();
    if (!name) throw new HttpError(400, `Ligne ${i + 1} : le nom du médicament est requis`);
    return {
      medicationId: line.medicationId ? String(line.medicationId) : undefined,
      name,
      dosage: String(line.dosage ?? ''),
      form: String(line.form ?? 'comprimé'),
      quantity: String(line.quantity ?? '1 boîte'),
      frequency: String(line.frequency ?? ''),
      duration: String(line.duration ?? ''),
      instructions: line.instructions ? String(line.instructions) : undefined,
    };
  });
}

/** POST /api/prescriptions — doctor issues a prescription for a patient. */
router.post('/', requireAuth, route(async (req, res) => {
  if (req.user!.role !== 'doctor') throw new HttpError(403, 'Seul un médecin peut créer une ordonnance');
  const body = req.body as Record<string, unknown>;
  const patientId = needString(body, 'patientId')!;
  const lines = parseLines(body.lines);
  const instructions = needString(body, 'instructions', { optional: true });

  const patient = await one(`SELECT * FROM patients WHERE id = $1`, [patientId]);
  if (!patient) throw new HttpError(404, 'Patient introuvable');
  const doctor = await one(`SELECT * FROM doctors WHERE id = $1`, [req.user!.doctorId]);
  if (!doctor || doctor.activation_status !== 'active') {
    throw new HttpError(403, 'Compte médecin en attente de validation par l’administration');
  }

  const date = todayISO();
  const expiryDate = expiryFor(date);
  const id = newId('rx');
  const created = await one(
    `INSERT INTO prescriptions (id, code, patient_id, patient_name, doctor_id, doctor_name, doctor_specialty, establishment, date, expiry_date, status, source, lines, instructions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'aura',$12,$13) RETURNING *`,
    [
      id, newPrescriptionCode(), patientId, `${patient.first_name} ${patient.last_name}`, doctor!.id,
      `Dr ${doctor!.first_name} ${doctor!.last_name}`, doctor!.specialty, `Dr ${doctor!.last_name}`,
      date, expiryDate, statusFor(date, expiryDate), JSON.stringify(lines), instructions ?? null,
    ],
  );

  await notify({
    patientId,
    type: 'prescription',
    title: 'Nouvelle ordonnance',
    body: `Dr ${doctor!.first_name} ${doctor!.last_name} vous a prescrit ${lines.length} traitement(s). Ordonnance ${created!.code}.`,
    deepLink: `/prescriptions/${id}`,
  });

  // The prescription lands in the patient's medical records as a viewable document.
  await one(
    `INSERT INTO documents (id, patient_id, name, type, date, source, size_kb, deep_link) VALUES ($1,$2,$3,'ordonnance',$4,'aura',$5,$6)`,
    [newId('doc'), patientId, `Ordonnance ${created!.code}`, date, 150, `/prescriptions/${id}`],
  );

  res.status(201).json(mapPrescription(created!));
}));

/** POST /api/prescriptions/import — patient imports a paper prescription. */
router.post('/import', route(async (req, res) => {
  if (req.user!.role !== 'patient') throw new HttpError(403, 'Seul un patient peut importer une ordonnance');
  const body = req.body as Record<string, unknown>;
  const pid = req.user!.patientId!;
  const lines = parseLines(body.lines);
  const doctorName = needString(body, 'doctorName', { optional: true }) ?? 'Médecin extérieur';
  const establishment = needString(body, 'establishment', { optional: true }) ?? 'Établissement externe';
  const date = needString(body, 'date', { optional: true }) ?? todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'date doit être une date ISO (yyyy-mm-dd)');
  const expiryDate = expiryFor(date);

  const patient = await one(`SELECT * FROM patients WHERE id = $1`, [pid]);
  const id = newId('rx');
  const created = await one(
    `INSERT INTO prescriptions (id, code, patient_id, patient_name, doctor_id, doctor_name, doctor_specialty, establishment, date, expiry_date, status, source, lines, instructions)
     VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9,$10,'imported',$11,$12) RETURNING *`,
    [
      id, newPrescriptionCode(), pid, `${patient!.first_name} ${patient!.last_name}`, doctorName, '',
      establishment, date, expiryDate, statusFor(date, expiryDate), JSON.stringify(lines),
      needString(body, 'instructions', { optional: true }) ?? null,
    ],
  );

  await one(
    `INSERT INTO documents (id, patient_id, name, type, date, source, size_kb, deep_link) VALUES ($1,$2,$3,'ordonnance',$4,'imported',$5,$6)`,
    [newId('doc'), pid, `Ordonnance ${created!.code}`, date, Number(body.sizeKb ?? 160), `/prescriptions/${id}`],
  );

  await notify({
    patientId: pid,
    type: 'prescription',
    title: 'Ordonnance importée',
    body: `L'ordonnance ${created!.code} (${lines.length} traitement(s)) a été ajoutée à votre dossier.`,
    deepLink: `/prescriptions/${id}`,
  });

  res.status(201).json(mapPrescription(created!));
}));

export default router;
