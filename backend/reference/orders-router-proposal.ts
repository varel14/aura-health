/**
 * Order workflow: patient ordering, pharmacy management (validate / prepare /
 * handover) and delivery (assignment, pickup, code-confirmed delivery).
 *
 * Handover codes are 6-digit secrets generated at order creation, shown once
 * to the customer and stored hashed (scrypt). Couriers and pharmacists can
 * only verify them — never read them.
 */
import { randomInt } from 'crypto';
import { Router } from 'express';
import { one, query, rowsOf, tx } from '../db.js';
import { HttpError, hashPin, needOneOf, needString, newId, requireAuth, requireRole, route, verifyPin } from '../auth.js';
import { config } from '../config.js';
import { mapOrder } from '../mappers.js';

export const ordersRouter = Router();

type OrderRow = {
  id: string;
  patient_id: string;
  pharmacy_id: string;
  pharmacy_name: string;
  items: { medicationId: string; name: string; dosage: string; quantity: number; unitPrice: number }[];
  mode: 'delivery' | 'pickup';
  address: string | null;
  total: number;
  status: string;
  prescription_id: string | null;
  payment_id: string | null;
  courier_id: string | null;
  cancel_reason: string | null;
  handover_code_hash: string | null;
  date: string;
  time: string;
} & Record<string, unknown>;

const toDateOnly = (value: unknown): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

const SELECT_ORDER = `
  SELECT o.*, c.first_name AS courier_first_name, c.last_name AS courier_last_name,
         p.first_name AS patient_first_name, p.last_name AS patient_last_name, p.phone AS patient_phone,
         rx.code AS prescription_code, rx.doctor_name AS prescription_doctor, rx.expiry_date AS prescription_expiry
  FROM orders o
  LEFT JOIN couriers c ON c.id = o.courier_id
  LEFT JOIN patients p ON p.id = o.patient_id
  LEFT JOIN prescriptions rx ON rx.id = o.prescription_id
`;

/** Maps a joined order row to the API shape (camelCase + courier/patient/rx extras). */
function mapOrderFull(r: OrderRow) {
  return {
    ...mapOrder(r),
    courierId: r.courier_id ?? undefined,
    courierName: r.courier_first_name ? `${r.courier_first_name} ${r.courier_last_name}` : undefined,
    patientName: r.patient_first_name ? `${r.patient_first_name} ${r.patient_last_name}` : undefined,
    patientPhone: r.patient_phone ?? undefined,
    cancelReason: r.cancel_reason ?? undefined,
    prescription: r.prescription_code
      ? {
          code: r.prescription_code,
          doctorName: r.prescription_doctor,
          expiryDate: toDateOnly(r.prescription_expiry),
        }
      : undefined,
  };
}

async function loadOrder(id: string): Promise<OrderRow | null> {
  const res = await query<OrderRow>(`${SELECT_ORDER} WHERE o.id = $1`, [id]);
  return res.rows[0] ?? null;
}

function newHandoverCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

async function notifyPatient(patientId: string, title: string, body: string) {
  const now = new Date();
  await query(
    `INSERT INTO notifications (id, patient_id, type, title, body, date, time, deep_link)
     VALUES ($1, $2, 'order', $3, $4, $5, $6, '/orders')`,
    [
      newId('nt'), patientId, title, body,
      now.toISOString().slice(0, 10),
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    ],
  );
}

/** Verifies the customer's handover code against the stored scrypt hash. */
function assertHandoverCode(order: OrderRow, code: unknown) {
  const candidate = String(code ?? '').trim();
  if (!/^\d{6}$/.test(candidate)) throw new HttpError(400, 'Le code de remise doit contenir 6 chiffres');
  if (!order.handover_code_hash || !verifyPin(candidate, order.handover_code_hash)) {
    throw new HttpError(400, 'Code de remise incorrect. Demandez-le au client.');
  }
}

// ---------------------------------------------------------------------------
// Patient endpoints
// ---------------------------------------------------------------------------

