/**
 * Session profile — mirrors GET /api/auth/me for workspace screens that need
 * the signed-in account's own record (the pharmacy tab reads `pharmacy`).
 */
import { Courier, Doctor, Patient, Pharmacy, Role } from '@/models/types';
import { api } from './api';

export interface MeResponse {
  role: Role;
  displayName?: string;
  patient?: Patient;
  doctor?: Doctor;
  pharmacy?: Pharmacy;
  courier?: Courier;
}

export const authService = {
  me: (): Promise<MeResponse> => api('/api/auth/me'),
};
