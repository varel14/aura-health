/**
 * Pharmacist workspace: end-to-end medication management and order handling.
 *
 * Catalog (pharmacy-scoped stock over the shared medication catalog):
 *   GET    /medications            — the pharmacy's stocked medications
 *   POST   /medications            — add a reference (creates it in the catalog)
 *   PATCH  /medications/:id        — edit details and/or stock
 *   DELETE /medications/:id        — remove the reference from the pharmacy
 *
 * Order lifecycle (delivery orders continue in delivery.routes.ts):
 *   en attente (paid)  → validate  → confirmée
 *   en attente         → reject    → annulée (+ refund if paid)
 *   confirmée/prête    → assign    → livreur explicitly chosen by the pharmacy
 *   confirmée          → ready     → prête (keeps a pre-assigned courier, else auto-assigns)
 *   prête (pickup)     → handover  → livrée   (customer's secret code required)
 *
 * GET /orders/:id returns the order plus its progression timeline; every
 * transition appends an order_events row (see services/orderTimeline.ts).
 */
import { Router } from 'express';
import { one, query, tx } from '../db.js';
import { HttpError, newId, needInt, needString, requireAuth, requireRole, route } from '../auth.js';
import { mapCourier, mapPharmacyMedication } from '../mappers.js';
import { notify } from '../services/notify.js';
import { fcfa } from '../services/format.js';
import { SELECT_FULL_ORDER, FullOrderRow, loadFullOrder, mapFullOrder } from '../services/orderView.js';
import { handoverCodeMatches } from '../services/handover.js';
import { recordOrderEvent, listOrderEvents } from '../services/orderTimeline.js';
import { dispenseOrderItems } from '../services/stock.js';

const router = Router();

router.use(requireAuth, requireRole('pharmacist'));

const pharmacyId = (req: Express.Request) => {
  if (!req.user!.pharmacyId) throw new HttpError(403, 'Aucune pharmacie rattachée à ce compte');
  return req.user!.pharmacyId;
};

async function loadOwnedOrder(req: Express.Request, id: string): Promise<FullOrderRow> {
  const order = await loadFullOrder(id);
  if (!order || order.pharmacy_id !== pharmacyId(req)) throw new HttpError(404, 'Commande introuvable');
  return order;
}

const PHARMACY_MED_SELECT = `
  SELECT m.*, pm.stock, pm.low_stock_threshold
  FROM pharmacy_medications pm JOIN medications m ON m.id = pm.medication_id
  WHERE pm.pharmacy_id = $1 AND m.id = $2`;

// ---------------------------------------------------------------------------
// Catalog — the pharmacy's medications, with stock
// ---------------------------------------------------------------------------

/** GET /api/pharmacist/medications?q= — the stocked references, A→Z. */
router.get(
  '/medications',
  route(async (req, res) => {
    const { q: search } = req.query as Record<string, string | undefined>;
    const clauses = ['pm.pharmacy_id = $1'];
    const params: unknown[] = [pharmacyId(req)];
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      clauses.push(`(lower(m.name || ' ' || m.category || ' ' || m.dosage || ' ' || m.lab) LIKE $${params.length})`);
    }
    const { rows } = await query(
      `SELECT m.*, pm.stock, pm.low_stock_threshold
       FROM pharmacy_medications pm JOIN medications m ON m.id = pm.medication_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY m.name`,
      params,
    );
    res.json(rows.map(mapPharmacyMedication));
  }),
);

/**
 * POST /api/pharmacist/medications — adds a reference: creates the catalog
 * entry (global) and stocks it in the pharmacy in one transaction.
 */