/** POST /api/orders — place an order; returns the order + its handover code. */
ordersRouter.post(
  '/',
  requireAuth,
  requireRole('patient'),
  route(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const pharmacy = await one<{ id: string; name: string; address: string }>(
      `SELECT id, name, address FROM pharmacies WHERE id = $1`,
      [needString(body, 'pharmacyId')],
    );
    if (!pharmacy) throw new HttpError(404, 'Pharmacie introuvable');

    const mode = needOneOf(body, 'mode', ['delivery', 'pickup'] as const);
    const address = needString(body, 'address', { optional: true });
    if (mode === 'delivery' && !address) throw new HttpError(400, 'Une adresse de livraison est requise');

    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) throw new HttpError(400, 'La commande doit contenir au moins un article');

    const items = [];
    for (const raw of rawItems) {
      const it = raw as Record<string, unknown>;
      const medicationId = String(it.medicationId ?? '');
      const quantity = Number(it.quantity ?? 1);
      const med = await one<{ id: string; name: string; dosage: string; unit_price: number }>(
        `SELECT id, name, dosage, unit_price FROM medications WHERE id = $1`,
        [medicationId],
      );
      if (!med) throw new HttpError(400, `Médicament inconnu : ${medicationId}`);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new HttpError(400, `Quantité invalide pour ${med.name} (1 à 10)`);
      }
      // Price always comes from the catalog, never from the client payload.
      items.push({ medicationId: med.id, name: `${med.name} ${med.dosage}`.trim(), dosage: med.dosage, quantity, unitPrice: med.unit_price });
    }

    const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const total = mode === 'delivery' ? subtotal + config.deliveryFee : subtotal;
    const handoverCode = newHandoverCode();
    const id = newId('ord');

    await tx(async (q) => {
      await q(
        `INSERT INTO orders (id, patient_id, pharmacy_id, pharmacy_name, items, mode, address, total, status,
                             prescription_id, payment_id, handover_code_hash, date, time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'en attente', $9, $10, $11, CURRENT_DATE, to_char(now(), 'HH24:MI'))`,
        [
          id, req.user!.patientId, pharmacy.id, pharmacy.name, JSON.stringify(items), mode,
          mode === 'delivery' ? address : pharmacy.address,
          total,
          needString(body, 'prescriptionId', { optional: true }) ?? null,
          needString(body, 'paymentId', { optional: true }) ?? null,
          hashPin(handoverCode),
        ],
      );
    });

    res.status(201).json({ order: mapOrderFull((await loadOrder(id))!), handoverCode });
  }),
);

/** GET /api/orders/mine — the customer's orders, newest first. */
ordersRouter.get(
  '/mine',
  requireAuth,
  requireRole('patient'),
  route(async (req, res) => {
    const result = await query<OrderRow>(`${SELECT_ORDER} WHERE o.patient_id = $1 ORDER BY o.created_at DESC`, [
      req.user!.patientId,
    ]);
    res.json(rowsOf(result).map(mapOrderFull));
  }),
);

/** POST /api/orders/:id/code — (re)generate the handover code; returns the new one. */
ordersRouter.post(
  '/:id/code',
  requireAuth,
  requireRole('patient'),
  route(async (req, res) => {
    const order = await loadOrder(req.params.id);
    if (!order || order.patient_id !== req.user!.patientId) throw new HttpError(404, 'Commande introuvable');
    if (['livrée', 'annulée'].includes(order.status)) throw new HttpError(409, 'Cette commande est déjà clôturée');
    const code = newHandoverCode();
    await one(`UPDATE orders SET handover_code_hash = $1 WHERE id = $2`, [hashPin(code), order.id]);
    res.json({ handoverCode: code });
  }),
);

// ---------------------------------------------------------------------------
// Pharmacy (pharmacist) endpoints
// ---------------------------------------------------------------------------

/** GET /api/pharmacy/orders — the pharmacist's queue, enriched for validation. */
ordersRouter.get(
  '/pharmacy/orders',
  requireAuth,
  requireRole('pharmacist'),
  route(async (req, res) => {
    if (!req.user!.pharmacyId) throw new HttpError(403, 'Aucune pharmacie rattachée à ce compte');
    const result = await query<OrderRow>(
      `${SELECT_ORDER} WHERE o.pharmacy_id = $1
       ORDER BY (o.status = 'en attente') DESC, (o.status = 'confirmée') DESC, o.created_at ASC`,
      [req.user!.pharmacyId],
    );
    res.json(rowsOf(result).map(mapOrderFull));
  }),
);

