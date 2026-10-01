import { Patient, Allergy, Condition, Treatment, Vaccine, ExamResult, MedicalDocument } from '@/models/types';
import { todayISO, addMonths } from '@/utils/format';

export const patient: Patient = {
  id: 'p1',
  firstName: 'Stéphane',
  lastName: 'Nkodo',
  email: 'stephane.nkodo@email.cm',
  phone: '+237 691 45 78 20',
  sex: 'M',
  birthDate: '1992-04-17',
  city: 'Yaoundé',
  address: 'Quartier Nlongkak, Rue 1.234',
  bloodType: 'O+',
  heightCm: 176,
  weightKg: 74,
  emergencyContact: { name: 'Clarisse Nkodo', phone: '+237 677 12 09 55', relation: 'Sœur' },
};

export const allergies: Allergy[] = [
  { id: 'al1', name: 'Pénicilline', severity: 'sévère' },
  { id: 'al2', name: 'Arachides', severity: 'modérée' },
  { id: 'al3', name: 'Pollen', severity: 'légère' },
];

export const conditions: Condition[] = [
  { id: 'cd1', name: 'Paludisme simple', year: 2025, type: 'antécédent', note: 'Traitement ambulatoire, guérison complète' },
  { id: 'cd2', name: 'Appendicectomie', year: 2019, type: 'chirurgie', note: 'Clinique de l’Odza, sans complication' },
  { id: 'cd3', name: 'Rhinite allergique saisonnière', year: 2018, type: 'maladie chronique' },
];

export const treatments: Treatment[] = [
  {
    id: 'tr1',
    name: 'Loratadine',
    dosage: '10 mg',
    frequency: '1 comprimé par jour',
    since: 'Mars 2026',
    prescriber: 'Dr Aïcha Bello',
    active: true,
  },
  {
    id: 'tr2',
    name: 'Fer + Acide folique',
    dosage: '60 mg / 400 µg',
    frequency: '1 comprimé par jour',
    since: 'Juin 2026',
    prescriber: 'Dr Vanessa Mbarga',
    active: true,
  },
  {
    id: 'tr3',
    name: 'Artéméther + Luméfantrine',
    dosage: '20/120 mg',
    frequency: '2 fois par jour pendant 3 jours',
    since: 'Janvier 2025',
    prescriber: 'Dr Vanessa Mbarga',
    active: false,
  },
];

export const vaccines: Vaccine[] = [
  { id: 'vc1', name: 'Fièvre jaune', date: '2015-08-12' },
  { id: 'vc2', name: 'Hépatite B (rappel)', date: '2018-03-04' },
  { id: 'vc3', name: 'Tétanos (rappel)', date: '2022-11-19', nextDue: '2032-11-19' },
  { id: 'vc4', name: 'Grippe saisonnière', date: todayISO(-120), nextDue: addMonths(todayISO(), 0) },
];

export const examResults: ExamResult[] = [
  {
    id: 'ex1',
    name: 'Numération formule sanguine (NFS)',
    category: 'analyse',
    date: todayISO(-21),
    status: 'disponible',
    conclusion: 'Globules blancs légèrement élevés — contrôle recommandé après traitement.',
  },
  {
    id: 'ex2',
    name: 'Test de diagnostic rapide du paludisme (TDR)',
    category: 'analyse',
    date: todayISO(-21),
    status: 'disponible',
    conclusion: 'Positif à Plasmodium falciparum.',
  },
  {
    id: 'ex3',
    name: 'Glycémie à jeun',
    category: 'analyse',
    date: todayISO(-60),
    status: 'disponible',
    conclusion: '0,92 g/L — dans les normes.',
  },
  {
    id: 'ex4',
    name: 'Échographie abdominale',
    category: 'imagerie',
    date: todayISO(-5),
    status: 'en cours de traitement',
  },
];

export const medicalDocuments: MedicalDocument[] = [
  { id: 'doc1', name: 'Ordonnance — Dr Mbarga', type: 'ordonnance', date: todayISO(-21), source: 'aura', sizeKb: 148 },
  { id: 'doc2', name: 'Résultats NFS', type: 'analyse', date: todayISO(-21), source: 'aura', sizeKb: 220 },
  { id: 'doc3', name: 'Compte-rendu appendicectomie', type: 'compte-rendu', date: '2019-07-02', source: 'imported', sizeKb: 640 },
  { id: 'doc4', name: 'Certificat médical sportif', type: 'certificat', date: todayISO(-90), source: 'aura', sizeKb: 96 },
  { id: 'doc5', name: 'Ordonnance externe (Cabinet Dr Fouda)', type: 'ordonnance', date: todayISO(-45), source: 'imported', sizeKb: 180 },
];
