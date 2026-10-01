/**
 * Préparations symptômes IA du patient démo (p1) — ce que le médecin retrouve
 * dans son espace (avec le bloc diagnostic réservé au médecin). Les formes
 * reprennent exactement celles produites par le moteur de triage et Groq.
 */

export interface SeededSymptomPrep {
  id: string;
  patientId: string;
  symptoms: string[];
  duration: string;
  intensity: string;
  evolution: string;
  details?: string;
  orientation: string;
  priority: 'faible' | 'modérée' | 'élevée';
  aiGenerated: boolean;
  aiDiagnostic: {
    summary: string;
    possibleConditions: { name: string; likelihood: 'faible' | 'moyenne' | 'élevée' }[];
    redFlags: string[];
    recommendedSpecialty: string;
    questions: string[];
    urgencyNote: string;
  } | null;
  /** Timestamp ISO complet (colonne created_at TIMESTAMPTZ). */
  createdAt: string;
  sentToDoctor: boolean;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const symptomPreps: SeededSymptomPrep[] = [
  {
    id: 'sp1',
    patientId: 'p1',
    symptoms: ['Maux de tête', 'Fièvre', 'Courbatures', 'Frissons'],
    duration: '4 jours',
    intensity: 'modérée',
    evolution: 'aggravation',
    details:
      'Fièvre surtout le soir (38,4 °C ce matin). TDR paludisme effectué au laboratoire du quartier, résultat en attente.',
    orientation:
      'Vos symptômes justifient un avis médical sous 24 à 48 heures. Réservez une consultation (vidéo ou cabinet) avec un médecin généraliste ou un spécialiste adapté. Notez l’évolution de vos symptômes d’ici au rendez-vous.',
    priority: 'modérée',
    aiGenerated: true,
    aiDiagnostic: {
      summary:
        'Tableau évocateur d’un paludisme simple chez un adulte jeune en zone d’endémie : fièvre d’aggravation depuis 4 jours avec céphalées, courbatures et frissons, sans signe de gravité à ce stade. TDR en cours — à confirmer.',
      possibleConditions: [
        { name: 'Paludisme simple', likelihood: 'élevée' },
        { name: 'Infection virale respiratoire', likelihood: 'moyenne' },
        { name: 'Méningite', likelihood: 'faible' },
      ],
      redFlags: ['Raideur de la nuque', 'Vomissements persistants', 'Confusion ou somnolence', 'Convulsions'],
      recommendedSpecialty: 'Médecine générale',
      questions: [
        'Le TDR est-il revenu ? Quel était le résultat ?',
        'Avez-vous déjà pris un antipaludique ou du paracétamol ?',
        'Avez-vous des vomissements ou difficultés à boire ?',
        'Séjour récent en zone de forte transmission (Kribi, zones rurales) ?',
      ],
      urgencyNote:
        'Absence de signe de gravité actuellement. Réévaluer sous 24 h ; orienter en urgence si raideur de nuque, confusion ou vomissements persistants.',
    },
    createdAt: hoursAgo(3),
    sentToDoctor: true,
  },
  {
    id: 'sp2',
    patientId: 'p1',
    symptoms: ['Toux', 'Fatigue'],
    duration: '2 jours',
    intensity: 'légère',
    evolution: 'stable',
    details: 'Toux sèche nocturne, sans fièvre.',
    orientation:
      'Tableau peu inquiétant. Hydratez-vous, reposez-vous et surveillez l’évolution pendant 48 heures. Si les symptômes persistent ou s’aggravent, prenez rendez-vous. Un pharmacien peut aussi vous conseiller pour les symptômes courants.',
    priority: 'faible',
    aiGenerated: true,
    aiDiagnostic: {
      summary:
        'Toux sèche nocturne récente sans fièvre ni détresse respiratoire, probablement irritative ou post-virale débutante.',
      possibleConditions: [
        { name: 'Toux irritative post-virale', likelihood: 'élevée' },
        { name: 'Rhinopharyngite', likelihood: 'moyenne' },
        { name: 'Asthme léger', likelihood: 'faible' },
      ],
      redFlags: ['Essoufflement au repos', 'Fièvre élevée persistante', 'Expectorations sanglantes'],
      recommendedSpecialty: 'Médecine générale',
      questions: [
        'La toux empêche-t-elle le sommeil ?',
        'Antécédent d’asthme ou d’allergie ?',
        'Tabagisme ?',
        'Présence de fièvre associée ?',
      ],
      urgencyNote: 'Aucun signe de gravité. Réévaluation si persistance au-delà de 7 jours.',
    },
    createdAt: hoursAgo(26),
    sentToDoctor: false,
  },
  {
    id: 'sp3',
    patientId: 'p1',
    symptoms: ['Douleurs abdominales', 'Nausées'],
    duration: '1 jour',
    intensity: 'modérée',
    evolution: 'amélioration',
    orientation:
      'Vos symptômes justifient un avis médical sous 24 à 48 heures. Réservez une consultation (vidéo ou cabinet) avec un médecin généraliste ou un spécialiste adapté. Notez l’évolution de vos symptômes d’ici au rendez-vous.',
    priority: 'modérée',
    // Généré par le moteur local (repli sans clé Groq) : pas de bloc IA.
    aiGenerated: false,
    aiDiagnostic: null,
    createdAt: hoursAgo(120),
    sentToDoctor: true,
  },
];
