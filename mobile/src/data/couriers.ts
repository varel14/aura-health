import { Courier } from '@/models/types';

/** Livreurs rattachés à la Pharmacie du Centre (ph1) — compte démo : c1. */
export const couriers: Courier[] = [
  {
    id: 'c1',
    firstName: 'Alain',
    lastName: 'Manga',
    phone: '+237 655 40 12 88',
    city: 'Yaoundé',
    vehicle: 'moto',
    pharmacyId: 'ph1',
    active: true,
  },
  {
    id: 'c2',
    firstName: 'Brice',
    lastName: 'Nkotto',
    phone: '+237 655 77 31 02',
    city: 'Yaoundé',
    vehicle: 'voiture',
    pharmacyId: 'ph1',
    active: true,
  },
];

/** Le pharmacien de démonstration (espace « pharmacy », pharmacie ph1). */
export const demoPharmacist = {
  name: 'Sandrine Ebolo',
  role: 'Pharmacienne titulaire',
  pharmacyId: 'ph1',
};
