import { newId } from '../auth.js';
import { todayISO, addMonths, nowTime } from './time.js';

// ---------------------------------------------------------------------------
// Symptom triage — rule-based orientation (guidance, not a diagnosis)
// ---------------------------------------------------------------------------

const RED_FLAGS = ['Douleur thoracique', 'Difficulté à respirer', 'Perte de connaissance', 'Convulsions', 'Saignement important'];

export interface TriageInput {
  symptoms: string[];
  duration: string;
  intensity: string;
  evolution: string;
  details?: string;
}

export interface TriageResult {
  orientation: string;
  priority: 'faible' | 'modérée' | 'élevée';
}

/** Red flags / severe intensity always map to the emergency orientation,
 * regardless of what the AI returns — safety is not delegated to the LLM. */
export function isUrgent(input: TriageInput): boolean {
  const hasRedFlag = input.symptoms.some((s) => RED_FLAGS.some((f) => s.toLowerCase().includes(f.toLowerCase())));
  return hasRedFlag || input.intensity === 'sévère';
}

export const URGENT_RESULT: TriageResult = {
  priority: 'élevée',
  orientation:
    'Signes possiblement graves. Rendez-vous immédiatement aux urgences les plus proches ou contactez le 112. En attendant, restez au repos et faites-vous accompagner.',
};

export function triage(input: TriageInput): TriageResult {
  if (isUrgent(input)) return URGENT_RESULT;
  if (input.intensity === 'modérée' || /semaine|mois/i.test(input.duration) || input.evolution === 'aggravation') {
    return {
      priority: 'modérée',
      orientation:
        'Vos symptômes justifient un avis médical sous 24 à 48 heures. Réservez une consultation (vidéo ou cabinet) avec un médecin généraliste ou un spécialiste adapté. Notez l’évolution de vos symptômes d’ici au rendez-vous.',
    };
  }
  return {
    priority: 'faible',
    orientation:
      'Tableau peu inquiétant. Hydratez-vous, reposez-vous et surveillez l’évolution pendant 48 heures. Si les symptômes persistent ou s’aggravent, prenez rendez-vous. Un pharmacien peut aussi vous conseiller pour les symptômes courants.',
  };
}

// ---------------------------------------------------------------------------
// Consultation summary generation — deterministic template from the visit data
// ---------------------------------------------------------------------------

/** One turn of the chat exchange, as fed to the summary generators. */
export interface SummaryTurn {
  sender: 'patient' | 'doctor' | 'system';
  /** Message text, or a composed placeholder for media kinds (`(image : radio.png)`). */
  text: string;
}

export interface SummarySeed {
  appointmentId: string;
  patientName: string;
  patientAge: number;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  consultationType: string;
  date: string;
  motif: string;
  symptoms: string[];
  notes?: string;
  /** Full chat exchange for messaging consultations, oldest first. */
  transcript?: SummaryTurn[];
}

export interface GeneratedSummary {
  id: string;
  summary: Record<string, unknown>;
  prescription: {
    lines: { name: string; dosage: string; form: string; quantity: string; frequency: string; duration: string; instructions?: string }[];
    instructions: string;
  } | null;
  document: { name: string; type: string; sizeKb: number };
}

const hasSymptom = (symptoms: string[], ...keys: string[]) =>
  symptoms.some((s) => keys.some((k) => s.toLowerCase().includes(k.toLowerCase())));

