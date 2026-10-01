import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { HttpError } from './auth.js';
import { newId, route } from './auth.js';
import { one } from './db.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import patientRoutes from './routes/patient.routes.js';
import appointmentRoutes from './routes/appointments.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import consultationRoutes from './routes/consultations.routes.js';
import prescriptionRoutes from './routes/prescriptions.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import symptomRoutes from './routes/symptoms.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import pharmacistRoutes from './routes/pharmacist.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
app.use(cors());
// Une API JSON ne doit jamais être mise en cache par le navigateur (les 401
// d'une session expirée seraient rejoués pour la suivante).
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'aura-health-api', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/doctor', doctorRoutes);
// Professional workspaces: pharmacy order management & deliveries.
app.use('/api/pharmacist', pharmacistRoutes);
app.use('/api/delivery', deliveryRoutes);
// Admin workspace: doctor activation + establishment info.
app.use('/api/admin', adminRoutes);

/** POST /api/professionals/apply — public form for hospitals/pharmacies to join. */
app.post('/api/professionals/apply', route(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const required = ['type', 'name', 'phone', 'email', 'city', 'address', 'manager'] as const;
  for (const key of required) {
    if (!String(b[key] ?? '').trim()) throw new HttpError(400, `Champ requis manquant : ${key}`);
  }
  const type = String(b.type);
  if (!['hospital', 'pharmacy'].includes(type)) throw new HttpError(400, 'type doit valoir « hospital » ou « pharmacy »');
  const created = await one(
    `INSERT INTO professional_applications (id, type, name, phone, email, city, address, manager, documents)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, created_at`,
    [
      newId('app'), type, String(b.name), String(b.phone), String(b.email), String(b.city), String(b.address), String(b.manager),
      JSON.stringify(Array.isArray(b.documents) ? b.documents.map(String) : []),
    ],
  );
  res.status(201).json({
    ok: true,
    id: created!.id,
    receivedAt: created!.created_at,
    message: 'Votre candidature a été reçue. Notre équipe vous contactera sous 48 heures ouvrées.',
  });
}));

// 404 for unknown API routes
app.use('/api', (_req: Request, res: Response) => res.status(404).json({ error: 'Route introuvable' }));

// Central error handler — every thrown HttpError lands here.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  const message = err instanceof Error ? err.message : 'Erreur interne';
  if (!/import|syntax/i.test(message)) console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erreur interne du serveur', detail: message });
});

export default app;