router.post(
  '/medications',
  route(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const pid = pharmacyId(req);
    const name = needString(body, 'name', { min: 2 })!;
    const form = needString(body, 'form')!;
    const dosage = needString(body, 'dosage')!;
    const lab = needString(body, 'lab', { optional: true }) ?? '';
    const category = needString(body, 'category', { optional: true }) ?? '';
    const description = needString(body, 'description', { optional: true }) ?? '';
    const requiresPrescription = Boolean(body.requiresPrescription);
    const unitPrice = needInt(body, 'unitPrice')!;
    if (unitPrice < 0) throw new HttpError(400, 'Le prix unitaire doit être positif');
    const stock = Math.max(0, needInt(body, 'stock', { optional: true }) ?? 0);

    const id = await tx(async (q) => {
      const medId = newId('m');
      await q(
        `INSERT INTO medications (id, name, form, dosage, lab, category, description, requires_prescription, unit_price, pharmacy_ids)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,jsonb_build_array($10::text))`,
        [medId, name, form, dosage, lab, category, description, requiresPrescription, unitPrice, pid],
      );
      // Keep the denormalized pharmacy ↔ medication links in sync (the public
      // catalog filters on these JSONB id arrays).
      await q(`UPDATE pharmacies SET medication_ids = medication_ids || to_jsonb($2::text) WHERE id = $1`, [pid, medId]);
      await q(`INSERT INTO pharmacy_medications (pharmacy_id, medication_id, stock) VALUES ($1,$2,$3)`, [pid, medId, stock]);
      return medId;
    });

    const row = await one(PHARMACY_MED_SELECT, [pid, id]);
    res.status(201).json(mapPharmacyMedication(row!));
  }),
);

/** PATCH /api/pharmacist/medications/:id — partial edit of details and/or stock. */
router.patch(
  '/medications/:id',
  route(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const pid = pharmacyId(req);
    const linked = await one(`SELECT medication_id FROM pharmacy_medications WHERE pharmacy_id = $1 AND medication_id = $2`, [
      pid,
      req.params.id,
    ]);
    if (!linked) throw new HttpError(404, 'Médicament introuvable dans votre catalogue');

    const updates: string[] = [];
    const params: unknown[] = [];
    const push = (column: string, value: unknown) => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };
    const name = needString(body, 'name', { optional: true, min: 2 });
    if (name !== undefined) push('name', name);
    const form = needString(body, 'form', { optional: true });
    if (form !== undefined) push('form', form);
    const dosage = needString(body, 'dosage', { optional: true });
    if (dosage !== undefined) push('dosage', dosage);
    const lab = needString(body, 'lab', { optional: true });
    if (lab !== undefined) push('lab', lab);
    const category = needString(body, 'category', { optional: true });
    if (category !== undefined) push('category', category);
    const description = needString(body, 'description', { optional: true });
    if (description !== undefined) push('description', description);
    if (body.requiresPrescription !== undefined) push('requires_prescription', Boolean(body.requiresPrescription));
    const unitPrice = needInt(body, 'unitPrice', { optional: true });
    if (unitPrice !== undefined) {
      if (unitPrice < 0) throw new HttpError(400, 'Le prix unitaire doit être positif');
      push('unit_price', unitPrice);
    }

    const stock = needInt(body, 'stock', { optional: true });
    if (stock !== undefined && stock < 0) throw new HttpError(400, 'Le stock doit être positif');

    await tx(async (q) => {
      if (updates.length) {
        await q(`UPDATE medications SET ${updates.join(', ')} WHERE id = $${params.length + 1}`, [...params, req.params.id]);
      }
      if (stock !== undefined) {
        await q(`UPDATE pharmacy_medications SET stock = $3, updated_at = now() WHERE pharmacy_id = $1 AND medication_id = $2`, [
          pid,
          req.params.id,
          stock,
        ]);
      }
    });

    const row = await one(PHARMACY_MED_SELECT, [pid, req.params.id]);
    res.json(mapPharmacyMedication(row!));
  }),
);

