/**
 * Admin workspace: doctor profile activation + read access to the
 * establishments (hospitals, pharmacies) and their join applications.
 *
 * Doctor lifecycle owned here:
 *   register (public)  → pending
 *   pending            → activate → active   (visible in catalog, bookable)
 *   pending|active     → reject   → rejected (+ sessions revoked)
 */
import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, needString, requireAuth, requireRole, route } from '../auth.js';
import { mapHospital, mapPharmacy } from '../mappers.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

type Row = Record<string, any>;

const DOCTOR_ADMIN_SQL = `
  SELECT d.*, h.name AS hospital_name,
         u.phone AS account_phone, u.email AS account_email, u.created_at AS account_created_at
  FROM doctors d
  LEFT JOIN hospitals h ON h.id = d.hospital_id
  LEFT JOIN users u ON u.doctor_id = d.id`;

function mapAdminDoctor(r: Row) {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    specialty: r.specialty,
    hospitalId: r.hospital_id,
    hospitalName: r.hospital_name ?? null,
    experienceYears: r.experience_years,
    fee: r.fee,
    bio: r.bio,
    rating: Number(r.rating),
    reviewsCount: r.reviews_count,
    activationStatus: r.activation_status,
    activatedAt: r.activated_at ?? null,
    rejectionReason: r.rejection_reason ?? null,
    account: {
      phone: r.account_phone ?? null,
      email: r.account_email ?? null,
      createdAt: r.account_created_at ?? null,
    },
  };
}

async function loadAdminDoctor(id: string) {
  const row = await one(`${DOCTOR_ADMIN_SQL} WHERE d.id = $1`, [id]);
  if (!row) throw new HttpError(404, 'Médecin introuvable');
  return row;
}

/** GET /api/admin/overview — headline counts for the admin dashboard. */
router.get(
  '/overview',
  route(async (_req, res) => {
    const r = await one<Record<string, string>>(
      `SELECT
         (SELECT count(*) FROM doctors WHERE activation_status = 'pending')  AS pending_doctors,
         (SELECT count(*) FROM doctors WHERE activation_status = 'active')   AS active_doctors,
         (SELECT count(*) FROM doctors WHERE activation_status = 'rejected') AS rejected_doctors,
         (SELECT count(*) FROM hospitals) AS hospitals,
         (SELECT count(*) FROM pharmacies) AS pharmacies,
         (SELECT count(*) FROM professional_applications WHERE status = 'pending') AS pending_applications`,
    );
    res.json({
      doctors: {
        pending: Number(r!.pending_doctors),
        active: Number(r!.active_doctors),
        rejected: Number(r!.rejected_doctors),
      },
      hospitals: Number(r!.hospitals),
      pharmacies: Number(r!.pharmacies),
      pendingApplications: Number(r!.pending_applications),
    });
  }),
);

/** GET /api/admin/doctors?status=pending|active|rejected — the validation queue. */
router.get(
  '/doctors',
  route(async (req, res) => {
    const status = (req.query as Record<string, string | undefined>).status;
    if (status && !['pending', 'active', 'rejected'].includes(status)) {
      throw new HttpError(400, 'status doit valoir « pending », « active » ou « rejected »');
    }
    const { rows } = status
      ? await query(`${DOCTOR_ADMIN_SQL} WHERE d.activation_status = $1 ORDER BY u.created_at ASC`, [status])
      : await query(`${DOCTOR_ADMIN_SQL} ORDER BY (d.activation_status = 'pending') DESC, u.created_at ASC`);
    res.json(rows.map(mapAdminDoctor));
  }),
);

/** GET /api/admin/doctors/:id — full admin view of one doctor profile. */
router.get(
  '/doctors/:id',
  route(async (req, res) => {
    res.json(mapAdminDoctor(await loadAdminDoctor(req.params.id)));
  }),
);

/** POST /api/admin/doctors/:id/activate — pending|rejected → active. */
router.post(
  '/doctors/:id/activate',
  route(async (req, res) => {
    const doctor = await loadAdminDoctor(req.params.id);
    if (doctor.activation_status === 'active') throw new HttpError(409, 'Ce médecin est déjà actif');
    await one(
      `UPDATE doctors SET activation_status = 'active', activated_at = now(), rejection_reason = NULL WHERE id = $1`,
      [doctor.id],
    );
    res.json(mapAdminDoctor(await loadAdminDoctor(doctor.id)));
  }),
);

/** POST /api/admin/doctors/:id/reject {reason} — pending|active → rejected. */
router.post(
  '/doctors/:id/reject',
  route(async (req, res) => {
    const doctor = await loadAdminDoctor(req.params.id);
    if (doctor.activation_status === 'rejected') throw new HttpError(409, 'Ce médecin est déjà rejeté');
    const reason = needString(req.body as Record<string, unknown>, 'reason', { min: 3 })!;

    await one(
      `UPDATE doctors SET activation_status = 'rejected', rejection_reason = $2 WHERE id = $1`,
      [doctor.id, reason],
    );
    // A rejected doctor loses access to their account immediately.
    await one(`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE doctor_id = $1)`, [doctor.id]);
    res.json(mapAdminDoctor(await loadAdminDoctor(doctor.id)));
  }),
);

// -- Establishments: read-only basic info ------------------------------------

/** GET /api/admin/hospitals — basic info + active doctor count. */
router.get(
  '/hospitals',
  route(async (_req, res) => {
    const { rows } = await query<Row>(
      `SELECT h.*, (SELECT count(*) FROM doctors d WHERE d.hospital_id = h.id AND d.activation_status = 'active') AS doctor_count
       FROM hospitals h ORDER BY h.name`,
    );
    res.json(rows.map((r) => ({ ...mapHospital(r), doctorCount: Number(r.doctor_count) })));
  }),
);

/** GET /api/admin/pharmacies — basic info + catalog size + open order count. */
router.get(
  '/pharmacies',
  route(async (_req, res) => {
    const { rows } = await query<Row>(
      `SELECT p.*,
              jsonb_array_length(p.medication_ids) AS medication_count,
              (SELECT count(*) FROM orders o WHERE o.pharmacy_id = p.id
                AND o.status IN ('en attente', 'confirmée', 'prête', 'en livraison')) AS open_orders
       FROM pharmacies p ORDER BY p.name`,
    );
    res.json(rows.map((r) => ({ ...mapPharmacy(r), medicationCount: Number(r.medication_count), openOrders: Number(r.open_orders) })));
  }),
);

/** GET /api/admin/applications?status= — hospital/pharmacy join requests. */
router.get(
  '/applications',
  route(async (req, res) => {
    const status = (req.query as Record<string, string | undefined>).status;
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      throw new HttpError(400, 'status doit valoir « pending », « approved » ou « rejected »');
    }
    const { rows } = status
      ? await query(`SELECT * FROM professional_applications WHERE status = $1 ORDER BY created_at DESC`, [status])
      : await query(`SELECT * FROM professional_applications ORDER BY (status = 'pending') DESC, created_at DESC`);
    res.json(
      rows.map((r: Row) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        phone: r.phone,
        email: r.email,
        city: r.city,
        address: r.address,
        manager: r.manager,
        documents: r.documents,
        status: r.status,
        createdAt: r.created_at,
      })),
    );
  }),
);

export default router;
