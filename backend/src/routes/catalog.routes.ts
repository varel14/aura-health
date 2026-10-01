import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, route } from '../auth.js';
import { mapDoctor, mapHospital, mapMedication, mapPharmacy, mapSpecialty } from '../mappers.js';

const router = Router();

// ---------------------------------------------------------------------------
// Public catalog — specialties, doctors, hospitals, pharmacies, medications
// ---------------------------------------------------------------------------

router.get('/specialties', route(async (_req, res) => {
  const { rows } = await query(`SELECT * FROM specialties ORDER BY id`);
  res.json(rows.map(mapSpecialty));
}));

// -- Doctors ----------------------------------------------------------------

router.get('/doctors', route(async (req, res) => {
  const { query: q, specialty, availableToday, videoOnly, hospitalId } = req.query as Record<string, string | undefined>;
  // Only admin-activated doctors are listed publicly.
  const clauses: string[] = [`activation_status = 'active'`];
  const params: unknown[] = [];
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    clauses.push(`(lower(first_name || ' ' || last_name || ' ' || specialty) LIKE $${params.length})`);
  }
  if (specialty) { params.push(specialty); clauses.push(`specialty = $${params.length}`); }
  if (availableToday === 'true') { params.push('disponible'); clauses.push(`status = $${params.length}`); }
  if (videoOnly === 'true') clauses.push(`video_available = true`);
  if (hospitalId) { params.push(hospitalId); clauses.push(`hospital_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM doctors ${where} ORDER BY rating DESC`, params);
  res.json(rows.map(mapDoctor));
}));

router.get('/doctors/:id', route(async (req, res) => {
  const doctor = await one(`SELECT * FROM doctors WHERE id = $1 AND activation_status = 'active'`, [req.params.id]);
  if (!doctor) throw new HttpError(404, 'Médecin introuvable');
  const hospital = doctor.hospital_id ? await one(`SELECT * FROM hospitals WHERE id = $1`, [doctor.hospital_id]) : null;
  res.json({ ...mapDoctor(doctor), hospital: hospital ? mapHospital(hospital) : null });
}));

/**
 * GET /api/doctors/:id/slots?date=yyyy-mm-dd
 * Availability = doctor's template slots for that weekday, minus booked slots.
 */
router.get('/doctors/:id/slots', route(async (req, res) => {
  const date = String(req.query.date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'Paramètre date requis (yyyy-mm-dd)');
  const doctor = await one<{ slot_times: string[]; working_days: number[]; status: string }>(
    `SELECT slot_times, working_days, status FROM doctors WHERE id = $1 AND activation_status = 'active'`,
    [req.params.id],
  );
  if (!doctor) throw new HttpError(404, 'Médecin introuvable');
  const day = new Date(`${date}T00:00:00`).getDay();
  const works = (doctor.working_days ?? []).includes(day);
  const booked = await query<{ time: string }>(
    `SELECT time FROM appointments WHERE doctor_id = $1 AND date = $2 AND status IN ('confirmed', 'pending', 'completed')`,
    [req.params.id, date],
  );
  const bookedTimes = new Set(booked.rows.map((r) => r.time));
  res.json(
    (doctor.slot_times ?? []).map((time) => ({
      time,
      available: works && doctor.status !== 'indisponible' && !bookedTimes.has(time),
    })),
  );
}));

// -- Hospitals ----------------------------------------------------------------

router.get('/hospitals', route(async (req, res) => {
  const { query: q, city, specialty } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    clauses.push(`(lower(name || ' ' || city || ' ' || district || ' ' || specialties::text) LIKE $${params.length})`);
  }
  if (city) { params.push(city); clauses.push(`city = $${params.length}`); }
  if (specialty) { params.push(`%"${specialty}"%`); clauses.push(`specialties::text LIKE $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM hospitals ${where} ORDER BY rating DESC`, params);
  res.json(rows.map(mapHospital));
}));

router.get('/hospitals/:id', route(async (req, res) => {
  const hospital = await one(`SELECT * FROM hospitals WHERE id = $1`, [req.params.id]);
  if (!hospital) throw new HttpError(404, 'Établissement introuvable');
  const { rows } = await query(
    `SELECT * FROM doctors WHERE hospital_id = $1 AND activation_status = 'active' ORDER BY rating DESC`,
    [req.params.id],
  );
  res.json({ ...mapHospital(hospital), doctors: rows.map(mapDoctor) });
}));

// -- Pharmacies ----------------------------------------------------------------

router.get('/pharmacies', route(async (req, res) => {
  const { query: q, city, onDutyOnly, deliveryOnly, medicationId } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    clauses.push(`(lower(name || ' ' || city || ' ' || district) LIKE $${params.length})`);
  }
  if (city) { params.push(city); clauses.push(`city = $${params.length}`); }
  if (onDutyOnly === 'true') clauses.push(`on_duty = true`);
  if (deliveryOnly === 'true') clauses.push(`delivery_available = true`);
  if (medicationId) { params.push(`%"${medicationId}"%`); clauses.push(`medication_ids::text LIKE $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM pharmacies ${where} ORDER BY on_duty DESC, rating DESC`, params);
  res.json(rows.map(mapPharmacy));
}));

router.get('/pharmacies/:id', route(async (req, res) => {
  const pharmacy = await one(`SELECT * FROM pharmacies WHERE id = $1`, [req.params.id]);
  if (!pharmacy) throw new HttpError(404, 'Pharmacie introuvable');
  const ids = (pharmacy.medication_ids as string[]) ?? [];
  const { rows } = ids.length
    ? await query(`SELECT * FROM medications WHERE id = ANY($1::text[]) ORDER BY name`, [ids])
    : { rows: [] };
  res.json({ ...mapPharmacy(pharmacy), medications: rows.map(mapMedication) });
}));

// -- Medications ----------------------------------------------------------------

router.get('/medications', route(async (req, res) => {
  const { query: q, pharmacyId, otcOnly, category } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    clauses.push(`(lower(name || ' ' || category || ' ' || dosage || ' ' || lab) LIKE $${params.length})`);
  }
  if (pharmacyId) { params.push(`%"${pharmacyId}"%`); clauses.push(`pharmacy_ids::text LIKE $${params.length}`); }
  if (otcOnly === 'true') clauses.push(`requires_prescription = false`);
  if (category) { params.push(category); clauses.push(`category = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM medications ${where} ORDER BY name`, params);
  res.json(rows.map(mapMedication));
}));

router.get('/medications/:id', route(async (req, res) => {
  const medication = await one(`SELECT * FROM medications WHERE id = $1`, [req.params.id]);
  if (!medication) throw new HttpError(404, 'Médicament introuvable');
  const ids = (medication.pharmacy_ids as string[]) ?? [];
  const { rows } = ids.length
    ? await query(`SELECT * FROM pharmacies WHERE id = ANY($1::text[]) ORDER BY name`, [ids])
    : { rows: [] };
  res.json({ ...mapMedication(medication), pharmacies: rows.map(mapPharmacy) });
}));

export default router;
