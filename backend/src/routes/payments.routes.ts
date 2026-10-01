import { Router } from 'express';
import { one, query, tx } from '../db.js';
import { HttpError, newId, needOneOf, needString, requireAuth, requireRole, route } from '../auth.js';
import { mapAppointment, mapOrder, mapPayment } from '../mappers.js';
import { notify } from '../services/notify.js';
import { fcfa } from '../services/format.js';
import { nowTime, todayISO } from '../services/time.js';
import { config } from '../config.js';

const router = Router();

router.use(requireAuth, requireRole('patient'));

const METHODS = ['mtn_momo', 'orange_money', 'card'] as const;
const CATEGORIES = ['consultation', 'medkit', 'order'] as const;

/** GET /api/payments — patient payment history. */
router.get('/', route(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM payments WHERE patient_id = $1 ORDER BY date DESC, created_at DESC`,
    [req.user!.patientId],
  );
  res.json(rows.map(mapPayment));
}));

router.get('/:id', route(async (req, res) => {
  const payment = await one(`SELECT * FROM payments WHERE id = $1 AND patient_id = $2`, [req.params.id, req.user!.patientId]);
  if (!payment) throw new HttpError(404, 'Paiement introuvable');
  res.json(mapPayment(payment));
}));

/**
 * POST /api/payments {category, relatedId?, method, label?, amount?}
 * Simulated gateway: the charge always succeeds for a valid payload. Applying
 * the payment triggers the owning flow's side effects (appointment paid,
 * order confirmed, notifications).
 */
router.post('/', route(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const category = needOneOf(body, 'category', CATEGORIES)!;
  const method = needOneOf(body, 'method', METHODS)!;
  const relatedId = needString(body, 'relatedId', { optional: true });
  const patientId = req.user!.patientId!;

  const result = await tx(async (q) => {
    let label = needString(body, 'label', { optional: true });
    let amount = Number(body.amount ?? 0);
    let paymentId: string | null = null;

    if (category === 'consultation') {
      if (!relatedId) throw new HttpError(400, 'relatedId (rendez-vous) requis');
      const appt = await q<Record<string, any>>(`SELECT * FROM appointments WHERE id = $1 AND patient_id = $2 FOR UPDATE`, [relatedId, patientId]);
      if (appt.rows.length === 0) throw new HttpError(404, 'Rendez-vous introuvable');
      const appointment = appt.rows[0];
      if (appointment.paid) throw new HttpError(422, 'Cette consultation est déjà payée');
      if (appointment.status === 'cancelled') throw new HttpError(422, 'Impossible de payer un rendez-vous annulé');
      amount = appointment.fee;
      const doctor = await q<Record<string, any>>(`SELECT first_name, last_name FROM doctors WHERE id = $1`, [appointment.doctor_id]);
      label = label ?? (doctor.rows[0] ? `Consultation — Dr ${doctor.rows[0].first_name} ${doctor.rows[0].last_name}` : `Consultation — ${appointment.establishment}`);

      const pay = await q<Record<string, any>>(
        `INSERT INTO payments (id, patient_id, reference, label, category, amount, status, method, date, time, related_id)
         VALUES ($1,$2,$3,$4,'consultation',$5,'paid',$6,$7,$8,$9) RETURNING *`,
        [newId('pay'), patientId, `PAY-${Date.now().toString(36).toUpperCase()}`, label, amount, method, todayISO(), nowTime(), relatedId],
      );
      paymentId = pay.rows[0].id;
      await q(`UPDATE appointments SET paid = true, payment_id = $2 WHERE id = $1`, [relatedId, paymentId]);
      await notify({
        patientId,
        type: 'payment',
        title: 'Paiement confirmé',
        body: `Votre paiement de ${fcfa(amount)} pour la consultation a bien été reçu. Rendez-vous confirmé.`,
        deepLink: `/payments/${paymentId}`,
      });
      return { payment: pay.rows[0] };
    }

    if (category === 'order') {
      if (!relatedId) throw new HttpError(400, 'relatedId (commande) requis');
      const ord = await q<Record<string, any>>(`SELECT * FROM orders WHERE id = $1 AND patient_id = $2 FOR UPDATE`, [relatedId, patientId]);
      if (ord.rows.length === 0) throw new HttpError(404, 'Commande introuvable');
      const order = ord.rows[0];
      if (order.payment_id) throw new HttpError(422, 'Cette commande est déjà payée');
      if (order.status === 'annulée') throw new HttpError(422, 'Impossible de payer une commande annulée');
      amount = order.total;
      label = label ?? `Commande pharmacie — ${order.pharmacy_name}`;

      const pay = await q<Record<string, any>>(
        `INSERT INTO payments (id, patient_id, reference, label, category, amount, status, method, date, time, related_id)
         VALUES ($1,$2,$3,$4,'order',$5,'paid',$6,$7,$8,$9) RETURNING *`,
        [newId('pay'), patientId, `PAY-${Date.now().toString(36).toUpperCase()}`, label, amount, method, todayISO(), nowTime(), relatedId],
      );
      paymentId = pay.rows[0].id;
      // IMPORTANT — do NOT advance the order to « prête »/« en livraison »
      // here. The pharmacy workflow requires the pharmacist to VALIDATE every
      // paid order (« en attente » → « confirmée ») and then PREPARE it
      // (« confirmée » → « prête », which assigns a courier for deliveries);
      // the courier then closes the loop with the customer's handover code.
      // Jumping to a fulfillment state on payment would skip the pharmacist
      // entirely (guarded by scripts/smoke.ts, pharmacy section).
      await q(`UPDATE orders SET payment_id = $2 WHERE id = $1`, [relatedId, paymentId]);
      // The mobile checkout clears the cart once the order is paid.
      await q(`DELETE FROM cart_items WHERE patient_id = $1`, [patientId]);
      await notify({
        patientId,
        type: 'order',
        title: 'Paiement confirmé',
        body: `Paiement de ${fcfa(amount)} reçu pour votre commande chez ${order.pharmacy_name}. Elle attend la validation de la pharmacie.`,
        deepLink: '/orders',
      });
      return { payment: pay.rows[0] };
    }

    // category === 'medkit' — free-standing payment (no side effects).
    if (amount <= 0) throw new HttpError(400, 'Le montant doit être positif');
    label = label ?? 'Paiement Aura Health';
    const pay = await q<Record<string, any>>(
      `INSERT INTO payments (id, patient_id, reference, label, category, amount, status, method, date, time, related_id)
       VALUES ($1,$2,$3,$4,'medkit',$5,'paid',$6,$7,$8,$9) RETURNING *`,
      [newId('pay'), patientId, `PAY-${Date.now().toString(36).toUpperCase()}`, label, amount, method, todayISO(), nowTime(), relatedId ?? null],
    );
    return { payment: pay.rows[0] };
  });

  res.status(201).json(mapPayment(result.payment));
}));

export default router;