export function generateSummary(seed: SummarySeed): GeneratedSummary {
  const id = newId('sum');
  const fever = hasSymptom(seed.symptoms, 'fièvre', 'frisson');
  const pain = hasSymptom(seed.symptoms, 'douleur', 'céphalée', 'maux de tête');
  const cough = hasSymptom(seed.symptoms, 'toux');

  const importantInfo: string[] = [];
  if (fever) importantInfo.push('Fièvre rapportée — surveiller la température matin et soir.');
  if (pain) importantInfo.push('Douleur signalée par le patient pendant l’anamnèse.');
  if (seed.symptoms.length === 0) importantInfo.push('Aucun symptôme majeur déclaré lors de la consultation.');
  if (seed.notes) importantInfo.push(seed.notes);

  const observations =
    `Patient de ${seed.patientAge} ans vu en consultation ${seed.consultationType === 'video' ? 'téléconsultation' : seed.consultationType === 'chat' ? 'messagerie' : 'au cabinet'} ` +
    `pour : ${seed.motif}. ` +
    (seed.symptoms.length > 0
      ? `Symptômes déclarés : ${seed.symptoms.join(', ').toLowerCase()}. `
      : '') +
    (seed.transcript && seed.transcript.length > 0
      ? `Échange par messagerie : ${seed.transcript.length} messages. `
      : '') +
    `Examen clinique sans signe de gravité immédiate. Diagnostic probabiliste posé, traitement symptomatique débuté.`;

  const recommendations = [
    'Repos pendant 48 à 72 heures.',
    'Hydratation abondante (au moins 1,5 L d’eau par jour).',
    ...(fever ? ['Surveillance de la température : consulter si elle dépasse 39 °C ou persiste plus de 3 jours.'] : []),
    ...(cough ? ['Éviter les irritants (fumée, poussière) ; tisanes et miel peuvent apaiser la toux.'] : []),
    'En cas d’aggravation, recontactez votre médecin ou rendez-vous aux urgences.',
  ];

  const treatments: { name: string; dosage: string; frequency: string; duration: string }[] = [];
  if (fever || pain) treatments.push({ name: 'Paracétamol', dosage: '500 mg', frequency: '1 comprimé toutes les 6 h si besoin', duration: '5 jours' });
  if (cough) treatments.push({ name: 'Sirop antitussif', dosage: '15 ml', frequency: '3 fois par jour', duration: '5 jours' });

  const exams: string[] = [];
  if (fever) exams.push('TDR paludisme (goutte épaisse) — recommandé en zone endémique');
  if (pain && !fever) exams.push('Bilan inflammatoire (NFS, CRP) si persistance au-delà de 7 jours');

  const nextSteps = [
    'Reprise du travail / des activités après amélioration des symptômes.',
    'Consultation de suivi si les symptômes persistent à 7 jours.',
    'Rendez-vous disponible directement depuis l’application Aura Health.',
  ];

  const prescription =
    treatments.length > 0
      ? {
          lines: treatments.map((t) => ({
            name: t.name,
            dosage: t.dosage,
            form: t.name.includes('Sirop') ? 'sirop' : 'comprimé',
            quantity: t.name.includes('Sirop') ? '1 flacon' : '1 boîte de 20',
            frequency: t.frequency,
            duration: t.duration,
          })),
          instructions: 'À prendre pendant les repas. Respectez les doses prescrites et la durée du traitement.',
        }
      : null;

  return {
    id,
    summary: {
      id,
      appointmentId: seed.appointmentId,
      doctorId: seed.doctorId,
      doctorName: seed.doctorName,
      doctorSpecialty: seed.doctorSpecialty,
      consultationType: seed.consultationType,
      date: seed.date,
      motif: seed.motif,
      symptoms: seed.symptoms,
      importantInfo,
      observations,
      recommendations,
      treatments,
      exams,
      nextSteps,
      documents: [{ name: 'Compte-rendu de consultation', type: 'compte-rendu' }],
      generatedAt: new Date().toISOString(),
    },
    prescription,
    document: { name: 'Compte-rendu de consultation', type: 'compte-rendu', sizeKb: 180 },
  };
}

// ---------------------------------------------------------------------------
// Prescription helpers
// ---------------------------------------------------------------------------

export function newPrescriptionCode(): string {
  return `RX-${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
}

export function expiryFor(dateISO: string): string {
  return addMonths(dateISO, 3);
}

export function statusFor(dateISO: string, expiryISO: string): 'active' | 'expired' {
  const today = todayISO();
  return dateISO <= today && today <= expiryISO ? 'active' : today > expiryISO ? 'expired' : 'active';
}

export { todayISO, nowTime };
