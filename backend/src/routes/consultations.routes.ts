import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, newId, needOneOf, needString, requireAuth, route } from '../auth.js';
import { mapMessage, mapSummary, mapThread } from '../mappers.js';
import { notify } from '../services/notify.js';
import { generateAndStoreSummary } from '../services/summaryService.js';
import { nowTime } from '../services/time.js';
import { broadcastToThread } from '../realtime/chatHub.js';

const router = Router();

router.use(requireAuth);

// ---------------------------------------------------------------------------
// Chat threads & messages
// ---------------------------------------------------------------------------

const THREAD_SELECT = `
  SELECT t.*, d.first_name || ' ' || d.last_name AS doctor_name, d.specialty AS doctor_specialty,
         p.first_name || ' ' || p.last_name AS patient_name
  FROM chat_threads t
  JOIN doctors d ON d.id = t.doctor_id
  JOIN patients p ON p.id = t.patient_id`;

router.get('/threads', route(async (req, res) => {
  const user = req.user!;
  const where = user.role === 'patient' ? 'WHERE t.patient_id = $1' : 'WHERE t.doctor_id = $1';
  const id = user.role === 'patient' ? user.patientId : user.doctorId;
  const { rows } = await query(`${THREAD_SELECT} ${where} ORDER BY t.created_at DESC`, [id]);
  const out = [];
  for (const row of rows) {
    const messages = await query(`SELECT * FROM chat_messages WHERE thread_id = $1 ORDER BY seq`, [row.id]);
    out.push(mapThread({ ...row, messages: messages.rows.map(mapMessage) }));
  }
  res.json(out);
}));

async function loadThread(id: string, req: Express.Request) {
  const user = req.user!;
  const thread = await one(`${THREAD_SELECT} WHERE t.id = $1 ${user.role === 'patient' ? 'AND t.patient_id = $2' : 'AND t.doctor_id = $2'}`, [id, user.role === 'patient' ? user.patientId : user.doctorId]);
  if (!thread) throw new HttpError(404, 'Conversation introuvable');
  return thread;
}

router.get('/threads/:id', route(async (req, res) => {
  const thread = await loadThread(req.params.id, req);
  const messages = await query(`SELECT * FROM chat_messages WHERE thread_id = $1 ORDER BY seq`, [thread.id]);
  res.json(mapThread({ ...thread, messages: messages.rows.map(mapMessage) }));
}));

const MESSAGE_KINDS = ['text', 'image', 'document', 'audio', 'prescription', 'system'] as const;

