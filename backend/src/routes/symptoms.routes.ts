import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, newId, requireAuth, requireRole, route } from '../auth.js';
import { mapSymptomPrep } from '../mappers.js';
import { notify } from '../services/notify.js';
import { analyzeSymptomsAi } from '../services/ai.js';
import { triage } from '../services/triage.js';
import type { SymptomPatientContext } from '../services/ai.js';

const router = Router();

router.use(requireAuth, requireRole('patient'));

/**
 * Patient-safe payload: orientation + priority, plus the AI-suggested
 * specialty when it matches the catalog — enough to point the patient at the
 * right doctors list, never the physician diagnostic itself.
 */
function patientPrep(row: Record<string, unknown>, specialties: Set<string>) {
  const base = mapSymptomPrep(row as Parameters<typeof mapSymptomPrep>[0]);
  const diagnostic = row.ai_diagnostic as { recommendedSpecialty?: unknown } | null;
  const suggested = typeof diagnostic?.recommendedSpecialty === 'string' ? diagnostic.recommendedSpecialty.trim() : '';
  return { ...base, ...(specialties.has(suggested) ? { suggestedSpecialty: suggested } : {}) };
}

async function specialtyCatalog(): Promise<Set<string>> {
  const { rows } = await query<{ name: string }>(`SELECT name FROM specialties`);
  return new Set(rows.map((r) => r.name));
}

/**
 * POST /api/symptoms/analyze
 * AI triage via Groq (orientation for the patient + clinical diagnostic stored
 * for the treating physician); falls back to the rule-based triage when the
 * AI is unavailable. The diagnostic never leaves this route for a patient.
 */
router.post('/analyze', route(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const symptoms = Array.isArray(body.symptoms) ? (body.symptoms as unknown[]).map(String).filter(Boolean) : [];
  if (symptoms.length === 0) throw new HttpError(400, 'Sélectionnez au moins un symptôme');
  const duration = String(body.duration ?? '');
  const intensity = String(body.intensity ?? 'modérée');
  const evolution = String(body.evolution ?? 'stable');
  const details = body.details ? String(body.details) : undefined;

  const patient = await one<SymptomPatientContext>(
    `SELECT EXTRACT(YEAR FROM AGE(birth_date))::int AS age, sex, conditions, allergies, treatments
     FROM patients WHERE id = $1`,
    [req.user!.patientId],
  );

  const input = { symptoms, duration, intensity, evolution, details };
  const ai = await analyzeSymptomsAi(input, patient ?? undefined);
  const fallback = ai ?? triage(input);
  const diagnostic = ai?.diagnostic ?? null;

  const created = await one(
    `INSERT INTO symptom_preps (id, patient_id, symptoms, duration, intensity, evolution, details, orientation, priority, ai_generated, ai_diagnostic)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      newId('prep'), req.user!.patientId, JSON.stringify(symptoms), duration, intensity, evolution, details ?? null,
      fallback.orientation, fallback.priority, Boolean(ai), diagnostic ? JSON.stringify(diagnostic) : null,
    ],
  );
  // Patient payload: orientation + priority + AI specialty suggestion — the
  // AI diagnostic itself is physician-only (GET /api/doctor/symptom-preps).
  res.status(201).json(patientPrep(created!, await specialtyCatalog()));
}));

router.get('/preps', route(async (req, res) => {
  const specialties = await specialtyCatalog();
  const { rows } = await query(`SELECT * FROM symptom_preps WHERE patient_id = $1 ORDER BY created_at DESC`, [req.user!.patientId]);
  res.json(rows.map((r) => patientPrep(r as Record<string, unknown>, specialties)));
}));

/** POST /api/symptoms/preps/:id/send — shares the prep with the care team. */
router.post('/preps/:id/send', route(async (req, res) => {
  const prep = await one(`UPDATE symptom_preps SET sent_to_doctor = true WHERE id = $1 AND patient_id = $2 RETURNING *`, [
    req.params.id, req.user!.patientId,
  ]);
  if (!prep) throw new HttpError(404, 'Préparation introuvable');
  await notify({
    patientId: req.user!.patientId!,
    type: 'appointment',
    title: 'Préparation envoyée',
    body: 'Votre description des symptômes a été transmise. Elle sera jointe automatiquement à votre prochaine consultation.',
    deepLink: '/symptoms',
  });
  res.json(mapSymptomPrep(prep));
}));

export default router;
