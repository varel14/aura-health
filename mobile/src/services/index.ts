/**
 * Catalog + workspace services — thin wrappers over the Aura Health API.
 * Same signatures as the original mock layer, so screens are unchanged.
 */
import { Appointment, Doctor, DoctorPatientFile, Hospital, Medication, Pharmacy, Specialty, SymptomPrep } from '@/models/types';
import { api, qs } from './api';

async function getMaybe<T>(path: string): Promise<T | undefined> {
  try {
    return await api<T>(path);
  } catch (err) {
    if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) return undefined;
    throw err;
  }
}

export const doctorService = {
  list: (filters?: {
    query?: string;
    specialty?: string;
    availableToday?: boolean;
    videoOnly?: boolean;
    hospitalId?: string;
  }): Promise<Doctor[]> =>
    api(
      `/api/doctors${qs({
        query: filters?.query,
        specialty: filters?.specialty,
        availableToday: filters?.availableToday,
        videoOnly: filters?.videoOnly,
        hospitalId: filters?.hospitalId,
      })}`,
    ),

  get: (id: string): Promise<(Doctor & { hospital: Hospital | null }) | undefined> => getMaybe(`/api/doctors/${id}`),

  /** Availability = template slots minus real bookings, computed server-side. */
  slots: (doctor: Doctor, dateISO: string): Promise<{ time: string; available: boolean }[]> =>
    api(`/api/doctors/${doctor.id}/slots${qs({ date: dateISO })}`),
};

export const specialtyService = {
  list: (): Promise<Specialty[]> => api('/api/specialties'),
};

export const hospitalService = {
  list: (filters?: { query?: string; city?: string; specialty?: string }): Promise<Hospital[]> =>
    api(`/api/hospitals${qs({ query: filters?.query, city: filters?.city, specialty: filters?.specialty })}`),

  get: (id: string): Promise<Hospital | undefined> => getMaybe(`/api/hospitals/${id}`),
};

export const pharmacyService = {
  list: (filters?: { query?: string; city?: string; onDutyOnly?: boolean; deliveryOnly?: boolean; medicationId?: string }): Promise<Pharmacy[]> =>
    api(
      `/api/pharmacies${qs({
        query: filters?.query,
        city: filters?.city,
        onDutyOnly: filters?.onDutyOnly,
        deliveryOnly: filters?.deliveryOnly,
        medicationId: filters?.medicationId,
      })}`,
    ),

  get: (id: string): Promise<Pharmacy | undefined> => getMaybe(`/api/pharmacies/${id}`),
};

export const medicationService = {
  list: (filters?: { query?: string; pharmacyId?: string; otcOnly?: boolean; category?: string }): Promise<Medication[]> =>
    api(`/api/medications${qs({ query: filters?.query, pharmacyId: filters?.pharmacyId, otcOnly: filters?.otcOnly, category: filters?.category })}`),

  get: (id: string): Promise<Medication | undefined> => getMaybe(`/api/medications/${id}`),
};

export const appointmentService = {
  /** The signed-in patient's appointments. */
  seedForPatient: (): Promise<Appointment[]> => api('/api/appointments'),
};

export const doctorWorkspaceService = {
  patients: (): Promise<DoctorPatientFile[]> => api('/api/doctor/patients'),
  getPatient: (id: string): Promise<DoctorPatientFile | undefined> => getMaybe(`/api/doctor/patients/${id}`),
  dayAppointments: (date?: string): Promise<{ date: string; appointments: Appointment[] }> =>
    api(`/api/doctor/agenda${qs({ date })}`),
  /** Symptom preps with the Groq AI diagnostic (doctor-only endpoint); all
   *  the doctor's patients when no patientId is given. */
  patientSymptomPreps: (patientId?: string): Promise<SymptomPrep[]> =>
    api(`/api/doctor/symptom-preps${qs({ patientId })}`),
};

export { orderService, pharmacyOrderService, deliveryService, WORKSPACE } from './orders';
export { pharmacyCatalogService } from './pharmacyCatalog';
export { authService } from './auth';
export { adminService } from './admin';
