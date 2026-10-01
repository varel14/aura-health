import { Router } from 'express';
import { one, query, tx } from '../db.js';
import { HttpError, newId, needOneOf, needString, requireAuth, requireRole, route } from '../auth.js';
import { mapCartItem, mapOrder } from '../mappers.js';
import { notify } from '../services/notify.js';
import { fcfa } from '../services/format.js';
import { nowTime, todayISO } from '../services/time.js';
import { hashHandoverCode, newHandoverCode } from '../services/handover.js';
import { recordOrderEvent } from '../services/orderTimeline.js';
import { dispenseOrderItems } from '../services/stock.js';
import { config } from '../config.js';

const router = Router();

router.use(requireAuth, requireRole('patient'));

const patientId = (req: Express.Request) => req.user!.patientId!;

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

router.get('/cart', route(async (req, res) => {
  const { rows } = await query(`SELECT * FROM cart_items WHERE patient_id = $1 ORDER BY name`, [patientId(req)]);
  res.json(rows.map(mapCartItem));
}));

/** Adds a medication (or increments its quantity, capped at 10 like the app). */
router.post('/cart/items', route(async (req, res) => {
  const medicationId = needString(req.body as Record<string, unknown>, 'medicationId')!;
  const quantity = Math.min(10, Math.max(1, Number((req.body as Record<string, unknown>).quantity ?? 1)));
  const medication = await one<{ id: string; name: string; category: string; form: string; dosage: string; unit_price: number; requires_prescription: boolean }>(
    `SELECT * FROM medications WHERE id = $1`,
    [medicationId],
  );
  if (!medication) throw new HttpError(404, 'Médicament introuvable');
  await one(
    `INSERT INTO cart_items (patient_id, medication_id, name, category, form, dosage, unit_price, quantity, requires_prescription)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (patient_id, medication_id)
     DO UPDATE SET quantity = LEAST(10, cart_items.quantity + $8)`,
    [patientId(req), medication.id, medication.name, medication.category, medication.form, medication.dosage, medication.unit_price, quantity, medication.requires_prescription],
  );
  const { rows } = await query(`SELECT * FROM cart_items WHERE patient_id = $1 ORDER BY name`, [patientId(req)]);
  res.status(201).json(rows.map(mapCartItem));
}));

router.patch('/cart/items/:medicationId', route(async (req, res) => {
  const quantity = Number((req.body as Record<string, unknown>).quantity);
  if (!Number.isInteger(quantity)) throw new HttpError(400, 'quantity doit être un entier');
  if (quantity <= 0) {
    await one(`DELETE FROM cart_items WHERE patient_id = $1 AND medication_id = $2`, [patientId(req), req.params.medicationId]);
  } else {
    const updated = await one(
      `UPDATE cart_items SET quantity = LEAST(10, $3) WHERE patient_id = $1 AND medication_id = $2`,
      [patientId(req), req.params.medicationId, quantity],
    );
    if (!updated) throw new HttpError(404, 'Article absent du panier');
  }
  const { rows } = await query(`SELECT * FROM cart_items WHERE patient_id = $1 ORDER BY name`, [patientId(req)]);
  res.json(rows.map(mapCartItem));
}));

router.delete('/cart/items/:medicationId', route(async (req, res) => {
  await one(`DELETE FROM cart_items WHERE patient_id = $1 AND medication_id = $2`, [patientId(req), req.params.medicationId]);
  const { rows } = await query(`SELECT * FROM cart_items WHERE patient_id = $1 ORDER BY name`, [patientId(req)]);
  res.json(rows.map(mapCartItem));
}));

router.delete('/cart', route(async (req, res) => {
  await one(`DELETE FROM cart_items WHERE patient_id = $1`, [patientId(req)]);
  res.json([]);
}));

