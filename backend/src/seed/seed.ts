/**
 * Seeds the database from the mobile app's mock data (same source of truth),
 * plus demo auth accounts. Assumes the schema was just applied by reset.ts.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { config } from '../config.js';
import { hashPin, newId } from '../auth.js';

import {
  specialties,
  doctors,
  hospitals,
  pharmacies,
  medications,
  patient,
  allergies,
  conditions,
  treatments,
  vaccines,
  examResults,
  medicalDocuments,
  appointments,
  prescriptions,
  threads,
  summaries,
  payments,
  ordersSeed,
  notifications,
  doctorPatients,
  symptomPreps,
} from './mock/index.js';

const j = (value: unknown) => JSON.stringify(value ?? null);

const DEMO_DOCTOR_ID = 'd1'; // Dr Vanessa Mbarga — the doctor demo account

export async function seedDatabase(pool: Pool) {
  const q = (sql: string, params: unknown[] = []) => pool.query(sql, params);

  // -- Catalog ---------------------------------------------------------------
  for (const s of specialties) await q(`INSERT INTO specialties (id, name, icon) VALUES ($1,$2,$3)`, [s.id, s.name, s.icon]);

  for (const h of hospitals)
    await q(
      `INSERT INTO hospitals (id, name, type, city, district, address, phone, email, description, specialties, services, hours, rating, emergency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [h.id, h.name, h.type, h.city, h.district, h.address, h.phone, h.email, h.description, j(h.specialties), j(h.services), h.hours, h.rating, h.emergency],
    );

  for (const d of doctors)
    await q(
      `INSERT INTO doctors (id, first_name, last_name, specialty, hospital_id, experience_years, languages, rating, reviews_count,
                            fee, video_fee, chat_fee, video_available, chat_available, in_person_available, bio, status, working_days, slot_times,
                            activation_status, activated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'active',now())`,
      [
        d.id, d.firstName, d.lastName, d.specialty, d.hospitalId, d.experienceYears, j(d.languages), d.rating, d.reviewsCount,
        d.fee, d.videoFee ?? null, d.chatFee ?? null, d.videoAvailable, d.chatAvailable, d.inPersonAvailable, d.bio, d.status, j(d.workingDays), j(d.slotTimes),
      ],
    );

  for (const p of pharmacies)
    await q(
      `INSERT INTO pharmacies (id, name, city, district, address, phone, hours, rating, on_duty, delivery_available, pickup_available, services, medication_ids, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [p.id, p.name, p.city, p.district, p.address, p.phone, p.hours, p.rating, p.onDuty, p.deliveryAvailable, p.pickupAvailable, j(p.services), j(p.medicationIds), p.latitude, p.longitude],
    );

  for (const m of medications)
    await q(
      `INSERT INTO medications (id, name, form, dosage, lab, category, description, requires_prescription, unit_price, pharmacy_ids)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [m.id, m.name, m.form, m.dosage, m.lab, m.category, m.description, m.requiresPrescription, m.unitPrice, j(m.pharmacyIds)],
    );

  // -- Per-pharmacy stock (pharmacist inventory) ------------------------------
  // ph1 (the demo pharmacy) gets curated levels, including low-stock and
  // out-of-stock references; other pharmacies get stable pseudo-random levels.
  const LOW_STOCK_THRESHOLD = 5;
  const curatedStock: Record<string, number> = {
    m1: 48, m2: 22, m3: 30, m4: 12, m5: 3, m6: 0, m7: 40, m8: 15, m9: 26, m10: 8, m11: 60, m12: 4,
  };
  for (const p of pharmacies) {
    for (let i = 0; i < p.medicationIds.length; i++) {
      const medId = p.medicationIds[i];
      const stock = p.id === 'ph1' ? (curatedStock[medId] ?? 10) : ((i * 13 + p.id.charCodeAt(2) * 7) % 32) + 6;
      await q(
        `INSERT INTO pharmacy_medications (pharmacy_id, medication_id, stock, low_stock_threshold) VALUES ($1,$2,$3,$4)`,
        [p.id, medId, stock, LOW_STOCK_THRESHOLD],
      );
    }
  }

  // -- Demo patient + medical record ----------------------------------------
  await q(
    `INSERT INTO patients (id, first_name, last_name, email, phone, sex, birth_date, city, address, blood_type, height_cm, weight_kg,
                           emergency_contact, allergies, conditions, treatments, vaccines, exam_results)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      patient.id, patient.firstName, patient.lastName, patient.email, patient.phone, patient.sex, patient.birthDate, patient.city,
      patient.address ?? null, patient.bloodType ?? null, patient.heightCm ?? null, patient.weightKg ?? null,
      j(patient.emergencyContact ?? null), j(allergies), j(conditions), j(treatments), j(vaccines), j(examResults),
    ],
  );

  for (const doc of medicalDocuments)
    await q(`INSERT INTO documents (id, patient_id, name, type, date, source, size_kb, deep_link) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [
      doc.id, patient.id, doc.name, doc.type, doc.date, doc.source, doc.sizeKb, doc.deepLink ?? null,
    ]);

  // -- Doctor-side patient files (all belong to the demo doctor) -------------
  // The dp* files also become real patient rows: appointments and symptom
  // preps reference them (FK) without touching the demo patient's own list.
  for (const file of doctorPatients) {
    if (file.id === patient.id) continue;
    const birthYear = new Date().getFullYear() - file.age;
    await q(
      `INSERT INTO patients (id, first_name, last_name, email, phone, sex, birth_date, city, blood_type, height_cm, weight_kg, allergies, conditions, treatments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        file.id, file.firstName, file.lastName, `${file.firstName}.${file.lastName}@aura.cm`.toLowerCase(), file.phone,
        file.sex, `${birthYear}-06-15`, file.city ?? '', file.bloodType ?? null, file.heightCm ?? null, file.weightKg ?? null,
        j(file.allergies), j(file.conditions), j(file.treatments),
      ],
    );
  }
  for (const file of doctorPatients)
    await q(`INSERT INTO doctor_patients (id, doctor_id, file) VALUES ($1,$2,$3)`, [file.id, DEMO_DOCTOR_ID, j({ ...file, id: undefined })]);

  // -- Symptom preps of the demo patient (doctor-side AI review feed) --------
  for (const sp of symptomPreps)
    await q(
      `INSERT INTO symptom_preps (id, patient_id, symptoms, duration, intensity, evolution, details, orientation, priority,
                                  ai_generated, ai_diagnostic, created_at, sent_to_doctor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        sp.id, sp.patientId, j(sp.symptoms), sp.duration, sp.intensity, sp.evolution, sp.details ?? null,
        sp.orientation, sp.priority, sp.aiGenerated, sp.aiDiagnostic ? j(sp.aiDiagnostic) : null, sp.createdAt, sp.sentToDoctor,
      ],
    );

  // -- Patient-side records ---------------------------------------------------
  for (const a of appointments)
    await q(
      `INSERT INTO appointments (id, doctor_id, patient_id, patient_name, patient_age, type, status, date, time, motif, symptoms, fee, establishment, paid, payment_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [a.id, a.doctorId, a.patientId, a.patientName, a.patientAge, a.type, a.status, a.date, a.time, a.motif, j(a.symptoms), a.fee, a.establishment, a.paid, a.paymentId ?? null, a.notes ?? null],
    );

  for (const p of prescriptions)
    await q(
      `INSERT INTO prescriptions (id, code, patient_id, patient_name, doctor_id, doctor_name, doctor_specialty, establishment, date, expiry_date, status, source, lines, instructions, consultation_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [p.id, p.code, p.patientId, p.patientName, p.doctorId || null, p.doctorName, p.doctorSpecialty, p.establishment, p.date, p.expiryDate, p.status, p.source, j(p.lines), p.instructions ?? null, p.consultationId ?? null],
    );

  for (const pay of payments)
    await q(
      `INSERT INTO payments (id, patient_id, reference, label, category, amount, status, method, date, time, related_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [pay.id, patient.id, pay.reference, pay.label, pay.category, pay.amount, pay.status, pay.method, pay.date, pay.time, pay.relatedId ?? null],
    );

  // -- Pharmacy & delivery demo accounts --------------------------------------
  // Couriers must exist before seed orders reference them (orders.courier_id).
  const couriersSeed = [
    { id: 'c1', firstName: 'Alain', lastName: 'Manga', phone: '+237 655 40 12 88', city: 'Yaoundé', vehicle: 'moto', pharmacyId: 'ph1' },
    { id: 'c2', firstName: 'Brice', lastName: 'Nkotto', phone: '+237 655 77 31 02', city: 'Yaoundé', vehicle: 'voiture', pharmacyId: 'ph1' },
  ];
  for (const c of couriersSeed)
    await q(`INSERT INTO couriers (id, first_name, last_name, phone, city, vehicle, pharmacy_id, active) VALUES ($1,$2,$3,$4,$5,$6,$7,true)`, [
      c.id, c.firstName, c.lastName, c.phone, c.city, c.vehicle, c.pharmacyId,
    ]);

  for (const o of ordersSeed as Array<Record<string, any>>) {
    // Paid seed orders get a matching payment row so the pharmacist's
    // validate gate (payment required) reflects reality.
    if (o.paid) {
      await q(
        `INSERT INTO payments (id, patient_id, reference, label, category, amount, status, method, date, time, related_id)
         VALUES ($1,$2,$3,$4,'order',$5,'paid','mtn_momo',$6,$7,$8)`,
        [`pay_${o.id}`, patient.id, `AUR-PAY-${String(o.id).toUpperCase()}`, `Commande pharmacie — ${o.pharmacyName}`, o.total, o.date, o.time, o.id],
      );
    }
    const ts = `${o.date}T${o.time}:00`;
    const validated = ['confirmée', 'prête', 'en livraison', 'livrée'].includes(o.status);
    const prepared = ['prête', 'en livraison', 'livrée'].includes(o.status);
    await q(
      `INSERT INTO orders (id, patient_id, pharmacy_id, pharmacy_name, items, mode, address, total, status, prescription_id, payment_id,
                           handover_code_hash, courier_id, validated_at, prepared_at, assigned_at, date, time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        o.id, patient.id, o.pharmacyId, o.pharmacyName, j(o.items), o.mode, o.address ?? null, o.total, o.status,
        o.prescriptionId ?? null, o.paid ? `pay_${o.id}` : (o.paymentId ?? null),
        o.handoverCode ? hashPin(o.handoverCode) : null,
        o.courierId ?? null,
        validated ? ts : null, prepared ? ts : null, o.courierId ? ts : null,
        o.date, o.time,
      ],
    );
  }

  // -- Order progression timelines (order_events) ------------------------------
  // Replays the canonical lifecycle up to each order's current status so the
  // pharmacy workspace shows a realistic "suivi de commande" out of the box.
  const courierNames: Record<string, string> = { c1: 'Alain Manga', c2: 'Brice Nkotto' };
  const eventSteps: Record<string, [string, string, string][]> = {
    delivery: [
      ['en attente', 'Commande créée', 'patient'],
      ['confirmée', 'Commande validée', 'pharmacist'],
      ['prête', 'Commande prête', 'pharmacist'],
      ['en livraison', 'Colis pris en charge', 'delivery'],
      ['livrée', 'Commande livrée', 'delivery'],
    ],
    pickup: [
      ['en attente', 'Commande créée', 'patient'],
      ['confirmée', 'Commande validée', 'pharmacist'],
      ['prête', 'Commande prête au retrait', 'pharmacist'],
      ['livrée', 'Commande remise au client', 'pharmacist'],
    ],
  };
  const minutesPerStep: Record<string, number> = { 'en attente': 0, 'confirmée': 12, 'prête': 25, 'en livraison': 40, 'livrée': 55 };
  for (const o of ordersSeed as Array<Record<string, any>>) {
    if (o.status === 'annulée') continue;
    const steps = eventSteps[o.mode] ?? eventSteps.delivery;
    const endIdx = steps.findIndex(([status]) => status === o.status);
    const base = new Date(`${o.date}T${o.time}:00`).getTime();
    let seq = 0;
    for (const [status, label, actor] of endIdx >= 0 ? steps.slice(0, endIdx + 1) : steps) {
      await q(
        `INSERT INTO order_events (id, order_id, status, label, actor, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
        [newId('evt'), o.id, status, label, actor, new Date(base + minutesPerStep[status] * 60000 + seq++ * 1000)],
      );
      if (status === 'prête' && o.courierId) {
        await q(
          `INSERT INTO order_events (id, order_id, status, label, actor, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
          [newId('evt'), o.id, status, `Livreur affecté : ${courierNames[o.courierId] ?? o.courierId}`, 'pharmacist', new Date(base + minutesPerStep[status] * 60000 + seq++ * 1000)],
        );
      }
    }
  }

  for (const n of notifications)
    await q(
      `INSERT INTO notifications (id, patient_id, type, title, body, date, time, read, deep_link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [n.id, patient.id, n.type, n.title, n.body, n.date, n.time, n.read, n.deepLink],
    );

  // -- Chat threads + messages ------------------------------------------------
  for (const t of threads) {
    await q(
      `INSERT INTO chat_threads (id, appointment_id, doctor_id, patient_id, status, ended_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [t.id, t.appointmentId ?? null, t.doctorId, t.patientId ?? patient.id, t.status, t.endedAt ?? null],
    );
    for (let i = 0; i < t.messages.length; i++) {
      const m = t.messages[i];
      await q(
        `INSERT INTO chat_messages (id, thread_id, seq, sender, kind, text, media_label, media_size_kb, audio_duration, prescription_id, time)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [m.id, t.id, i, m.sender, m.kind, m.text ?? null, m.mediaLabel ?? null, m.mediaSizeKb ?? null, m.audioDuration ?? null, m.prescriptionId ?? null, m.time],
      );
    }
  }

  for (const s of summaries)
    await q(
      `INSERT INTO consultation_summaries (id, appointment_id, patient_id, doctor_id, doctor_name, doctor_specialty, consultation_type, date, motif,
                                           symptoms, important_info, observations, recommendations, treatments, exams, next_steps, documents, prescription_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        s.id, s.appointmentId, patient.id, s.doctorId, s.doctorName, s.doctorSpecialty, s.consultationType, s.date, s.motif,
        j(s.symptoms), j(s.importantInfo), s.observations, j(s.recommendations), j(s.treatments), j(s.exams), j(s.nextSteps), j(s.documents), s.prescriptionId ?? null,
      ],
    );

  // -- Demo auth accounts ------------------------------------------------------
  const demoPin = hashPin(config.demoPin);
  await q(`INSERT INTO users (id, role, phone, email, pin_hash, display_name, patient_id) VALUES ($1,'patient',$2,$3,$4,$5,$6)`, [
    'p1', patient.phone, patient.email, demoPin, `${patient.firstName} ${patient.lastName}`, patient.id,
  ]);
  const demoDoctor = doctors.find((d) => d.id === DEMO_DOCTOR_ID)!;
  await q(`INSERT INTO users (id, role, phone, email, pin_hash, display_name, doctor_id) VALUES ($1,'doctor',$2,$3,$4,$5,$6)`, [
    DEMO_DOCTOR_ID, '+237 690 00 00 01', `dr.${demoDoctor.lastName.toLowerCase()}@aura.cm`, demoPin, `Dr ${demoDoctor.firstName} ${demoDoctor.lastName}`, DEMO_DOCTOR_ID,
  ]);

  // -- Pharmacy & delivery demo accounts --------------------------------------
  await q(`INSERT INTO users (id, role, phone, email, pin_hash, display_name, pharmacy_id) VALUES ($1,'pharmacist',$2,$3,$4,$5,$6)`, [
    'pharm1', '+237 622 21 45 90', 'pharmacie.du.centre@aura.cm', demoPin, 'Pharmacie du Centre', 'ph1',
  ]);
  await q(`INSERT INTO users (id, role, phone, email, pin_hash, display_name, courier_id) VALUES ($1,'delivery',$2,$3,$4,$5,$6)`, [
    'cour1', couriersSeed[0].phone, 'alain.manga@aura.cm', demoPin, `${couriersSeed[0].firstName} ${couriersSeed[0].lastName}`, couriersSeed[0].id,
  ]);

  // -- Admin account (validates doctor profiles, consults establishments) -----
  await q(`INSERT INTO users (id, role, phone, email, pin_hash, display_name) VALUES ($1,'admin',$2,$3,$4,$5)`, [
    'admin1', '+237 690 00 00 00', 'admin@aura.cm', demoPin, 'Administration Aura',
  ]);
}

/** Applies schema.sql after dropping all known tables, then seeds. */
export async function resetAndSeed() {
  const pool = new Pool({ ...config.database, max: 2 });
  try {
    const tables = [
      'sessions', 'users', 'chat_messages', 'chat_threads', 'consultation_summaries', 'prescriptions', 'payments',
      'cart_items', 'order_events', 'orders', 'notifications', 'symptom_preps', 'documents', 'professional_applications',
      'appointments', 'doctor_patients', 'pharmacy_medications', 'patients', 'couriers', 'medications', 'pharmacies', 'doctors', 'hospitals', 'specialties',
    ];
    await pool.query(`DROP TABLE IF EXISTS ${tables.join(', ')} CASCADE`);

    const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql');
    await pool.query(readFileSync(schemaPath, 'utf8'));

    await seedDatabase(pool);

    const counts = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    console.log(`✅ Schema applied (${counts.rows.length} tables) and seed data inserted.`);
    console.log('   Demo accounts (PIN 1234) — patient: +237 691 45 78 20 / doctor: +237 690 00 00 01');
    console.log('   pharmacist: +237 622 21 45 90 (Pharmacie du Centre) / livreur: +237 655 40 12 88 (Alain Manga)');
    console.log('   admin: +237 690 00 00 00 (Administration Aura)');
    console.log('   Code de remise des commandes seedées : 123456');
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '')) {
  resetAndSeed().catch((err) => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  });
}