/** POST /api/pharmacy/orders/:id/validate — accept the order (en attente → confirmée). */
ordersRouter.post(
  '/pharmacy/orders/:id/validate',
  requireAuth,
  requireRole('pharmacist'),
  route(async (req, res) => {
    const order = await mustOwnPharmacyOrder(req.params.id, req.user!.pharmacyId);
    if (order.status !== 'en attente') throw new HttpError(409, `Impossible de valider : commande « ${order.status} »`);
    await one(`UPDATE orders SET status = 'confirmée', validated_at = now() WHERE id = $1`, [order.id]);
    await notifyPatient(order.patient_id, 'Commande confirmée', `${order.pharmacy_name} a confirmé votre commande — préparation en cours.`);
    res.json(mapOrderFull((await loadOrder(order.id))!));
  }),
);

/** POST /api/pharmacy/orders/:id/reject — cancel with a reason (en attente → annulée). */
ordersRouter.post(
  '/pharmacy/orders/:id/reject',
  requireAuth,
  requireRole('pharmacist'),
  route(async (req, res) => {
    const order = await mustOwnPharmacyOrder(req.params.id, req.user!.pharmacyId);
    if (order.status !== 'en attente') throw new HttpError(409, `Impossible d'annuler : commande « ${order.status} »`);
    const reason = needString((req.body ?? {}) as Record<string, unknown>, 'reason', { min: 3 });
    await one(`UPDATE orders SET status = 'annulée', cancel_reason = $1 WHERE id = $2`, [reason, order.id]);
    await notifyPatient(order.patient_id, 'Commande annulée', `${order.pharmacy_name} a annulé votre commande : ${reason}`);
    res.json(mapOrderFull((await loadOrder(order.id))!));
  }),
);

/** POST /api/pharmacy/orders/:id/ready — prepared (confirmée → prête); assigns a courier for deliveries. */
ordersRouter.post(
  '/pharmacy/orders/:id/ready',
  requireAuth,
  requireRole('pharmacist'),
  route(async (req, res) => {
    const order = await mustOwnPharmacyOrder(req.params.id, req.user!.pharmacyId);
    if (order.status !== 'confirmée') throw new HttpError(409, `Impossible de préparer : commande « ${order.status} »`);

    if (order.mode === 'delivery' && !order.courier_id) {
      const courier = await one<{ id: string; first_name: string; last_name: string }>(
        `SELECT c.id, c.first_name, c.last_name
         FROM couriers c
         WHERE c.active
         ORDER BY (c.pharmacy_id = $1) DESC,
                  (SELECT count(*) FROM orders o2 WHERE o2.courier_id = c.id AND o2.status = 'en livraison') ASC,
                  c.id ASC
         LIMIT 1`,
        [order.pharmacy_id],
      );
      if (!courier) throw new HttpError(409, 'Aucun livreur disponible pour cette commande');
      await one(
        `UPDATE orders SET status = 'prête', prepared_at = now(), courier_id = $1, assigned_at = now() WHERE id = $2`,
        [courier.id, order.id],
      );
      await notifyPatient(
        order.patient_id,
        'Commande prête',
        `Votre commande est prête. ${courier.first_name} ${courier.last_name} se charge de la livraison.`,
      );
    } else {
      await one(`UPDATE orders SET status = 'prête', prepared_at = now() WHERE id = $1`, [order.id]);
      await notifyPatient(
        order.patient_id,
        order.mode === 'pickup' ? 'Commande prête au retrait' : 'Commande prête',
        order.mode === 'pickup'
          ? `Votre commande est prête chez ${order.pharmacy_name}. Munissez-vous de votre code de remise.`
          : 'Votre commande est prête.',
      );
    }
    res.json(mapOrderFull((await loadOrder(order.id))!));
  }),
);

