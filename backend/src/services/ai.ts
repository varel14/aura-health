import { asString, asStringArray, chatJson } from './aiClient.js';
import { isUrgent, URGENT_RESULT } from './triage.js';
import type { SummarySeed, SummaryTurn, TriageInput, TriageResult } from './triage.js';

// ---------------------------------------------------------------------------
// AI analytics (Groq ou GLM, voir services/aiClient.ts). Two flows:
//   1. symptom analysis  → patient-safe orientation + doctor-only diagnostic
//   2. consultation summary → patient-safe compte-rendu + doctor-only diagnostic
// The diagnostic block is stored but only ever mapped into doctor responses.
// Both functions resolve null when the AI provider is unavailable; the routes
// then fall back to the deterministic engine in triage.ts.
// ---------------------------------------------------------------------------

export interface AiDiagnostic {
  /** Clinical synthesis — physicians only. */
  summary: string;
  possibleConditions: { name: string; likelihood: 'faible' | 'moyenne' | 'élevée' }[];
  redFlags: string[];
  recommendedSpecialty: string;
  /** Anamnesis questions the doctor may want to ask. */
  questions: string[];
  urgencyNote: string;
}

export interface SymptomAnalysisAi {
  orientation: string;
  priority: TriageResult['priority'];
  diagnostic: AiDiagnostic | null;
}

const LIKELIHOODS = ['faible', 'moyenne', 'élevée'] as const;

function parseDiagnostic(raw: unknown): AiDiagnostic | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  const conditions = Array.isArray(d.possibleConditions)
    ? d.possibleConditions
        .map((c) => {
          const item = (c ?? {}) as Record<string, unknown>;
          const likelihood = String(item.likelihood ?? 'faible').toLowerCase();
          return {
            name: asString(item.name),
            likelihood: (LIKELIHOODS as readonly string[]).includes(likelihood)
              ? (likelihood as (typeof LIKELIHOODS)[number])
              : 'faible',
          };
        })
        .filter((c) => c.name)
        .slice(0, 5)
    : [];
  return {
    summary: asString(d.summary),
    possibleConditions: conditions,
    redFlags: asStringArray(d.redFlags, 5),
    recommendedSpecialty: asString(d.recommendedSpecialty),
    questions: asStringArray(d.questions, 6),
    urgencyNote: asString(d.urgencyNote),
  };
}

