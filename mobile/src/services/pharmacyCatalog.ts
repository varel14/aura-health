/**
 * Pharmacist catalog management — end-to-end medication handling for the
 * pharmacy: list the stocked references, add new ones (created in the shared
 * catalog and stocked in the pharmacy), edit details and stock, and remove a
 * reference from the pharmacy. Mirrors backend pharmacist.routes.ts.
 */
import { MedicationDraft, PharmacyMedication } from '@/models/types';
import { api } from './api';

export const pharmacyCatalogService = {
  /** The pharmacy's stocked medications, A→Z. */
  list: (query?: string): Promise<PharmacyMedication[]> =>
    api(`/api/pharmacist/medications${query ? `?q=${encodeURIComponent(query)}` : ''}`),

  /** Adds a reference to the catalog with its starting stock. */
  create: (draft: MedicationDraft): Promise<PharmacyMedication> =>
    api('/api/pharmacist/medications', { method: 'POST', body: draft }),

  /** Edits catalog details and/or the pharmacy stock (partial). */
  update: (medicationId: string, patch: Partial<MedicationDraft>): Promise<PharmacyMedication> =>
    api(`/api/pharmacist/medications/${medicationId}`, { method: 'PATCH', body: patch }),

  /** Removes the reference from the pharmacy (the shared catalog entry stays). */
  remove: (medicationId: string): Promise<{ ok: boolean }> =>
    api(`/api/pharmacist/medications/${medicationId}`, { method: 'DELETE' }),
};
