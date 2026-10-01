/**
 * Order workflow store — mirrors the backend contract one-to-one
 * (see backend/src/routes/{pharmacy,pharmacist,delivery}.routes.ts):
 *
 *   panier payé → « en attente » → pharmacien valide (« confirmée »)
 *   → pharmacien prépare (« prête », livreur affecté si livraison)
 *   → livreur récupère (« en livraison ») → remise contre le code client (« livrée »)
 *
 * The handover code (6 digits) is generated at checkout, shown once to the
 * customer and stored hashed server-side. Workspace actions verify it — they
 * can never read it.
 */
import { CourierWithLoad, Order, WorkspaceOrder, WorkspaceOrderDetail } from '@/models/types';
import { api } from './api';

/** Demo workspace identities (match the seeded accounts). */
export const WORKSPACE = {
  pharmacyId: 'ph1',
  courierId: 'c1',
  pharmacistName: 'Sandrine Ebolo',
  courierName: 'Alain Manga',
};

type CheckoutResponse = { order: Order; handoverCode: string };

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export const orderService = {
  /** The customer's orders, newest first. */
  listMine: (): Promise<Order[]> => api('/api/pharmacy/orders'),

  /**
   * Places the cart as an order. The backend creates it « en attente »
   * (unpaid — the charge happens next, on POST /api/payments) and attaches a
   * secret handover code, returned once here.
   */
  create: (input: { pharmacyId: string; mode: 'delivery' | 'pickup'; address?: string; prescriptionId?: string }): Promise<CheckoutResponse> =>
    api<CheckoutResponse>('/api/pharmacy/orders', {
      method: 'POST',
      body: {
        pharmacyId: input.pharmacyId,
        mode: input.mode,
        address: input.address,
        prescriptionId: input.prescriptionId,
      },
    }),

  /** (Re)generates the handover code — the only way to read it again. */
  regenerateCode: (orderId: string): Promise<string> =>
    api<{ handoverCode: string }>(`/api/pharmacy/orders/${orderId}/code`, { method: 'POST' }).then((r) => r.handoverCode),
};

// ---------------------------------------------------------------------------
// Pharmacist workspace
// ---------------------------------------------------------------------------

export const pharmacyOrderService = {
  /** Queue of the demo pharmacy, most urgent first. */
  list: (): Promise<WorkspaceOrder[]> => api('/api/pharmacist/orders'),

  /** Full order + progression timeline (order_events, oldest first). */
  detail: (orderId: string): Promise<WorkspaceOrderDetail> => api(`/api/pharmacist/orders/${orderId}`),

  /** Accepts a paid order (en attente → confirmée). */
  validate: (orderId: string): Promise<WorkspaceOrder> =>
    api(`/api/pharmacist/orders/${orderId}/validate`, { method: 'POST' }),

  /** Cancels an order not yet prepared (→ annulée). */
  reject: (orderId: string, reason: string): Promise<WorkspaceOrder> =>
    api(`/api/pharmacist/orders/${orderId}/reject`, { method: 'POST', body: { reason } }),

  /** Assigns (or replaces) the courier of a delivery order (confirmée/prête). */
  assign: (orderId: string, courierId: string): Promise<WorkspaceOrder> =>
    api(`/api/pharmacist/orders/${orderId}/assign`, { method: 'POST', body: { courierId } }),

  /** The pharmacy's delivery team, with each courier's active load. */
  couriers: (): Promise<CourierWithLoad[]> => api('/api/pharmacist/couriers'),

  /** Activates or pauses a courier of the pharmacy. */
  setCourierActive: (courierId: string, active: boolean): Promise<CourierWithLoad> =>
    api(`/api/pharmacist/couriers/${courierId}`, { method: 'PATCH', body: { active } }),

  /** Marks the order prepared (confirmée → prête); assigns a courier for deliveries. */
  markReady: (orderId: string): Promise<WorkspaceOrder> =>
    api(`/api/pharmacist/orders/${orderId}/ready`, { method: 'POST' }),

  /** Pickup handover at the counter — the customer's code is required. */
  handoverPickup: (orderId: string, code: string): Promise<WorkspaceOrder> =>
    api(`/api/pharmacist/orders/${orderId}/handover`, { method: 'POST', body: { code } }),
};

// ---------------------------------------------------------------------------
// Delivery workspace
// ---------------------------------------------------------------------------

export const deliveryService = {
  /** The courier's run sheet: to collect, in progress, then history. */
  list: (): Promise<WorkspaceOrder[]> => api('/api/delivery/orders'),

  /** Collects the prepared parcel at the pharmacy (prête → en livraison). */
  pickup: (orderId: string): Promise<WorkspaceOrder> =>
    api(`/api/delivery/orders/${orderId}/pickup`, { method: 'POST' }),

  /** Handover to the customer — their secret code closes the order. */
  confirmDelivery: (orderId: string, code: string): Promise<WorkspaceOrder> =>
    api(`/api/delivery/orders/${orderId}/deliver`, { method: 'POST', body: { code } }),
};