/** POST /api/pharmacy/orders/:id/handover — pickup handover, verified by the customer's code (prête → livrée). */
ordersRouter.post(
  '/pharmacy/orders/:id/handover',
  requireAuth,
  requireRole('pharmacist'),
  route(async (req, res) => {
    const order = await mustOwnPharmacyOrder(req.params.id, req.user!.pharmacyId);
    if (order.mode !== 'pickup') throw new HttpError(409, 'Remise réservée aux commandes en retrait — le livreur confirme la sienne');
    if (order.status !== 'prête') throw new HttpError(409, `Impossible de remettre : commande « ${order.status} »`);
    assertHandoverCode(order, (req.body ?? {})['code']);
    await one(`UPDATE orders SET status = 'livrée', delivered_at = now() WHERE id = $1`, [order.id]);
    await notifyPatient(order.patient_id, 'Commande retirée', `Votre commande chez ${order.pharmacy_name} a été remise. Merci !`);
    res.json(mapOrderFull((await loadOrder(order.id))!));
  }),
);

// ---------------------------------------------------------------------------
// Delivery (courier) endpoints
// ---------------------------------------------------------------------------

/** GET /api/delivery/orders — orders assigned to the authenticated courier. */
ordersRouter.get(
  '/delivery/orders',
  requireAuth,
  requireRole('delivery'),
  route(async (req, res) => {
    if (!req.user!.courierId) throw new HttpError(403, 'Aucun profil livreur rattaché à ce compte');
    const result = await query<OrderRow>(
      `${SELECT_ORDER} WHERE o.courier_id = $1
       ORDER BY (o.status = 'prête') DESC, (o.status = 'en livraison') DESC, o.created_at DESC`,
      [req.user!.courierId],
    );
    res.json(rowsOf(result).map(mapOrderFull));
  }),
);

/** POST /api/delivery/orders/:id/pickup — collect the parcel (prête → en livraison). */
ordersRouter.post(
  '/delivery/orders/:id/pickup',
  requireAuth,
  requireRole('delivery'),
  route(async (req, res) => {
    const order = await mustOwnCourierOrder(req.params.id, req.user!.courierId);
    if (order.status !== 'prête') throw new HttpError(409, `Impossible de récupérer : commande « ${order.status} »`);
    await one(`UPDATE orders SET status = 'en livraison' WHERE id = $1`, [order.id]);
    await notifyPatient(
      order.patient_id,
      'Commande en route',
      `Votre commande quitte ${order.pharmacy_name}. Préparez votre code de remise pour la réception.`,
    );
    res.json(mapOrderFull((await loadOrder(order.id))!));
  }),
);

/** POST /api/delivery/orders/:id/deliver — handover verified by the customer's secret code (en livraison → livrée). */
ordersRouter.post(
  '/delivery/orders/:id/deliver',
  requireAuth,
  requireRole('delivery'),
  route(async (req, res) => {
    const order = await mustOwnCourierOrder(req.params.id, req.user!.courierId);
    if (order.status !== 'en livraison') throw new HttpError(409, `Impossible de livrer : commande « ${order.status} »`);
    assertHandoverCode(order, (req.body ?? {})['code']);
    await one(`UPDATE orders SET status = 'livrée', delivered_at = now() WHERE id = $1`, [order.id]);
    await notifyPatient(order.patient_id, 'Commande livrée', `Votre commande a été livrée. Merci d'avoir utilisé AuraHealth !`);
    res.json(mapOrderFull((await loadOrder(order.id))!));
  }),
);

// ---------------------------------------------------------------------------

async function mustOwnPharmacyOrder(id: string, pharmacyId: string | null): Promise<OrderRow> {
  const order = await loadOrder(id);
  if (!order || order.pharmacy_id !== pharmacyId) throw new HttpError(404, 'Commande introuvable');
  return order;
}

async function mustOwnCourierOrder(id: string, courierId: string | null): Promise<OrderRow> {
  const order = await loadOrder(id);
  if (!order || order.courier_id !== courierId) throw new HttpError(404, 'Commande introuvable');
  return order;
}