/** POST /api/consultations/threads/:id/messages — sender is derived from the role. */
router.post('/threads/:id/messages', route(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const thread = await loadThread(req.params.id, req);
  if (thread.status === 'ended') throw new HttpError(422, 'Cette conversation est terminée');

  const sender = req.user!.role === 'patient' ? 'patient' : 'doctor';
  const kind = needOneOf(body, 'kind', MESSAGE_KINDS, { optional: true }) ?? 'text';
  const text = needString(body, 'text', { optional: true });
  const prescriptionId = needString(body, 'prescriptionId', { optional: true });
  if (kind === 'text' && !text) throw new HttpError(400, 'Un message texte ne peut pas être vide');
  if (kind === 'prescription' && !prescriptionId) throw new HttpError(400, 'prescriptionId requis pour partager une ordonnance');

  const seqRow = await one<{ seq: number }>(`SELECT COALESCE(MAX(seq), -1) + 1 AS seq FROM chat_messages WHERE thread_id = $1`, [thread.id]);
  const message = await one(
    `INSERT INTO chat_messages (id, thread_id, seq, sender, kind, text, media_label, media_size_kb, audio_duration, prescription_id, time)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      newId('cm'), thread.id, seqRow!.seq, sender, kind, text ?? null,
      needString(body, 'mediaLabel', { optional: true }) ?? null,
      body.mediaSizeKb !== undefined ? Number(body.mediaSizeKb) : null,
      needString(body, 'audioDuration', { optional: true }) ?? null,
      prescriptionId ?? null, nowTime(),
    ],
  );

  if (sender === 'doctor') {
    await notify({
      patientId: thread.patient_id,
      type: 'message',
      title: `Dr ${thread.doctor_name}`,
      body: text ?? (kind === 'prescription' ? 'Le médecin a partagé une ordonnance.' : 'Nouveau message du médecin.'),
      deepLink: `/consultation/chat/${thread.id}`,
    });
  }

  // Le message est stocké (ci-dessus) puis poussé en temps réel aux deux parties.
  await broadcastToThread(thread.patient_id, thread.doctor_id, 'chat:message', {
    threadId: thread.id,
    message: mapMessage(message!),
  });

  res.status(201).json(mapMessage(message!));
}));

router.post('/threads/:id/end', route(async (req, res) => {
  const thread = await loadThread(req.params.id, req);
  if (thread.status === 'ended') throw new HttpError(422, 'Cette conversation est déjà terminée');
  const endedAt = nowTime();
  await one(`UPDATE chat_threads SET status = 'ended', ended_at = $2 WHERE id = $1`, [thread.id, endedAt]);
  await broadcastToThread(thread.patient_id, thread.doctor_id, 'chat:thread-ended', { threadId: thread.id, endedAt });

  // Closing the conversation closes the consultation itself: the linked
  // appointment leaves the « à venir » lists (idempotent — a cancelled or
  // already completed appointment is left untouched).
  if (thread.appointment_id) {
    await one(
      `UPDATE appointments SET status = 'completed' WHERE id = $1 AND status IN ('confirmed', 'pending')`,
      [thread.appointment_id],
    );
  }

  // La clôture du fil déclenche la génération (unique) du compte-rendu IA à
  // partir de l'intégralité de l'échange : la requête répond immédiatement, le
  // résultat est poussé aux deux parties via `chat:summary` et notifié au
  // patient. Le bouton manuel reste disponible en repli (idempotent).
  if (thread.appointment_id) {
    void generateAndStoreSummary(thread.appointment_id).catch((err) =>
      console.warn('[summary] génération après clôture échouée :', err instanceof Error ? err.message : err),
    );
  }

  res.json({ ok: true, status: 'ended', endedAt });
}));

// ---------------------------------------------------------------------------
// Consultation summaries
// ---------------------------------------------------------------------------

const SUMMARY_SELECT = `SELECT * FROM consultation_summaries`;

router.get('/summaries', route(async (req, res) => {
  const user = req.user!;
  const { appointmentId } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (user.role === 'patient') { params.push(user.patientId); clauses.push(`patient_id = $${params.length}`); }
  else { params.push(user.doctorId); clauses.push(`doctor_id = $${params.length}`); }
  if (appointmentId) { params.push(appointmentId); clauses.push(`appointment_id = $${params.length}`); }
  const { rows } = await query(`${SUMMARY_SELECT} WHERE ${clauses.join(' AND ')} ORDER BY generated_at DESC`, params);
  // The AI diagnostic block is only mapped for physicians.
  res.json(rows.map((r) => mapSummary(r, { includeDiagnostic: user.role === 'doctor' })));
}));

router.get('/summaries/:id', route(async (req, res) => {
  const user = req.user!;
  const summary = await one(
    `${SUMMARY_SELECT} WHERE id = $1 AND ${user.role === 'patient' ? 'patient_id = $2' : 'doctor_id = $2'}`,
    [req.params.id, user.role === 'patient' ? user.patientId : user.doctorId],
  );
  if (!summary) throw new HttpError(404, 'Compte-rendu introuvable');
  res.json(mapSummary(summary, { includeDiagnostic: user.role === 'doctor' }));
}));

/**
 * POST /api/consultations/summaries {appointmentId}
 * Generates the post-consultation summary: the AI provider drafts the
 * patient-facing compte-rendu plus a doctor-only AI diagnostic (rule-based
 * template as fallback), then prescription + document + notification.
 * Doctor or patient may trigger it; a summary already produced (e.g.
 * automatically when the chat thread ended) is returned as-is — exactly one
 * summary per appointment. The diagnostic is only returned to the doctor.
 */
router.post('/summaries', route(async (req, res) => {
  const appointmentId = needString(req.body as Record<string, unknown>, 'appointmentId')!;
  const user = req.user!;
  const appt = await one(`SELECT * FROM appointments WHERE id = $1`, [appointmentId]);
  if (!appt) throw new HttpError(404, 'Rendez-vous introuvable');
  if (user.role === 'patient' && appt.patient_id !== user.patientId) throw new HttpError(403, 'Ce rendez-vous ne vous concerne pas');
  if (user.role === 'doctor' && appt.doctor_id !== user.doctorId) throw new HttpError(403, 'Ce rendez-vous ne vous concerne pas');

  // La consultation doit avoir eu lieu : rendez-vous clôturé par le médecin,
  // ou fil de messagerie terminé (la clôture du fil génère d'ailleurs déjà le
  // compte-rendu automatiquement).
  const thread = await one(`SELECT status FROM chat_threads WHERE appointment_id = $1`, [appointmentId]);
  if (appt.status !== 'completed' && thread?.status !== 'ended') {
    throw new HttpError(422, 'La consultation doit être terminée avant de générer le compte-rendu');
  }

  const { row, created } = await generateAndStoreSummary(appointmentId);
  res.status(created ? 201 : 200).json(mapSummary(row, { includeDiagnostic: user.role === 'doctor' }));
}));

export default router;
