/**
 * Courier workspace: deliveries assigned by the pharmacy.
 *
 *   prête         → pickup  → en livraison
 *   en livraison  → deliver → livrée   (customer's secret code required)
 *
 * The handover code is only known by the customer who placed the order; the
 * courier must collect it in person. It can never be read from the API.
 */
import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, requireAuth, requireRole, route } from '../auth.js';
import { notify } from '../services/notify.js';
import { SELECT_FULL_ORDER, FullOrderRow, loadFullOrder, mapFullOrder } from '../services/orderView.js';
import { handoverCodeMatches } from '../services/handover.js';
import { recordOrderEvent } from '../services/orderTimeline.js';
import { dispenseOrderItems } from '../services/stock.js';

const router = Router();

router.use(requireAuth, requireRole('delivery'));

const courierId = (req: Express.Request) => {
  if (!req.user!.courierId) throw new HttpError(403, 'Aucun profil livreur rattaché à ce compte');
  return req.user!.courierId;
};

async function loadAssignedOrder(req: Express.Request, id: string): Promise<FullOrderRow> {
  const order = await loadFullOrder(id);
  if (!order || order.courier_id !== courierId(req)) throw new HttpError(404, 'Commande introuvable');
  return order;
}

/** GET /api/delivery/orders — the courier's run sheet: to collect, in progress, and history. */
router.get(
  '/orders',
  route(async (req, res) => {
    const { rows } = await query<FullOrderRow>(
      `${SELECT_FULL_ORDER} WHERE o.courier_id = $1
       ORDER BY (o.status = 'prête') DESC,
                (o.status = 'en livraison') DESC,
                o.created_at DESC`,
      [courierId(req)],
    );
    res.json(rows.map(mapFullOrder));
  }),
);

/** POST /api/delivery/orders/:id/pickup — collect the prepared parcel at the pharmacy (prête → en livraison). */
router.post(
  '/orders/:id/pickup',
  route(async (req, res) => {
    const order = await loadAssignedOrder(req, req.params.id);
    if (order.status !== 'prête') throw new HttpError(409, `Impossible de récupérer : commande « ${order.status} »`);

    await one(`UPDATE orders SET status = 'en livraison' WHERE id = $1`, [order.id]);
    await recordOrderEvent(query, order.id, 'en livraison', `Colis pris en charge : ${req.user!.displayName}`, 'delivery');
    await notify({
      patientId: order.patient_id,
      type: 'order',
      title: 'Commande en route',
      body: `${order.pharmacy_name} a confié votre commande au livreur. Préparez votre code de remise à 6 chiffres.`,
      deepLink: '/orders',
    });
    res.json(mapFullOrder((await loadFullOrder(order.id))!));
  }),
);

/**
 * POST /api/delivery/orders/:id/deliver {code} — handover to the customer,
 * confirmed by their secret code (en livraison → livrée).
 */
router.post(
  '/orders/:id/deliver',
  route(async (req, res) => {
    const order = await loadAssignedOrder(req, req.params.id);
    if (order.status !== 'en livraison') throw new HttpError(409, `Impossible de livrer : commande « ${order.status} »`);

    const code = String((req.body as Record<string, unknown>)?.code ?? '').trim();
    if (!handoverCodeMatches(code, order.handover_code_hash)) {
      throw new HttpError(400, 'Code de remise incorrect — demandez-le au client avant de clôturer');
    }

    await one(`UPDATE orders SET status = 'livrée', delivered_at = now() WHERE id = $1`, [order.id]);
    await dispenseOrderItems(query, order);
    await recordOrderEvent(query, order.id, 'livrée', 'Commande livrée', 'delivery');
    await notify({
      patientId: order.patient_id,
      type: 'order',
      title: 'Commande livrée',
      body: `Votre commande a été livrée. Merci d'avoir utilisé AuraHealth !`,
      deepLink: '/orders',
    });
    res.json(mapFullOrder((await loadFullOrder(order.id))!));
  }),
);

export default router;