// ---------------------------------------------------------------------------
// Checkout & orders — mirrors the mobile flow:
// checkout creates an unpaid « en attente » order; the payment finalizes the
// charge and clears the cart. The order is then validated and prepared by the
// pharmacist (see pharmacist.routes.ts), delivered by a courier with the
// customer's handover code (see delivery.routes.ts).
// ---------------------------------------------------------------------------

router.get('/orders', route(async (req, res) => {
  const { rows } = await query(`SELECT * FROM orders WHERE patient_id = $1 ORDER BY created_at DESC`, [patientId(req)]);
  res.json(rows.map(mapOrder));
}));

router.get('/orders/:id', route(async (req, res) => {
  const order = await one(`SELECT * FROM orders WHERE id = $1 AND patient_id = $2`, [req.params.id, patientId(req)]);
  if (!order) throw new HttpError(404, 'Commande introuvable');
  res.json(mapOrder(order));
}));

/** POST /api/pharmacy/orders/:id/code — regenerate the handover code (customer only). */
router.post('/orders/:id/code', route(async (req, res) => {
  const order = await one<{ id: string; status: string }>(
    `SELECT id, status FROM orders WHERE id = $1 AND patient_id = $2`,
    [req.params.id, patientId(req)],
  );
  if (!order) throw new HttpError(404, 'Commande introuvable');
  if (['livrée', 'annulée'].includes(order.status)) throw new HttpError(409, 'Cette commande est déjà clôturée');
  const handoverCode = newHandoverCode();
  await one(`UPDATE orders SET handover_code_hash = $2 WHERE id = $1`, [order.id, hashHandoverCode(handoverCode)]);
  res.json({ handoverCode });
}));

router.post('/orders', route(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const pid = patientId(req);
  const pharmacyId = needString(body, 'pharmacyId')!;
  const mode = needOneOf(body, 'mode', ['delivery', 'pickup'] as const)!;
  const address = needString(body, 'address', { optional: true });
  const prescriptionId = needString(body, 'prescriptionId', { optional: true });

  const result = await tx(async (q) => {
    const cart = await q<Record<string, any>>(`SELECT * FROM cart_items WHERE patient_id = $1 ORDER BY name FOR UPDATE`, [pid]);
    if (cart.rows.length === 0) throw new HttpError(422, 'Votre panier est vide');

    const pharmacy = await q<Record<string, any>>(`SELECT * FROM pharmacies WHERE id = $1`, [pharmacyId]);
    if (pharmacy.rows.length === 0) throw new HttpError(404, 'Pharmacie introuvable');
    const ph = pharmacy.rows[0];

    // Prescription gate: any Rx item requires a valid (active, unexpired) prescription.
    const needsRx = cart.rows.some((c) => c.requires_prescription);
    let prescription = null;
    if (needsRx) {
      if (!prescriptionId) throw new HttpError(422, 'Une ordonnance valide est requise : ce panier contient des médicaments sur ordonnance');
      prescription = (await q<Record<string, any>>(`SELECT * FROM prescriptions WHERE id = $1 AND patient_id = $2`, [prescriptionId, pid])).rows[0];
      if (!prescription) throw new HttpError(404, 'Ordonnance introuvable');
      if (prescription.status !== 'active' || prescription.expiry_date < todayISO()) {
        throw new HttpError(422, 'Cette ordonnance a expiré — choisissez une ordonnance valide');
      }
    }

    if (mode === 'delivery' && !ph.delivery_available) throw new HttpError(422, `${ph.name} ne propose pas la livraison`);
    if (mode === 'pickup' && !ph.pickup_available) throw new HttpError(422, `${ph.name} ne propose pas le retrait sur place`);

    const items = cart.rows.map((c) => ({
      medicationId: c.medication_id,
      name: `${c.name} ${c.dosage}`,
      dosage: c.dosage,
      quantity: c.quantity,
      unitPrice: c.unit_price,
    }));
    const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const total = subtotal + (mode === 'delivery' ? config.deliveryFee : 0);
    const id = newId('ord');
    // The handover code is the customer's secret proof at delivery/pickup time.
    // It is returned ONCE here in plaintext and stored hashed.
    const handoverCode = newHandoverCode();

    const inserted = await q<Record<string, any>>(
      `INSERT INTO orders (id, patient_id, pharmacy_id, pharmacy_name, items, mode, address, total, status, prescription_id, handover_code_hash, date, time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'en attente',$9,$10,$11,$12) RETURNING *`,
      [id, pid, ph.id, ph.name, JSON.stringify(items), mode, mode === 'delivery' ? (address ?? null) : ph.address, total, prescriptionId ?? null, hashHandoverCode(handoverCode), todayISO(), nowTime()],
    );

    // First entry of the order's progression timeline.
    await recordOrderEvent(q, id, 'en attente', 'Commande créée', 'patient');

    await notify({
      patientId: pid,
      type: 'order',
      title: 'Commande reçue',
      body: `Votre commande chez ${ph.name} (${fcfa(total)}) a été transmise. Finalisez le paiement pour qu’elle soit préparée.`,
      deepLink: '/orders',
    });

    return { order: inserted.rows[0], handoverCode };
  });

  res.status(201).json({ order: mapOrder(result.order), handoverCode: result.handoverCode });
}));

