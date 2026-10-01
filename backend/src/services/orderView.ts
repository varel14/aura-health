/**
 * Shared read model for orders in the professional workflows (pharmacist /
 * courier). Joins the customer, the assigned courier and the attached
 * prescription so workspaces can validate an order without extra round-trips.
 */
import { query } from '../db.js';
import { mapOrder } from '../mappers.js';

export type FullOrderRow = {
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

const toDateOnly = (value: unknown): string => {
  if (value instanceof Date) {
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
};

export const SELECT_FULL_ORDER = `
  SELECT o.*, c.first_name AS courier_first_name, c.last_name AS courier_last_name,
         p.first_name AS patient_first_name, p.last_name AS patient_last_name, p.phone AS patient_phone,
         rx.code AS prescription_code, rx.doctor_name AS prescription_doctor, rx.expiry_date AS prescription_expiry
  FROM orders o
  LEFT JOIN couriers c ON c.id = o.courier_id
  LEFT JOIN patients p ON p.id = o.patient_id
  LEFT JOIN prescriptions rx ON rx.id = o.prescription_id
`;

/** CamelCase API shape for a joined order row. Never exposes the code hash. */
export function mapFullOrder(r: FullOrderRow) {
  return {
    ...mapOrder(r),
    paid: Boolean(r.payment_id),
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

export async function loadFullOrder(id: string): Promise<FullOrderRow | null> {
  const res = await query<FullOrderRow>(`${SELECT_FULL_ORDER} WHERE o.id = $1`, [id]);
  return res.rows[0] ?? null;
}