const PATIENT_CONTEXT = (patient?: SymptomPatientContext) =>
  patient
    ? [
        `Patient : ${patient.age ?? '?'} ans, ${patient.sex === 'F' ? 'femme' : patient.sex === 'M' ? 'homme' : 'sexe inconnu'}.`,
        patient.conditions?.length ? `Antécédents chroniques : ${patient.conditions.join(', ')}.` : '',
        patient.allergies?.length ? `Allergies connues : ${patient.allergies.join(', ')}.` : '',
        patient.treatments?.length ? `Traitements en cours : ${patient.treatments.join(', ')}.` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : 'Contexte patient inconnu.';

export interface SymptomPatientContext {
  age?: number;
  sex?: string;
  conditions?: string[];
  allergies?: string[];
  treatments?: string[];
}

const TRIAGE_SYSTEM = `Tu es l'assistant médical d'Aura Health, une application de santé au Cameroun. Tu réalises une analyse de symptômes déclarés par un patient pour l'orienter vers le bon niveau de soins.
Règles impératives :
- « orientation » : message en français destiné AU PATIENT, 2 à 4 phrases, ton chaleureux et rassurant. Il oriente vers un niveau de soins (urgences, consultation sous 24-48h, automédication prudente, pharmacien) mais ne doit JAMAIS citer de maladie, de diagnostic ou d'organe suspect.
- « priority » : « faible », « modérée » ou « élevée ».
- « diagnostic » : clé OBLIGATOIRE de la réponse JSON, strictement réservée AU MÉDECIN et donc TOUJOURS renseignée, même en cas d'urgence — c'est précisément là qu'elle est la plus utile : synthèse clinique professionnelle, hypothèses diagnostiques différenciées (dont la plus grave à éliminer), signes de gravité, spécialité recommandée, questions d'anamnèse à poser, conduite à tenir. L'application ne montre JAMAIS ce bloc au patient.
- En cas de signe d'alerte (douleur thoracique, dyspnée sévère, perte de connaissance, convulsions, saignement abondant, raideur de nuque avec fièvre), priority = « élevée » et l'orientation envoie aux urgences ou au 112.
- Contexte local : le paludisme est endémique — évoque le TDR/goutte épaisse dans les examens quand la fièvre est en jeu.
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{"orientation":"","priority":"","diagnostic":{"summary":"","possibleConditions":[{"name":"","likelihood":"faible|moyenne|élevée"}],"redFlags":[""],"recommendedSpecialty":"","questions":[""],"urgencyNote":""}}`;

/** Analyzes declared symptoms via Groq. Returns null when Groq is unavailable. */
export async function analyzeSymptomsAi(
  input: TriageInput,
  patient?: SymptomPatientContext,
): Promise<SymptomAnalysisAi | null> {
  const user = [
    PATIENT_CONTEXT(patient),
    '',
    `Symptômes déclarés : ${input.symptoms.join(', ')}.`,
    `Durée : ${input.duration || 'non précisée'}.`,
    `Intensité : ${input.intensity}.`,
    `Évolution : ${input.evolution}.`,
    input.details ? `Précisions du patient : ${input.details}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const raw = await chatJson<Record<string, unknown>>(TRIAGE_SYSTEM, user);
  if (!raw) return null;
  const priority = String(raw.priority ?? '').toLowerCase();
  let orientation = asString(raw.orientation);
  if (!orientation || !['faible', 'modérée', 'élevée'].includes(priority)) return null;
  // Deterministic safety net: a red-flag picture always yields the emergency
  // orientation, whatever the model answered.
  let resolvedPriority = priority as TriageResult['priority'];
  if (isUrgent(input) && resolvedPriority !== 'élevée') {
    resolvedPriority = 'élevée';
    orientation = URGENT_RESULT.orientation;
  }
  return {
    orientation,
    priority: resolvedPriority,
    diagnostic: parseDiagnostic(raw.diagnostic),
  };
}

// ---------------------------------------------------------------------------
// AI consultation summary
// ---------------------------------------------------------------------------

export interface SummaryDiagnostic {
  /** Principal diagnostic hypothesis — physicians only. */
  hypothesis: string;
  differentials: string[];
  severity: string;
  followUp: string;
}

export type SummaryGeneration = {
  summary: Record<string, unknown>;
  diagnostic: SummaryDiagnostic | null;
};

const SUMMARY_SYSTEM = `Tu es l'assistant de compte-rendu d'Aura Health. À partir des données d'une consultation terminée, tu rédiges le compte-rendu post-consultation.
Règles impératives :
- Les champs « observations », « importantInfo », « recommendations », « treatments », « exams », « nextSteps » sont destinés AU PATIENT : clairs, factuels, en français, sans poser de diagnostic ni citer d'hypothèse diagnostique (l'observation décrit la visite, les symptômes rapportés et la conduite adoptée).
- Quand une transcription de l'échange par messagerie est fournie, base tout le compte-rendu et le bloc « diagnostic » sur l'intégralité de cet échange : symptômes et précisions rapportés par le patient, questions et conseils du médecin, traitements décidés. Ne reinvente rien qui ne figure pas dans l'échange ou les données de la consultation.
- « treatments » : TOUJOURS renseigné pour une consultation qui justifie un traitement. Si l'échange ou les notes du médecin mentionnent un traitement, reprends-le tel quel. Sinon, quand l'état du patient justifie un soulagement symptomatique, propose un traitement symptomatique prudent et standard (ex. paracétamol pour fièvre ou douleurs), présenté comme à ajuster par le médecin. Ne laisse « treatments » vide QUE si aucun médicament n'est pertinent (ex. simple conseil de mode de vie).
- « exams » : examens complémentaires à envisager (le TDR paludisme / goutte épaisse en cas de fièvre, contexte camerounais).
- « diagnostic » : clé OBLIGATOIRE, strictement réservée AU MÉDECIN et TOUJOURS renseignée — hypothèse diagnostique principale, diagnostics différentiels, sévérité, suivi souhaité. L'application ne montre JAMAIS ce bloc au patient.
- Réponds UNIQUEMENT avec un objet JSON valide :
{"importantInfo":["..."],"observations":"...","recommendations":["..."],"treatments":[{"name":"","dosage":"","frequency":"","duration":"","form":"","quantity":""}],"exams":["..."],"nextSteps":["..."],"diagnostic":{"hypothesis":"","differentials":[""],"severity":"","followUp":""}}`;

/** Keeps the transcript within a bounded prompt: newest messages first to drop. */
const TRANSCRIPT_MAX_MESSAGES = 60;
const TRANSCRIPT_MAX_CHARS = 8_000;

const SENDER_LABEL: Record<SummaryTurn['sender'], string> = {
  patient: 'Patient',
  doctor: 'Médecin',
  system: 'Système',
};

function renderTranscript(turns: SummaryTurn[]): string {
  const kept = turns.filter((t) => t.text.trim().length > 0).slice(-TRANSCRIPT_MAX_MESSAGES);
  if (kept.length === 0) return '';
  let rendered = kept.map((t) => `${SENDER_LABEL[t.sender]} : ${t.text.trim()}`).join('\n');
  if (rendered.length > TRANSCRIPT_MAX_CHARS) rendered = `…\n${rendered.slice(-TRANSCRIPT_MAX_CHARS)}`;
  return rendered;
}

/** Generates the post-consultation summary via the AI provider. Null when unavailable. */
export async function generateSummaryAi(seed: SummarySeed): Promise<SummaryGeneration | null> {
  const transcript = renderTranscript(seed.transcript ?? []);
  const user = [
    `Consultation ${seed.consultationType === 'video' ? 'en téléconsultation' : seed.consultationType === 'chat' ? 'par messagerie' : 'au cabinet'} du ${seed.date}.`,
    `Patient : ${seed.patientAge} ans.`,
    `Motif : ${seed.motif}.`,
    seed.symptoms.length ? `Symptômes déclarés : ${seed.symptoms.join(', ')}.` : 'Aucun symptôme déclaré.',
    seed.notes ? `Notes du médecin : ${seed.notes}` : '',
    transcript ? `Transcription de l'échange :\n${transcript}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const raw = await chatJson<Record<string, unknown>>(SUMMARY_SYSTEM, user);
  if (!raw) return null;
  const observations = asString(raw.observations);
  if (!observations) return null;

  const treatments = Array.isArray(raw.treatments)
    ? raw.treatments
        .map((t) => {
          const item = (t ?? {}) as Record<string, unknown>;
          return {
            name: asString(item.name),
            dosage: asString(item.dosage),
            frequency: asString(item.frequency),
            duration: asString(item.duration),
            form: asString(item.form, 'comprimé'),
            quantity: asString(item.quantity, '1 boîte'),
          };
        })
        .filter((t) => t.name && t.dosage)
        .slice(0, 6)
    : [];

  let diagnostic: SummaryDiagnostic | null = null;
  const d = (raw.diagnostic ?? null) as Record<string, unknown> | null;
  if (d && typeof d === 'object') {
    diagnostic = {
      hypothesis: asString(d.hypothesis),
      differentials: asStringArray(d.differentials, 5),
      severity: asString(d.severity),
      followUp: asString(d.followUp),
    };
    if (!diagnostic.hypothesis) diagnostic = null;
  }

  const importantInfo = asStringArray(raw.importantInfo, 6);
  if (seed.notes) importantInfo.push(seed.notes);

  return {
    diagnostic,
    summary: {
      importantInfo,
      observations,
      recommendations: asStringArray(raw.recommendations, 8),
      treatments,
      exams: asStringArray(raw.exams, 6),
      nextSteps: asStringArray(raw.nextSteps, 6),
    },
  };
}
