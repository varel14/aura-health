import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, requireAuth, requireRole, route } from '../auth.js';
import { mapNotification } from '../mappers.js';

const router = Router();

router.use(requireAuth, requireRole('patient'));

router.get('/', route(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM notifications WHERE patient_id = $1 ORDER BY created_at DESC`,
    [req.user!.patientId],
  );
  res.json(rows.map(mapNotification));
}));

router.get('/unread-count', route(async (req, res) => {
  const row = await one<{ count: string }>(`SELECT COUNT(*) AS count FROM notifications WHERE patient_id = $1 AND read = false`, [req.user!.patientId]);
  res.json({ count: Number(row!.count) });
}));

router.post('/read-all', route(async (req, res) => {
  await one(`UPDATE notifications SET read = true WHERE patient_id = $1`, [req.user!.patientId]);
  res.json({ ok: true });
}));

router.post('/:id/read', route(async (req, res) => {
  const updated = await one(
    `UPDATE notifications SET read = true WHERE id = $1 AND patient_id = $2 RETURNING *`,
    [req.params.id, req.user!.patientId],
  );
  if (!updated) throw new HttpError(404, 'Notification introuvable');
  res.json(mapNotification(updated));
}));

export default router;
