import { ChatThread, ConsultationSummary } from '@/models/types';
import { todayISO } from '@/utils/format';

export const threads: ChatThread[] = [
  {
    id: 'th1',
    appointmentId: 'appt1',
    doctorId: 'd1',
    doctorName: 'Dr Vanessa Mbarga',
    doctorSpecialty: 'Médecine générale',
    status: 'active',
    messages: [
      { id: 'cm1', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'Bonjour Stéphane 👋 Je vous retrouve pour notre consultation. Comment vous sentez-vous depuis ce matin ?', time: '15:28' },
      { id: 'cm2', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Bonjour Docteur. Les maux de tête persistent, surtout en fin de journée, et j’ai encore de la fièvre ce matin (38,4 °C).', time: '15:29' },
      { id: 'cm4', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'Merci pour ces précisions. Avez-vous d’autres symptômes : frissons, douleurs articulaires, perte d’appétit ?', time: '15:31' },
      { id: 'cm5', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Oui, des courbatures et des frissons depuis hier soir. J’ai aussi moins d’appétit.', time: '15:32' },
      { id: 'cm7', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Très bien Docteur, je vais faire le test au laboratoire du quartier et vous envoie le résultat.', time: '15:34' },
      { id: 'cm9', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'Parfait. Je vous ai prescrit un test TDR : l’ordonnance est déjà dans votre dossier médical. Envoyez-moi le résultat dès qu’il est disponible.', time: '15:35' },
    ],
  },
  {
    id: 'th2',
    appointmentId: 'appt7',
    doctorId: 'd9',
    doctorName: 'Dr Martine Abena',
    doctorSpecialty: 'Endocrinologie',
    status: 'ended',
    endedAt: '16:41',
    messages: [
      { id: 'cm10', threadId: 'th2', sender: 'doctor', kind: 'text', text: 'Bonjour Stéphane, votre glycémie à jeun est bonne (0,92 g/L). Poursuivez l’activité physique 3 fois par semaine.', time: '16:10' },
      { id: 'cm11', threadId: 'th2', sender: 'patient', kind: 'text', text: 'Merci Docteur. Je peux conserver mes habitudes alimentaires actuelles ?', time: '16:12' },
      { id: 'cm12', threadId: 'th2', sender: 'doctor', kind: 'text', text: 'Oui, avec un peu moins de sucres rapides. Reprogrammons un contrôle dans 6 mois.', time: '16:15' },
      { id: 'cm13', threadId: 'th2', sender: 'system', kind: 'text', text: 'La consultation a été terminée par le médecin.', time: '16:41' },
    ],
  },
];

export const summaries: ConsultationSummary[] = [
  {
    id: 'sum1',
    appointmentId: 'appt4',
    doctorId: 'd1',
    doctorName: 'Dr Vanessa Mbarga',
    doctorSpecialty: 'Médecine générale',
    consultationType: 'video',
    date: todayISO(-21),
    motif: 'Fièvre et fatigue persistante depuis 3 jours',
    symptoms: ['Fièvre (38,5 °C)', 'Fatigue intense', 'Courbatures', 'Céphalées', 'Frissons'],
    importantInfo: [
      'Le patient rentre d’un séjour à Kribi il y a une semaine.',
      'Aucune prise d’antipaludique avant la consultation.',
      'Antécédent d’allergie à la pénicilline confirmé par le patient.',
      'Température mesurée à 38,4 °C au début de la consultation.',
    ],
    observations:
      "Tableau évocateur d'un paludisme simple. Aucun signe de gravité (pas de vomissements persistants, pas de troubles de la conscience, diurèse conservée).",
    recommendations: [
      'Repos au domicile pendant 48 heures.',
      'Boire au moins 2 litres d’eau par jour.',
      'Prendre la température matin et soir et surveiller son évolution.',
      'Consulter en urgence en cas de vomissements persistants ou de confusion.',
    ],
    treatments: [
      { name: 'Artéméther + Luméfantrine', dosage: '20 mg / 120 mg', frequency: '2 comprimés matin et soir', duration: '3 jours' },
      { name: 'Paracétamol', dosage: '500 mg', frequency: '1 comprimé 3 fois par jour si fièvre', duration: '5 jours' },
    ],
    exams: ['Test de diagnostic rapide du paludisme (TDR)', 'Numération formule sanguine (NFS)'],
    nextSteps: [
      'Réaliser le TDR et la NFS en laboratoire.',
      'Envoyer les résultats au Dr Mbarga via la messagerie.',
      'Contrôle de guérison dans 7 jours en téléconsultation.',
    ],
    documents: [
      { name: 'Ordonnance AUR-RX-2026-0841', type: 'Ordonnance' },
      { name: 'Bon d’analyse laboratoire', type: 'Document' },
    ],
    generatedAt: '09:47',
    prescriptionId: 'rx1',
  },
  {
    id: 'sum2',
    appointmentId: 'appt8',
    doctorId: 'd10',
    doctorName: 'Dr Olivier Nkeng',
    doctorSpecialty: 'Psychiatrie',
    consultationType: 'video',
    date: todayISO(-14),
    motif: 'Troubles du sommeil et stress lié au travail',
    symptoms: ['Difficultés d’endormissement', 'Réveils nocturnes', 'Anxiété', 'Irritabilité'],
    importantInfo: [
      'Symptômes présents depuis environ 2 mois.',
      'Période de surcharge professionnelle depuis 3 mois.',
      'Consommation de café après 16h signalée par le patient.',
      'Aucun traitement en cours pour le sommeil.',
    ],
    observations:
      "Insomnie d'endormissement réactionnelle à un contexte de stress professionnel. Pas de signe évocateur d'un épisode dépressif caractérisé.",
    recommendations: [
      'Hygiène du sommeil : coucher et lever à heures régulières.',
      'Arrêter la caféine après 16h.',
      'Pratiquer 15 minutes d’exercice de respiration avant le coucher.',
      'Limiter les écrans une heure avant le sommeil.',
    ],
    treatments: [
      { name: 'Mélatonine', dosage: '2 mg', frequency: '1 comprimé 30 minutes avant le coucher', duration: '4 semaines' },
    ],
    exams: [],
    nextSteps: [
      'Tenir un agenda du sommeil pendant 2 semaines.',
      'Téléconsultation de suivi dans 4 semaines.',
    ],
    documents: [],
    generatedAt: '17:52',
  },
];
