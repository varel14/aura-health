import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, newId, needDate, needOneOf, needString, needTime, requireAuth, route } from '../auth.js';
import { mapAppointment, toDateOnly } from '../mappers.js';
import { notify } from '../services/notify.js';
import { generateAndStoreSummary } from '../services/summaryService.js';
import { ageFrom, fullDateFR } from '../services/time.js';

const router = Router();

router.use(requireAuth);

const CONSULT_TYPES = ['video', 'chat', 'in-person'] as const;

interface DoctorFees { fee: number; video_fee: number | null; chat_fee: number | null }

function feeFor(doctor: DoctorFees, type: string): number {
  if (type === 'video') return doctor.video_fee ?? doctor.fee;
  if (type === 'chat') return doctor.chat_fee ?? Math.round(doctor.fee * 0.7);
  return doctor.fee;
}

/** POST /api/appointments — books a slot (mirrors the mobile 5-step booking wizard). */
router.post('/', route(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const user = req.user!;
  const patientId = user.role === 'patient' ? user.patientId! : needString(body, 'patientId')!;
  const patient = await one<{ id: string; first_name: string; last_name: string; birth_date: Date }>(
    `SELECT * FROM patients WHERE id = $1`,
    [patientId],
  );
  if (!patient) throw new HttpError(404, 'Patient introuvable');

  const doctor = await one<{ id: string; first_name: string; last_name: string; specialty: string; fee: number; video_fee: number | null; chat_fee: number | null; video_available: boolean; chat_available: boolean; in_person_available: boolean; hospital_id: string | null; activation_status: string }>(
    `SELECT * FROM doctors WHERE id = $1`,
    [needString(body, 'doctorId')!],
  );
  // Pending/rejected doctors are not bookable even if their id is known.
  if (!doctor || doctor.activation_status !== 'active') throw new HttpError(404, 'Médecin introuvable');

  const type = needOneOf(body, 'type', CONSULT_TYPES)!;
  const typeAvailable = { video: doctor.video_available, chat: doctor.chat_available, 'in-person': doctor.in_person_available }[type];
  if (!typeAvailable) throw new HttpError(422, `Le Dr ${doctor.last_name} n'accepte pas les consultations de ce type`);

  const date = needDate(body, 'date')!;
  const time = needTime(body, 'time')!;
  const motif = needString(body, 'motif', { min: 5 })!;
  const symptoms = Array.isArray(body.symptoms) ? (body.symptoms as unknown[]).map(String) : [];

  // Availability: slot must be free (cancelled appointments free their slot).
  const clash = await one(`SELECT id FROM appointments WHERE doctor_id = $1 AND date = $2 AND time = $3 AND status IN ('confirmed','pending','completed')`, [doctor.id, date, time]);
  if (clash) throw new HttpError(409, 'Ce créneau vient d’être réservé — choisissez-en un autre');

  const establishment = needString(body, 'establishment', { optional: true }) ?? `Cabinet du praticien`;
  const fee = feeFor(doctor, type);
  const id = newId('appt');
  const created = await one(
    `INSERT INTO appointments (id, doctor_id, patient_id, patient_name, patient_age, type, status, date, time, motif, symptoms, fee, establishment)
     VALUES ($1,$2,$3,$4,$5,$6,'confirmed',$7,$8,$9,$10,$11,$12) RETURNING *`,
    [id, doctor.id, patientId, `${patient.first_name} ${patient.last_name}`, ageFrom(toDateOnly(patient.birth_date)), type, date, time, motif, JSON.stringify(symptoms), fee, establishment],
  );

  // A chat consultation opens its message thread right away.
  if (type === 'chat') {
    await one(
      `INSERT INTO chat_threads (id, appointment_id, doctor_id, patient_id) VALUES ($1,$2,$3,$4)`,
      [newId('th'), id, doctor.id, patientId],
    );
  }

  await notify({
    patientId,
    type: 'appointment',
    title: 'Rendez-vous confirmé',
    body: `Votre ${type === 'video' ? 'téléconsultation' : type === 'chat' ? 'consultation par messagerie' : 'consultation'} avec Dr ${doctor.first_name} ${doctor.last_name} le ${fullDateFR(date)} à ${time} est confirmée.`,
    deepLink: `/appointment/${id}`,
  });

  res.status(201).json(mapAppointment(created!));
}));

/** GET /api/appointments — patient: own visits; doctor: own agenda (optionally ?date=). */
router.get('/', route(async (req, res) => {
  const user = req.user!;
  const { date, status } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (user.role === 'patient') { params.push(user.patientId); clauses.push(`patient_id = $${params.length}`); }
  else { params.push(user.doctorId); clauses.push(`doctor_id = $${params.length}`); }
  if (date) { params.push(date); clauses.push(`date = $${params.length}`); }
  if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
  const where = `WHERE ${clauses.join(' AND ')}`;
  const { rows } = await query(
    `SELECT * FROM appointments ${where}
     ORDER BY date = CURRENT_DATE DESC, date ASC, time ASC`,
    params,
  );
  res.json(rows.map(mapAppointment));
}));

interface AppointmentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  patient_age: number;
  type: string;
  status: string;
  date: Date;
  time: string;
  motif: string;
  symptoms: string[];
  fee: number;
  establishment: string;
  paid: boolean;
  payment_id: string | null;
  notes: string | null;
}