/** DELETE /api/pharmacist/medications/:id — removes the reference from the pharmacy (catalog entry kept). */
router.delete(
  '/medications/:id',
  route(async (req, res) => {
    const pid = pharmacyId(req);
    const removed = await tx(async (q) => {
      const { rows } = await q(`DELETE FROM pharmacy_medications WHERE pharmacy_id = $1 AND medication_id = $2 RETURNING medication_id`, [
        pid,
        req.params.id,
      ]);
      if (rows.length === 0) return false;
      await q(`UPDATE pharmacies SET medication_ids = medication_ids - $2 WHERE id = $1`, [pid, req.params.id]);
      await q(`UPDATE medications SET pharmacy_ids = pharmacy_ids - $2 WHERE id = $1`, [req.params.id, pid]);
      return true;
    });
    if (!removed) throw new HttpError(404, 'Médicament introuvable dans votre catalogue');
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Couriers — the pharmacy's delivery team
// ---------------------------------------------------------------------------

/** GET /api/pharmacist/couriers — the team, with each courier's active load. */
router.get(
  '/couriers',
  route(async (req, res) => {
    const { rows } = await query(
      `SELECT c.*, (SELECT count(*) FROM orders o WHERE o.courier_id = c.id AND o.status IN ('prête', 'en livraison')) AS active_deliveries
       FROM couriers c WHERE c.pharmacy_id = $1
       ORDER BY c.active DESC, active_deliveries ASC, c.first_name ASC`,
      [pharmacyId(req)],
    );
    res.json(rows.map((r) => ({ ...mapCourier(r), activeDeliveries: Number(r.active_deliveries) })));
  }),
);

/** PATCH /api/pharmacist/couriers/:id {active} — activate or pause a courier. */
router.patch(
  '/couriers/:id',
  route(async (req, res) => {
    const active = (req.body as Record<string, unknown>).active;
    if (typeof active !== 'boolean') throw new HttpError(400, 'Le champ active doit être un booléen');
    const updated = await one(`UPDATE couriers SET active = $3 WHERE id = $1 AND pharmacy_id = $2 RETURNING *`, [
      req.params.id,
      pharmacyId(req),
      active,
    ]);
    if (!updated) throw new HttpError(404, 'Livreur introuvable');
    res.json(mapCourier(updated));
  }),
);

// ---------------------------------------------------------------------------
// Orders — queue, detail with timeline, lifecycle
// ---------------------------------------------------------------------------

/** GET /api/pharmacist/orders — the pharmacy's queue, most urgent first. */
router.get(
  '/orders',
  route(async (req, res) => {
    const { rows } = await query<FullOrderRow>(
      `${SELECT_FULL_ORDER} WHERE o.pharmacy_id = $1
       ORDER BY (o.status = 'en attente') DESC,
                (o.status = 'confirmée') DESC,
                (o.status = 'prête') DESC,
                o.created_at ASC`,
      [pharmacyId(req)],
    );
    res.json(rows.map(mapFullOrder));
  }),
);

/** GET /api/pharmacist/orders/:id — full order + progression timeline. */
router.get(
  '/orders/:id',
  route(async (req, res) => {
    const order = await loadOwnedOrder(req, req.params.id);
    res.json({ order: mapFullOrder(order), events: await listOrderEvents(order.id) });
  }),
);

/** POST /api/pharmacist/orders/:id/validate — accept a paid order (en attente → confirmée). */
router.post(
  '/orders/:id/validate',
  route(async (req, res) => {
    const order = await loadOwnedOrder(req, req.params.id);
    if (order.status !== 'en attente') throw new HttpError(409, `Impossible de valider : commande « ${order.status} »`);
    if (!order.payment_id) throw new HttpError(422, 'Commande non payée — le paiement doit être finalisé avant validation');

    await one(`UPDATE orders SET status = 'confirmée', validated_at = now() WHERE id = $1`, [order.id]);
    await recordOrderEvent(query, order.id, 'confirmée', 'Commande validée', 'pharmacist');
    await notify({
      patientId: order.patient_id,
      type: 'order',
      title: 'Commande validée',
      body: `${order.pharmacy_name} a validé votre commande (${fcfa(order.total)}) — préparation en cours.`,
      deepLink: '/orders',
    });
    res.json(mapFullOrder((await loadFullOrder(order.id))!));
  }),
);

/** POST /api/pharmacist/orders/:id/reject {reason} — cancel an order not yet prepared (→ annulée). */
router.post(
  '/orders/:id/reject',
  route(async (req, res) => {
    const order = await loadOwnedOrder(req, req.params.id);
    if (!['en attente', 'confirmée'].includes(order.status)) {
      throw new HttpError(409, `Impossible d'annuler : commande « ${order.status} »`);
    }
    const reason = needString(req.body as Record<string, unknown>, 'reason', { min: 3 })!;

    await one(`UPDATE orders SET status = 'annulée', cancel_reason = $2 WHERE id = $1`, [order.id, reason]);
    if (order.payment_id) {
      // Order was charged: mark the payment refunded so the patient sees it.
      await one(`UPDATE payments SET status = 'refunded' WHERE id = $1`, [order.payment_id]);
    }
    await recordOrderEvent(query, order.id, 'annulée', 'Commande refusée', 'pharmacist', reason);
    await notify({
      patientId: order.patient_id,
      type: 'order',
      title: 'Commande annulée',
      body: `${order.pharmacy_name} a annulé votre commande : ${reason}${order.payment_id ? ' Votre remboursement est en cours.' : ''}`,
      deepLink: '/orders',
    });
    res.json(mapFullOrder((await loadFullOrder(order.id))!));
  }),
);

/**
 * POST /api/pharmacist/orders/:id/assign {courierId} — explicitly assign (or
 * replace) the courier of a delivery order before it leaves the pharmacy.
 */
router.post(
  '/orders/:id/assign',
  route(async (req, res) => {
    const order = await loadOwnedOrder(req, req.params.id);
    if (order.mode !== 'delivery') throw new HttpError(409, 'L’affectation d’un livreur ne concerne que les commandes en livraison');
    if (!['confirmée', 'prête'].includes(order.status)) {
      throw new HttpError(409, `Impossible d’affecter un livreur : commande « ${order.status} »`);
    }
    const courierId = needString(req.body as Record<string, unknown>, 'courierId')!;
    const courier = await one<{ id: string; first_name: string; last_name: string; active: boolean }>(
      `SELECT id, first_name, last_name, active FROM couriers WHERE id = $1 AND pharmacy_id = $2`,
      [courierId, order.pharmacy_id],
    );
    if (!courier) throw new HttpError(404, 'Livreur introuvable dans votre équipe');
    if (!courier.active) throw new HttpError(422, `${courier.first_name} ${courier.last_name} est désactivé — réactivez-le d’abord`);

    const previous = order.courier_first_name ? `${order.courier_first_name} ${order.courier_last_name}` : null;
    const courierName = `${courier.first_name} ${courier.last_name}`;
    await one(`UPDATE orders SET courier_id = $2, assigned_at = now() WHERE id = $1`, [order.id, courier.id]);
    await recordOrderEvent(
      query,
      order.id,
      order.status,
      previous ? `Livreur remplacé : ${previous} → ${courierName}` : `Livreur affecté : ${courierName}`,
      'pharmacist',
    );
    if (order.status === 'prête') {
      await notify({
        patientId: order.patient_id,
        type: 'order',
        title: 'Livreur affecté',
        body: `${courierName} se charge de la livraison de votre commande.`,
        deepLink: '/orders',
      });
    }
    res.json(mapFullOrder((await loadFullOrder(order.id))!));
  }),
);

/** POST /api/pharmacist/orders/:id/ready — order prepared (confirmée → prête); assigns a courier for deliveries. */
router.post(
  '/orders/:id/ready',
  route(async (req, res) => {
    const order = await loadOwnedOrder(req, req.params.id);
    if (order.status !== 'confirmée') throw new HttpError(409, `Impossible de préparer : commande « ${order.status} »`);

    if (order.mode === 'delivery' && !order.courier_id) {
      const courier = await one<{ id: string; first_name: string; last_name: string }>(
        `SELECT c.id, c.first_name, c.last_name
         FROM couriers c
         WHERE c.active
         ORDER BY (c.pharmacy_id = $1) DESC,
                  (SELECT count(*) FROM orders o2 WHERE o2.courier_id = c.id AND o2.status IN ('prête', 'en livraison')) ASC,
                  c.id ASC
         LIMIT 1`,
        [order.pharmacy_id],
      );
      if (!courier) throw new HttpError(409, 'Aucun livreur disponible — affectez-en un manuellement ou proposez le retrait');
      await one(
        `UPDATE orders SET status = 'prête', prepared_at = now(), courier_id = $2, assigned_at = now() WHERE id = $1`,
        [order.id, courier.id],
      );
      await recordOrderEvent(query, order.id, 'prête', 'Commande prête', 'pharmacist');
      await recordOrderEvent(query, order.id, 'prête', `Livreur affecté : ${courier.first_name} ${courier.last_name}`, 'pharmacist');
      await notify({
        patientId: order.patient_id,
        type: 'order',
        title: 'Commande prête',
        body: `Votre commande est prête. ${courier.first_name} ${courier.last_name} se charge de la livraison.`,
        deepLink: '/orders',
      });
    } else {
      // Pickup orders, or delivery orders whose courier was already assigned.
      await one(`UPDATE orders SET status = 'prête', prepared_at = now() WHERE id = $1`, [order.id]);
      await recordOrderEvent(query, order.id, 'prête', order.mode === 'pickup' ? 'Commande prête au retrait' : 'Commande prête', 'pharmacist');
      await notify({
        patientId: order.patient_id,
        type: 'order',
        title: order.mode === 'pickup' ? 'Commande prête au retrait' : 'Commande prête',
        body:
          order.mode === 'pickup'
            ? `Votre commande est prête chez ${order.pharmacy_name}. Munissez-vous de votre code de remise à 6 chiffres.`
            : `Votre commande est prête. ${order.courier_first_name} ${order.courier_last_name} se charge de la livraison.`,
        deepLink: '/orders',
      });
    }
    res.json(mapFullOrder((await loadFullOrder(order.id))!));
  }),
);

/**
 * POST /api/pharmacist/orders/:id/handover {code} — pickup handover to the
 * customer, who must give their secret code (prête → livrée).
 */
router.post(
  '/orders/:id/handover',
  route(async (req, res) => {
    const order = await loadOwnedOrder(req, req.params.id);
    if (order.mode !== 'pickup') throw new HttpError(409, 'Remise sur place réservée aux commandes en retrait — le livreur confirme les livraisons');
    if (order.status !== 'prête') throw new HttpError(409, `Impossible de remettre : commande « ${order.status} »`);

    const code = String((req.body as Record<string, unknown>)?.code ?? '').trim();
    if (!handoverCodeMatches(code, order.handover_code_hash)) {
      throw new HttpError(400, 'Code de remise incorrect — demandez-le au client');
    }

    await one(`UPDATE orders SET status = 'livrée', delivered_at = now() WHERE id = $1`, [order.id]);
    await dispenseOrderItems(query, order);
    await recordOrderEvent(query, order.id, 'livrée', 'Commande remise au client', 'pharmacist');
    await notify({
      patientId: order.patient_id,
      type: 'order',
      title: 'Commande retirée',
      body: `Votre commande chez ${order.pharmacy_name} vous a été remise. Merci !`,
      deepLink: '/orders',
    });
    res.json(mapFullOrder((await loadFullOrder(order.id))!));
  }),
);

export default router;