const LIFECYCLE: Record<string, string[]> = {
  'en attente': ['confirmée', 'annulée'],
  'confirmée': ['prête', 'annulée'],
  'prête': ['en livraison', 'livrée', 'annulée'],
  'en livraison': ['livrée'],
  'livrée': [],
  'annulée': [],
};

/** POST /api/orders/:id/advance {status?} — moves the order along its lifecycle. */
router.post('/orders/:id/advance', route(async (req, res) => {
  const pid = patientId(req);
  const requested = needOneOf(req.body as Record<string, unknown>, 'status', ['confirmée', 'prête', 'en livraison', 'livrée', 'annulée'] as const, { optional: true });
  const order = await one<{ id: string; status: string; mode: 'delivery' | 'pickup'; payment_id: string | null; pharmacy_name: string; pharmacy_id: string; items: { medicationId: string; quantity: number }[] }>(
    `SELECT * FROM orders WHERE id = $1 AND patient_id = $2`,
    [req.params.id, pid],
  );
  if (!order) throw new HttpError(404, 'Commande introuvable');
  const next = requested ?? LIFECYCLE[order.status as string]?.[0];
  if (!next || !LIFECYCLE[order.status as string]?.includes(next)) {
    throw new HttpError(422, `Transition impossible : « ${order.status} » → « ${next ?? '??'} »`);
  }
  const updated = await one(`UPDATE orders SET status = $2 WHERE id = $1 RETURNING *`, [order.id, next]);
  if (next === 'annulée' && order.payment_id) {
    await one(`UPDATE payments SET status = 'refunded' WHERE id = $1`, [order.payment_id]);
  }
  const eventLabels: Record<string, string> = {
    'confirmée': 'Commande confirmée',
    'prête': 'Commande prête',
    'en livraison': 'Commande en livraison',
    'livrée': order.mode === 'pickup' ? 'Commande remise au client' : 'Commande livrée',
    'annulée': 'Commande annulée',
  };
  await recordOrderEvent(query, order.id, next, eventLabels[next] ?? 'Commande mise à jour', 'patient');
  if (next === 'livrée') await dispenseOrderItems(query, order);
  await notify({
    patientId: pid,
    type: 'order',
    title: ORDER_STATUS_TITLES[next] ?? 'Commande mise à jour',
    body: `Votre commande chez ${order.pharmacy_name} est maintenant « ${next} ».`,
    deepLink: '/orders',
  });
  res.json(mapOrder(updated!));
}));

const ORDER_STATUS_TITLES: Record<string, string> = {
  'confirmée': 'Commande confirmée par la pharmacie',
  'prête': 'Commande prête',
  'en livraison': 'Commande en cours de livraison',
  'livrée': 'Commande livrée',
  'annulée': 'Commande annulée',
};

export default router;