async function loadAppointment(id: string): Promise<AppointmentRow> {
  const appt = await one<AppointmentRow>(`SELECT * FROM appointments WHERE id = $1`, [id]);
  if (!appt) throw new HttpError(404, 'Rendez-vous introuvable');
  return appt;
}

function assertAccess(user: { role: string; patientId: string | null; doctorId: string | null }, appt: { patient_id: string; doctor_id: string }) {
  const allowed = user.role === 'patient' ? appt.patient_id === user.patientId : appt.doctor_id === user.doctorId;
  if (!allowed) throw new HttpError(403, 'Ce rendez-vous ne vous concerne pas');
}

router.get('/:id', route(async (req, res) => {
  const appt = await loadAppointment(req.params.id);
  assertAccess(req.user!, appt);
  const doctor = await one(`SELECT * FROM doctors WHERE id = $1`, [appt.doctor_id]);
  res.json({ ...mapAppointment(appt), doctor: doctor ? { id: doctor.id, firstName: doctor.first_name, lastName: doctor.last_name, specialty: doctor.specialty } : null });
}));

/** POST /api/appointments/:id/cancel */
router.post('/:id/cancel', route(async (req, res) => {
  const appt = await loadAppointment(req.params.id);
  assertAccess(req.user!, appt);
  if (appt.status === 'cancelled') throw new HttpError(422, 'Ce rendez-vous est déjà annulé');
  if (appt.status === 'completed') throw new HttpError(422, 'Impossible d’annuler une consultation terminée');
  const updated = await one(`UPDATE appointments SET status = 'cancelled' WHERE id = $1 RETURNING *`, [appt.id]);
  if (req.user!.role === 'patient') {
    await notify({
      patientId: appt.patient_id,
      type: 'appointment',
      title: 'Rendez-vous annulé',
      body: `Votre rendez-vous du ${fullDateFR(toDateOnly(appt.date))} à ${appt.time} a été annulé.`,
      deepLink: `/appointment/${appt.id}`,
    });
  }
  res.json(mapAppointment(updated!));
}));

/** POST /api/appointments/:id/reschedule {date, time} */
router.post('/:id/reschedule', route(async (req, res) => {
  const appt = await loadAppointment(req.params.id);
  assertAccess(req.user!, appt);
  if (appt.status === 'cancelled' || appt.status === 'completed') throw new HttpError(422, 'Ce rendez-vous ne peut plus être modifié');
  const date = needDate(req.body as Record<string, unknown>, 'date')!;
  const time = needTime(req.body as Record<string, unknown>, 'time')!;
  const clash = await one(
    `SELECT id FROM appointments WHERE doctor_id = $1 AND date = $2 AND time = $3 AND status IN ('confirmed','pending','completed') AND id <> $4`,
    [appt.doctor_id, date, time, appt.id],
  );
  if (clash) throw new HttpError(409, 'Ce créneau est déjà réservé — choisissez-en un autre');
  const updated = await one(`UPDATE appointments SET date = $2, time = $3 WHERE id = $1 RETURNING *`, [appt.id, date, time]);
  await notify({
    patientId: appt.patient_id,
    type: 'appointment',
    title: 'Rendez-vous reporté',
    body: `Votre rendez-vous a été déplacé au ${fullDateFR(date)} à ${time}.`,
    deepLink: `/appointment/${appt.id}`,
  });
  res.json(mapAppointment(updated!));
}));

/**
 * POST /api/appointments/:id/complete {notes?} — clôture la consultation.
 * L'une ou l'autre partie peut clôturer (raccrocher l'appel vidéo, bouton du
 * médecin) : le rendez-vous passe à « terminé » et ne peut plus être annulé,
 * reprogrammé ni alimenté d'une préparation de symptômes.
 */
router.post('/:id/complete', requireAuth, route(async (req, res) => {
  const appt = await loadAppointment(req.params.id);
  assertAccess(req.user!, appt);
  if (appt.status === 'cancelled') throw new HttpError(422, 'Ce rendez-vous a été annulé');
  // Clôture idempotente : le second participant qui raccroche reçoit l'état
  // déjà clôturé sans redéclencher notification ni compte-rendu.
  if (appt.status === 'completed') {
    res.json(mapAppointment(appt));
    return;
  }
  const notes = needString(req.body as Record<string, unknown>, 'notes', { optional: true });
  const updated = await one(`UPDATE appointments SET status = 'completed', notes = COALESCE($2, notes) WHERE id = $1 RETURNING *`, [appt.id, notes ?? null]);
  await notify({
    patientId: appt.patient_id,
    type: 'summary',
    title: 'Compte-rendu disponible',
    body: `Le résumé de votre consultation du ${fullDateFR(toDateOnly(appt.date))} est disponible.`,
    deepLink: `/consultation/summary/${appt.id}`,
  });
  // La clôture génère le compte-rendu en arrière-plan (comme la fin d'un fil de
  // messagerie) : plus de génération manuelle à proposer côté client, la
  // poussée temps réel livre le résultat aux deux parties.
  void generateAndStoreSummary(appt.id).catch((err) =>
    console.warn('[summary] génération après clôture échouée :', err instanceof Error ? err.message : err),
  );
  res.json(mapAppointment(updated!));
}));

export default router;
