/**
 * Contract check: validates that every endpoint the mobile services call
 * returns the shapes the TypeScript types expect. Run against a seeded,
 * live backend:  npx tsx scripts/contract.ts
 * (pure fetch — no react-native imports).
 */
const BASE = process.env.CONTRACT_BASE ?? 'http://localhost:4000';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, detail = '') {
  if (cond) passed++;
  else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function hasKeys(obj: unknown, keys: string[]): boolean {
  return typeof obj === 'object' && obj !== null && keys.every((k) => k in obj);
}

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) as any };
}

async function main() {
  // — demo sign-ins for the four roles —
  const tokens: Record<string, string> = {};
  for (const role of ['patient', 'doctor', 'pharmacist', 'delivery']) {
    const r = await call('POST', '/api/auth/demo', undefined, { role });
    ok(`login ${role}`, r.status === 200 && typeof r.json?.token === 'string', `status=${r.status}`);
    tokens[role] = r.json.token;
  }
  const P = tokens.patient!;

  // — catalog shapes —
  const specialties = await call('GET', '/api/specialties');
  ok('GET /specialties → Specialty[]', specialties.status === 200 && Array.isArray(specialties.json) && hasKeys(specialties.json[0], ['id', 'name', 'icon']));

  const doctors = await call('GET', '/api/doctors');
  ok('GET /doctors → Doctor[]', doctors.status === 200 && hasKeys(doctors.json[0], ['id', 'firstName', 'lastName', 'specialty', 'fee', 'slotTimes', 'status']));

  const doctorDetail = await call('GET', '/api/doctors/d1');
  ok('GET /doctors/d1 → Doctor & {hospital}', doctorDetail.status === 200 && hasKeys(doctorDetail.json, ['hospital']) && hasKeys(doctorDetail.json.hospital, ['id', 'name']));

  const slots = await call('GET', `/api/doctors/d1/slots?date=${new Date().toISOString().slice(0, 10)}`);
  ok('GET /doctors/d1/slots → {time, available}[]', slots.status === 200 && Array.isArray(slots.json) && hasKeys(slots.json[0] ?? { time: '', available: true }, ['time', 'available']));

  const hospitals = await call('GET', '/api/hospitals');
  ok('GET /hospitals → Hospital[]', hospitals.status === 200 && hasKeys(hospitals.json[0], ['id', 'name', 'specialties', 'emergency']));

  const hospitalDetail = await call('GET', `/api/hospitals/${hospitals.json[0].id}`);
  ok('GET /hospitals/:id → Hospital & {doctors}', hospitalDetail.status === 200 && Array.isArray(hospitalDetail.json.doctors) && hasKeys(hospitalDetail.json.doctors[0] ?? { id: '' }, ['id']));

  const pharmacies = await call('GET', '/api/pharmacies');
  ok('GET /pharmacies → Pharmacy[]', pharmacies.status === 200 && hasKeys(pharmacies.json[0], ['id', 'name', 'onDuty', 'medicationIds']));

  const medications = await call('GET', '/api/medications');
  ok('GET /medications → Medication[]', medications.status === 200 && hasKeys(medications.json[0], ['id', 'name', 'unitPrice', 'requiresPrescription']));

  // — patient session shapes —
  const me = await call('GET', '/api/patient/me', P);
  ok('GET /patient/me → Patient + medical record', me.status === 200 && hasKeys(me.json, ['id', 'firstName', 'allergies', 'conditions', 'treatments', 'vaccines', 'examResults', 'emergencyContact']));

  const appts = await call('GET', '/api/appointments', P);
  ok('GET /appointments → Appointment[]', appts.status === 200 && hasKeys(appts.json[0] ?? { id: '' }, ['id', 'doctorId', 'patientName', 'motif', 'fee', 'paid']));

  const rxs = await call('GET', '/api/prescriptions', P);
  ok('GET /prescriptions → Prescription[]', rxs.status === 200 && hasKeys(rxs.json[0] ?? { id: '' }, ['id', 'code', 'lines', 'expiryDate', 'status']));

  const pays = await call('GET', '/api/payments', P);
  ok('GET /payments → Payment[]', pays.status === 200 && hasKeys(pays.json[0] ?? { id: '' }, ['id', 'reference', 'category', 'amount', 'method']));

  const cart = await call('GET', '/api/pharmacy/cart', P);
  ok('GET /pharmacy/cart → CartItem[]', cart.status === 200 && Array.isArray(cart.json));

  const threads = await call('GET', '/api/consultations/threads', P);
  ok('GET /consultations/threads → ChatThread[] (messages inlined)', threads.status === 200 && Array.isArray(threads.json) && (!threads.json[0] || hasKeys(threads.json[0], ['id', 'doctorName', 'status', 'messages'])));

  const summaries = await call('GET', '/api/consultations/summaries', P);
  ok('GET /consultations/summaries → ConsultationSummary[]', summaries.status === 200 && (!summaries.json[0] || hasKeys(summaries.json[0], ['id', 'appointmentId', 'observations', 'recommendations', 'treatments'])));

  const notifs = await call('GET', '/api/notifications', P);
  ok('GET /notifications → AppNotification[]', notifs.status === 200 && hasKeys(notifs.json[0] ?? { id: '' }, ['id', 'type', 'title', 'read', 'deepLink']));

  const docs = await call('GET', '/api/patient/documents', P);
  ok('GET /patient/documents → MedicalDocument[]', docs.status === 200 && Array.isArray(docs.json));

  // — doctor workspace —
  const patients = await call('GET', '/api/doctor/patients', tokens.doctor);
  ok('GET /doctor/patients → DoctorPatientFile[]', patients.status === 200 && (!patients.json[0] || hasKeys(patients.json[0], ['id', 'firstName', 'allergies', 'lastVisit'])));

  const agenda = await call('GET', '/api/doctor/agenda', tokens.doctor);
  ok('GET /doctor/agenda → {date, appointments[]}', agenda.status === 200 && typeof agenda.json?.date === 'string' && Array.isArray(agenda.json.appointments));

  // — workspace order views —
  const queue = await call('GET', '/api/pharmacist/orders', tokens.pharmacist);
  ok('GET /pharmacist/orders → WorkspaceOrder[]', queue.status === 200 && Array.isArray(queue.json) && (!queue.json[0] || hasKeys(queue.json[0], ['id', 'status', 'paid', 'patientName'])));

  const runSheet = await call('GET', '/api/delivery/orders', tokens.delivery);
  ok('GET /delivery/orders → WorkspaceOrder[]', runSheet.status === 200 && Array.isArray(runSheet.json) && (!runSheet.json[0] || hasKeys(runSheet.json[0], ['id', 'courierId'])));
  ok('Workspace views never expose the handover code', !JSON.stringify(runSheet.json).includes('"handoverCode"'));

  // — pharmacist catalog management —
  const stock = await call('GET', '/api/pharmacist/medications', tokens.pharmacist);
  ok('GET /pharmacist/medications → PharmacyMedication[]', stock.status === 200 && Array.isArray(stock.json) && hasKeys(stock.json[0] ?? { id: '' }, ['id', 'name', 'unitPrice', 'stock', 'lowStockThreshold', 'lowStock']));

  const couriers = await call('GET', '/api/pharmacist/couriers', tokens.pharmacist);
  ok('GET /pharmacist/couriers → CourierWithLoad[]', couriers.status === 200 && Array.isArray(couriers.json) && hasKeys(couriers.json[0] ?? { id: '' }, ['id', 'firstName', 'vehicle', 'active', 'activeDeliveries']));

  if (queue.json[0]) {
    const detail = await call('GET', `/api/pharmacist/orders/${queue.json[0].id}`, tokens.pharmacist);
    ok(
      'GET /pharmacist/orders/:id → {order, events}',
      detail.status === 200
        && hasKeys(detail.json?.order ?? {}, ['id', 'status', 'paid', 'patientName'])
        && Array.isArray(detail.json?.events)
        && (!detail.json.events[0] || hasKeys(detail.json.events[0], ['id', 'status', 'label', 'actor', 'createdAt'])),
      JSON.stringify(detail.json?.error),
    );
  }

  console.log(`\nContrat API mobile : ${passed} réussite(s), ${failed} échec(s)`);
  if (failures.length) {
    for (const f of failures) console.log(`  ✗ ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Contract check crashed:', err);
  process.exit(1);
});
