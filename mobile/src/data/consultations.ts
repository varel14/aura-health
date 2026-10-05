import { ChatThread, ConsultationSummary } from '@/models/types';
import { todayISO } from '@/utils/format';

export const threads: ChatThread[] = [
  {
    // Fil unique du patient avec Dr Mbarga — chaque consultation chat avec le
    // même médecin continue ce fil. Historique étalé sur plusieurs jours
    // (début des symptômes → TDR positif ce matin), débouchant sur la
    // téléconsultation vidéo de 12h (appt1).
    id: 'th1',
    appointmentId: 'appt1',
    doctorId: 'd1',
    doctorName: 'Dr Vanessa Mbarga',
    doctorSpecialty: 'Médecine générale',
    status: 'active',
    messages: [
      // J-4 — début des symptômes, premiers conseils.
      { id: 'cm60', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Bonsoir Docteur 🙏 J’ai de fortes céphalées depuis trois jours, le paracétamol ne passe plus, et 37,9 °C ce soir.', time: '20:14' },
      { id: 'cm61', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'Bonsoir Stéphane. Prenez du paracétamol 500 mg toutes les 6 heures si fièvre, hydratez-vous bien et reposez-vous. Si la fièvre dépasse 38,5 °C ou persiste plus de 48 h, nous ferons une téléconsultation.', time: '20:31' },
      { id: 'cm62', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Merci Docteur. J’ai aussi des courbatures et des frissons depuis hier soir, surtout la nuit.', time: '20:36' },
      { id: 'cm63', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'Cela ressemble à un syndrome grippal, mais vu votre antécédent de paludisme il faudra l’éliminer. Notez votre température matin et soir, elle me servira.', time: '20:44' },
      // J-3 — la fièvre persiste, orientation vers le laboratoire.
      { id: 'cm64', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Bonjour Docteur. 38,2 °C ce matin et les maux de tête persistent. J’ai très mal dormi à cause des frissons.', time: '07:52' },
      { id: 'cm65', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'Bonjour Stéphane. Ce tableau justifie un test rapide : passez au laboratoire faire un TDR paludisme et une NFS dès aujourd’hui, puis envoyez-moi les résultats ici.', time: '08:05' },
      { id: 'cm66', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Bien reçu Docteur. Je passe au labo du quartier vers 10 h.', time: '08:09' },
      { id: 'cm67', threadId: 'th1', sender: 'doctor', kind: 'audio', audioDuration: '0:14', text: '', time: '08:12' },
      { id: 'cm68', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Message reçu, merci beaucoup Docteur 🙏', time: '08:15' },
      // J-2 — attente des résultats, surveillance de la fièvre.
      { id: 'cm69', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Docteur, le laboratoire était complet ce matin, j’ai rendez-vous demain 8 h pour les prélèvements.', time: '11:20' },
      { id: 'cm70', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'D’accord. En attendant, continuez le paracétamol si besoin, buvez au moins 2 litres d’eau par jour et reposez-vous.', time: '11:47' },
      { id: 'cm71', threadId: 'th1', sender: 'patient', kind: 'text', text: 'La fièvre a monté à 38,6 °C cette nuit mais elle redescend avec le paracétamol.', time: '21:05' },
      { id: 'cm72', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'C’est bon à savoir. Si elle dépasse 39 °C, ou en cas de vomissements persistants, de vertiges inhabituels ou de confusion, rendez-vous immédiatement aux urgences.', time: '21:22' },
      { id: 'cm73', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Compris Docteur. Bonne nuit.', time: '21:24' },
      // J-1 — prélèvements faits, préparation de la téléconsultation.
      { id: 'cm74', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Bonjour Docteur, prélèvements faits ce matin au labo, le résultat est attendu dans la journée.', time: '09:02' },
      { id: 'cm75', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'Parfait. Envoyez-moi le TDR dès réception ; nous ferons le point ensemble et je vous prescrirai le traitement complet si besoin.', time: '09:20' },
      { id: 'cm76', threadId: 'th1', sender: 'patient', kind: 'text', text: 'D’accord. Les céphalées sont toujours là, surtout en fin de journée.', time: '09:24' },
      { id: 'cm77', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'Je vois. Continuez à noter vos températures, cela m’aidera pendant la consultation. Je vous propose une téléconsultation dès que nous avons le résultat.', time: '09:31' },
      // Aujourd’hui — TDR positif, confirmation du rendez-vous vidéo de 12h.
      { id: 'cm78', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Bonjour Docteur 🙏 Le TDR est revenu : positif au paludisme simple (Plasmodium falciparum). La NFS est quasiment normale.', time: '08:12' },
      { id: 'cm79', threadId: 'th1', sender: 'patient', kind: 'image', mediaLabel: 'TDR — laboratoire de Nlongkak', mediaSizeKb: 320, text: '', time: '08:13' },
      { id: 'cm80', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'Merci Stéphane, c’est bien noté. Cela confirme un paludisme simple, sans signe de gravité d’après ce que vous décrivez. Je vous prescrirai le traitement complet pendant notre consultation.', time: '08:26' },
      { id: 'cm81', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Très bien. On garde notre consultation vidéo de 12 h ?', time: '08:29' },
      { id: 'cm82', threadId: 'th1', sender: 'doctor', kind: 'text', text: 'Oui, je vous retrouve à 12 h en vidéo. Préparez votre carnet de température et vos questions ; l’ordonnance sera dans votre dossier juste après.', time: '08:35' },
      { id: 'cm83', threadId: 'th1', sender: 'patient', kind: 'text', text: 'Parfait Docteur, à tout à l’heure 🙏', time: '08:37' },
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
