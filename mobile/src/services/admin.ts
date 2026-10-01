/**
 * Admin back-office service — doctor activation queue, establishments and
 * professional applications (role admin, see backend/src/routes/admin.routes.ts).
 */
import { ActivationStatus, AdminApplication, AdminDoctor, AdminHospital, AdminOverview, AdminPharmacy } from '@/models/types';
import { api, qs } from './api';

export const adminService = {
  overview: (): Promise<AdminOverview> => api('/api/admin/overview'),

  /** The validation queue — all doctors when no status filter is given. */
  doctors: (status?: ActivationStatus): Promise<AdminDoctor[]> =>
    api(`/api/admin/doctors${qs({ status })}`),

  doctor: (id: string): Promise<AdminDoctor> => api(`/api/admin/doctors/${id}`),

  activate: (id: string): Promise<AdminDoctor> =>
    api(`/api/admin/doctors/${id}/activate`, { method: 'POST' }),

  reject: (id: string, reason: string): Promise<AdminDoctor> =>
    api(`/api/admin/doctors/${id}/reject`, { method: 'POST', body: { reason } }),

  hospitals: (): Promise<AdminHospital[]> => api('/api/admin/hospitals'),

  pharmacies: (): Promise<AdminPharmacy[]> => api('/api/admin/pharmacies'),

  applications: (status?: string): Promise<AdminApplication[]> =>
    api(`/api/admin/applications${qs({ status })}`),
};
