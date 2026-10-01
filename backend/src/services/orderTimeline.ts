/**
 * Order progression timeline. Every transition (creation, validation,
 * preparation, courier assignment, pickup, delivery, cancellation) appends an
 * immutable `order_events` row, so the pharmacy workspace (and the patient)
 * can replay an order's progression step by step.
 */
import { query } from '../db.js';
import { newId } from '../auth.js';

export type OrderEventActor = 'patient' | 'pharmacist' | 'delivery' | 'system';

/** Accepts the pool-level `query` or the transaction-scoped `q` from db.tx. */
export async function recordOrderEvent(
  q: typeof query,
  orderId: string,
  status: string,
  label: string,
  actor: OrderEventActor = 'system',
  note?: string,
): Promise<void> {
  await q(`INSERT INTO order_events (id, order_id, status, label, actor, note) VALUES ($1,$2,$3,$4,$5,$6)`, [
    newId('evt'),
    orderId,
    status,
    label,
    actor,
    note ?? null,
  ]);
}

/** API shape of one timeline entry. */
export function mapOrderEvent(r: Record<string, any>) {
  return {
    id: r.id,
    orderId: r.order_id,
    status: r.status,
    label: r.label,
    actor: r.actor,
    note: r.note ?? undefined,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

/** Chronological progression of an order (oldest first). */
export async function listOrderEvents(orderId: string) {
  const { rows } = await query(`SELECT * FROM order_events WHERE order_id = $1 ORDER BY created_at ASC`, [orderId]);
  return rows.map(mapOrderEvent);
}
