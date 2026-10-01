/**
 * Per-pharmacy medication stock. Dispensing an order (counter handover for
 * pickups, courier delivery for shipments) decrements the stock of each item
 * — the last step of the pharmacy's end-to-end medication flow. Stock never
 * goes negative: it floors at 0.
 */
import { query } from '../db.js';

export async function dispenseOrderItems(
  q: typeof query,
  order: { pharmacy_id: string; items: { medicationId: string; quantity: number }[] },
): Promise<void> {
  for (const item of order.items) {
    await q(
      `UPDATE pharmacy_medications SET stock = GREATEST(0, stock - $3), updated_at = now()
       WHERE pharmacy_id = $1 AND medication_id = $2`,
      [order.pharmacy_id, item.medicationId, item.quantity],
    );
  }
}
