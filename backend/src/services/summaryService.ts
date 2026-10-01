/**
 * Génération du compte-rendu de consultation.
 *
 * Deux déclencheurs partagent ce service : la clôture d'un fil de messagerie
 * (POST /api/consultations/threads/:id/end, en arrière-plan) et la génération
 * manuelle (POST /api/consultations/summaries). Le compte-rendu est fondé sur
 * les données du rendez-vous ET sur l'intégralité de l'échange par messagerie.
 * Un seul compte-rendu par rendez-vous : la ligne existante est renvoyée telle
 * quelle, et la contrainte UNIQUE(appointment_id) absorbe la course entre les
 * deux déclencheurs.
 */
import { HttpError, newId } from '../auth.js';
import { one, query } from '../db.js';
import { toDateOnly } from '../mappers.js';
import { broadcastToThread } from '../realtime/chatHub.js';
import { generateSummaryAi } from './ai.js';
import { notify } from './notify.js';
import { generateSummary, type SummarySeed, type SummaryTurn } from './triage.js';
import { todayISO } from './time.js';

const SUMMARY_SELECT = `SELECT * FROM consultation_summaries`;

export interface SummaryGenerationResult {
  /** Ligne `consultation_summaries` brute — le mapping rôle-dépendant (bloc
   * diagnostique réservé au médecin) reste à la charge des routes. */
  row: Record<string, unknown>;
  created: boolean;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

/** Texte du message tel que fourni aux générateurs : brut pour le texte,
 * placeholder pour les médias partagés (image, document…). */
function turnText(row: { kind: string; text: string | null; media_label: string | null }): string {
  if (row.kind === 'text' || row.kind === 'system') return row.text ?? '';
  return `(${row.kind}${row.media_label ? ` : ${row.media_label}` : ''})`;
}

/**
 * Génère et enregistre le compte-rendu d'un rendez-vous (une seule fois).
 * Résout toujours la ligne existante si un compte-rendu a déjà été produit.
 */
export async function generateAndStoreSummary(appointmentId: string): Promise<SummaryGenerationResult> {
  const existing = await one(`${SUMMARY_SELECT} WHERE appointment_id = $1`, [appointmentId]);
  if (existing) return { row: existing, created: false };

  const appt = await one(`SELECT * FROM appointments WHERE id = $1`, [appointmentId]);
  if (!appt) throw new HttpError(404, 'Rendez-vous introuvable');

  const doctor = await one(`SELECT * FROM doctors WHERE id = $1`, [appt.doctor_id]);
  const thread = await one(
    `SELECT * FROM chat_threads WHERE appointment_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [appointmentId],
  );

  // L'échange complet, du plus ancien au plus récent, alimente les générateurs.
  const transcript: SummaryTurn[] = [];
  if (thread) {
    const { rows } = await query<{ sender: SummaryTurn['sender']; kind: string; text: string | null; media_label: string | null }>(
      `SELECT * FROM chat_messages WHERE thread_id = $1 ORDER BY seq`,
      [thread.id],
    );
    for (const m of rows) {
      transcript.push({ sender: m.sender, text: turnText(m) });
    }
  }

  const seed: SummarySeed = {
    appointmentId: appt.id,
    patientName: appt.patient_name,
    patientAge: appt.patient_age,
    doctorId: appt.doctor_id,
    doctorName: doctor ? `Dr ${doctor.first_name} ${doctor.last_name}` : appt.establishment,
    doctorSpecialty: doctor?.specialty ?? '',
    consultationType: appt.type,
    date: toDateOnly(appt.date),
    motif: appt.motif,
    symptoms: (appt.symptoms as string[]) ?? [],
    notes: appt.notes ?? undefined,
    transcript,
  };

  const template = generateSummary(seed);
  const ai = await generateSummaryAi(seed);

  // L'IA rédige les champs destinés au patient quand elle est disponible ; le
  // bloc diagnostique (hypothèse, différentiels…) est stocké pour le médecin.
  const fields = ai
    ? ai.summary
    : {
        importantInfo: template.summary.importantInfo,
        observations: template.summary.observations,
        recommendations: template.summary.recommendations,
        treatments: template.summary.treatments,
        exams: template.summary.exams,
        nextSteps: template.summary.nextSteps,
      };
  const diagnostic = ai?.diagnostic ?? null;

  const treatments = fields.treatments as { name: string; dosage: string; frequency: string; duration: string; form?: string; quantity?: string }[];
  const prescription = treatments.length > 0
    ? {
        lines: treatments.map((t) => ({
          name: t.name,
          dosage: t.dosage,
          form: t.form ?? (t.name.toLowerCase().includes('sirop') ? 'sirop' : 'comprimé'),
          quantity: t.quantity ?? (t.form === 'sirop' ? '1 flacon' : '1 boîte de 20'),
          frequency: t.frequency,
          duration: t.duration,
        })),
        instructions: 'À prendre pendant les repas. Respectez les doses prescrites et la durée du traitement.',
      }
    : null;

  let prescriptionId: string | null = null;
  if (prescription) {
    prescriptionId = newId('rx');
    const code = `RX-${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 3);
    await one(
      `INSERT INTO prescriptions (id, code, patient_id, patient_name, doctor_id, doctor_name, doctor_specialty, establishment, date, expiry_date, status, source, lines, instructions, consultation_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active','aura',$11,$12,$13)`,
      [
        prescriptionId, code, appt.patient_id, appt.patient_name, appt.doctor_id, template.summary.doctorName as string,
        template.summary.doctorSpecialty as string, appt.establishment, todayISO(), toDateOnly(expiry),
        JSON.stringify(prescription.lines), prescription.instructions, appt.id,
      ],
    );
  }

  let inserted;
  try {
    inserted = await one(
      `INSERT INTO consultation_summaries (id, appointment_id, patient_id, doctor_id, doctor_name, doctor_specialty, consultation_type, date, motif,
                                            symptoms, important_info, observations, recommendations, treatments, exams, next_steps, documents, prescription_id, ai_generated, ai_diagnostic)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [
        template.id, appt.id, appt.patient_id, appt.doctor_id, template.summary.doctorName as string, template.summary.doctorSpecialty as string,
        appt.type, appt.date, appt.motif,
        JSON.stringify(template.summary.symptoms), JSON.stringify(fields.importantInfo), fields.observations,
        JSON.stringify(fields.recommendations), JSON.stringify(treatments), JSON.stringify(fields.exams),
        JSON.stringify(fields.nextSteps), JSON.stringify(template.summary.documents), prescriptionId,
        Boolean(ai), diagnostic ? JSON.stringify(diagnostic) : null,
      ],
    );
  } catch (err) {
    // Course avec l'autre déclencheur (clôture du fil + bouton manuel) : la
    // contrainte UNIQUE(appointment_id) garantit l'unicité — on renvoie la
    // ligne déjà générée au lieu d'échouer.
    if (isUniqueViolation(err)) {
      const raced = await one(`${SUMMARY_SELECT} WHERE appointment_id = $1`, [appointmentId]);
      if (raced) return { row: raced, created: false };
    }
    throw err;
  }

  await one(
    `INSERT INTO documents (id, patient_id, name, type, date, source, size_kb) VALUES ($1,$2,$3,$4,$5,'aura',$6)`,
    [newId('doc'), appt.patient_id, template.document.name, template.document.type, todayISO(), template.document.sizeKb],
  );

  await notify({
    patientId: appt.patient_id,
    type: 'summary',
    title: 'Compte-rendu disponible',
    body: `Votre compte-rendu de consultation est prêt${prescriptionId ? ', avec une ordonnance' : ''}.`,
    deepLink: `/consultation/summary/${template.id}`,
  });

  // Poussée temps réel aux deux parties : le payload ne porte que des
  // identifiants, chaque client relit le compte-rendu via l'API (qui applique
  // le filtrage rôle-dépendant du bloc diagnostique).
  await broadcastToThread(appt.patient_id, appt.doctor_id, 'chat:summary', {
    threadId: thread?.id ?? null,
    appointmentId: appt.id,
    summaryId: inserted!.id,
  });

  return { row: inserted!, created: true };
}
