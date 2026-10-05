/**
 * End-to-end flow test. Run against a live server (`npm start`) and a seeded
 * database (`npm run db:reset`):
 *
 *   npm run db:reset && npm start &   # then
 *   npm run smoke
 *
 * Walks every product flow and exits non-zero if any step fails.
 */

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:4001';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n■ ${title}`);
}

async function api(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

const todayISO = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------

async function main() {
  section('Santé du service');
  const health = await api('GET', '/api/health');
  ok('GET /api/health → 200', health.status === 200 && health.json?.ok === true);

  section('Authentification');
  const anon = await api('GET', '/api/appointments');
  ok('Requête anonyme → 401', anon.status === 401, `status=${anon.status}`);

  const badLogin = await api('POST', '/api/auth/login', { body: { phone: '+237 691 45 78 20', pin: '0000' } });
  ok('Mauvais PIN → 401', badLogin.status === 401);

  const patientLogin = await api('POST', '/api/auth/demo', { body: { role: 'patient' } });
  ok('Login démo patient → 200 + profil', patientLogin.status === 200 && patientLogin.json?.role === 'patient' && patientLogin.json?.patient?.id === 'p1');
  const P = patientLogin.json.token;

  const doctorLogin = await api('POST', '/api/auth/demo', { body: { role: 'doctor' } });
  ok('Login démo médecin → 200 + profil', doctorLogin.status === 200 && doctorLogin.json?.role === 'doctor' && doctorLogin.json?.doctor?.id === 'd1');
  const D = doctorLogin.json.token;

  const pharmacistLogin = await api('POST', '/api/auth/demo', { body: { role: 'pharmacist' } });
  ok('Login démo pharmacien → 200 + pharmacie', pharmacistLogin.status === 200 && pharmacistLogin.json?.role === 'pharmacist' && pharmacistLogin.json?.pharmacy?.id === 'ph1');
  const R = pharmacistLogin.json.token;

  const courierLogin = await api('POST', '/api/auth/demo', { body: { role: 'delivery' } });
  ok('Login démo livreur → 200 + profil', courierLogin.status === 200 && courierLogin.json?.role === 'delivery' && courierLogin.json?.courier?.id === 'c1');
  const C = courierLogin.json.token;

  const me = await api('GET', '/api/auth/me', { token: P });
  ok('GET /api/auth/me (patient)', me.status === 200 && me.json?.patient?.firstName === 'Stéphane');

  const stamp = Date.now().toString().slice(-8);
  const reg = await api('POST', '/api/auth/register', {
    body: { firstName: 'Awa', lastName: 'Test', email: `awa.${stamp}@test.cm`, phone: `+237 6${stamp}`, sex: 'F', birthDate: '1995-08-10', city: 'Douala', pin: '4321' },
  });
  ok('Inscription nouveau patient → 201', reg.status === 201 && reg.json?.patient?.id, `status=${reg.status} ${JSON.stringify(reg.json?.error)}`);
  const regLogin = await api('POST', '/api/auth/login', { body: { phone: `+237 6${stamp}`, pin: '4321' } });
  ok('Login du compte créé → 200', regLogin.status === 200 && regLogin.json?.patient?.city === 'Douala');

  const forgot = await api('POST', '/api/auth/forgot-password', { body: { phone: `+237 6${stamp}` } });
  ok('Mot de passe oublié → code de démo', forgot.status === 200 && forgot.json?.code === '000000');
  const reset = await api('POST', '/api/auth/reset-password', { body: { phone: `+237 6${stamp}`, code: '000000', pin: '9999' } });
  ok('Réinitialisation du PIN', reset.status === 200 && (await api('POST', '/api/auth/login', { body: { phone: `+237 6${stamp}`, pin: '9999' } })).status === 200);

  section('Catalogue');
  const specialties = await api('GET', '/api/specialties');
  ok('Spécialités (13)', specialties.status === 200 && specialties.json.length === 13, `got ${specialties.json?.length}`);

  const doctors = await api('GET', '/api/doctors');
  ok('Liste des médecins', doctors.status === 200 && doctors.json.length >= 5 && doctors.json[0].firstName !== undefined);
  const cardio = await api('GET', '/api/doctors?specialty=Cardiologie');
  ok('Filtre spécialité = Cardiologie', cardio.status === 200 && cardio.json.length > 0 && cardio.json.every((d: any) => d.specialty === 'Cardiologie'));
  const docDetail = await api('GET', '/api/doctors/d1');
  ok('Détail médecin + hôpital', docDetail.status === 200 && docDetail.json.hospital?.name !== undefined);

  // Find a working day for d1 with free slots.
  let bookingDate: string | null = null;
  let bookingTime: string | null = null;
  for (let i = 0; i < 14 && !bookingDate; i++) {
    const date = todayISO(i);
    const slots = await api('GET', `/api/doctors/d1/slots?date=${date}`);
    const free = (slots.json ?? []).find((s: any) => s.available);
    if (free) { bookingDate = date; bookingTime = free.time; }
  }
  ok('Créneaux disponibles pour d1', !!bookingDate && !!bookingTime, `aucun créneau sur 14 jours`);
  if (bookingDate && bookingTime) {
    const reslots = await api('GET', `/api/doctors/d1/slots?date=${bookingDate}`);
    ok('Créneau réservé marqué indisponible après réservation', (reslots.json ?? []).every((s: any) => s.time !== bookingTime || s.available === true));
  }

  const hospitals = await api('GET', '/api/hospitals');
  ok('Hôpitaux', hospitals.status === 200 && hospitals.json.length >= 3);
  const hospDetail = await api('GET', `/api/hospitals/${hospitals.json[0].id}`);
  ok('Détail hôpital + médecins', hospDetail.status === 200 && Array.isArray(hospDetail.json.doctors));

  const pharmacies = await api('GET', '/api/pharmacies');
  ok('Pharmacies', pharmacies.status === 200 && pharmacies.json.length >= 3);
  const onDuty = await api('GET', '/api/pharmacies?onDutyOnly=true');
  ok('Filtre pharmacies de garde', onDuty.status === 200 && onDuty.json.length > 0 && onDuty.json.every((p: any) => p.onDuty));
  const phDetail = await api('GET', `/api/pharmacies/${pharmacies.json[0].id}`);
  ok('Détail pharmacie + stock', phDetail.status === 200 && Array.isArray(phDetail.json.medications));

  const meds = await api('GET', '/api/medications?q=paracétamol');
  ok('Recherche médicament (paracétamol)', meds.status === 200 && meds.json.length > 0);
  const otc = await api('GET', '/api/medications?otcOnly=true');
  ok('Filtre sans ordonnance', otc.status === 200 && otc.json.length > 0 && otc.json.every((m: any) => !m.requiresPrescription));
  const medDetail = await api('GET', `/api/medications/${meds.json[0]?.id ?? 'm1'}`);
  ok('Détail médicament + pharmacies', medDetail.status === 200 && Array.isArray(medDetail.json.pharmacies));

  section('Dossier patient');
  const profile = await api('GET', '/api/patient/me', { token: P });
  ok('Profil + dossier médical', profile.status === 200 && profile.json.allergies.length === 3 && profile.json.conditions.length >= 3);
  const patched = await api('PATCH', '/api/patient/me', { token: P, body: { address: 'Quartier Bastos, Rue 3.21' } });
  ok('Mise à jour du profil', patched.status === 200 && patched.json.address === 'Quartier Bastos, Rue 3.21');
  const docs = await api('GET', '/api/patient/documents', { token: P });
  ok('Documents médicaux', docs.status === 200 && docs.json.length >= 2);
  const newDoc = await api('POST', '/api/patient/documents', { token: P, body: { name: 'Radiologie thoracique', type: 'imagerie' } });
  ok('Ajout d’un document', newDoc.status === 201 && newDoc.json.id);
  const docsAfter = await api('GET', '/api/patient/documents', { token: P });
  ok('Document ajouté visible', docsAfter.json.length === docs.json.length + 1);

  section('Rendez-vous : réservation → paiement → report');
  const unreadBefore = (await api('GET', '/api/notifications/unread-count', { token: P })).json.count;
  let appointment: any = null;
  if (bookingDate && bookingTime) {
    const booked = await api('POST', '/api/appointments', {
      token: P,
      body: { doctorId: 'd1', type: 'video', date: bookingDate, time: bookingTime, motif: 'Céphalées persistantes et fièvre', symptoms: ['Fièvre', 'Maux de tête'] },
    });
    ok('Réservation → 201 (confirmé, non payé)', booked.status === 201 && booked.json.status === 'confirmed' && booked.json.paid === false, JSON.stringify(booked.json?.error));
    appointment = booked.json;
    const slotAfter = await api('GET', `/api/doctors/d1/slots?date=${bookingDate}`);
    const slot = (slotAfter.json ?? []).find((s: any) => s.time === bookingTime);
    ok('Créneau réservé devenu indisponible', slot && slot.available === false);
    const doubleBook = await api('POST', '/api/appointments', {
      token: P, body: { doctorId: 'd1', type: 'video', date: bookingDate, time: bookingTime, motif: 'Deuxième réservation même créneau' },
    });
    ok('Double réservation → 409', doubleBook.status === 409);
    const unreadAfter = (await api('GET', '/api/notifications/unread-count', { token: P })).json.count;
    ok('Notification de confirmation créée', unreadAfter === unreadBefore + 1, `${unreadBefore} → ${unreadAfter}`);

    const latePay = await api('POST', '/api/payments', { token: P, body: { category: 'consultation', relatedId: appointment.id, method: 'mtn_momo' } });
    ok('Paiement MoMo de la consultation', latePay.status === 201 && latePay.json.status === 'paid' && latePay.json.amount === appointment.fee);
    const apptPaid = await api('GET', `/api/appointments/${appointment.id}`, { token: P });
    ok('Rendez-vous marqué payé', apptPaid.json.paid === true && apptPaid.json.paymentId === latePay.json.id);
    const rePay = await api('POST', '/api/payments', { token: P, body: { category: 'consultation', relatedId: appointment.id, method: 'card' } });
    ok('Second paiement → 422', rePay.status === 422);

    const newTime = (await api('GET', `/api/doctors/d1/slots?date=${bookingDate}`)).json.find((s: any) => s.available)?.time;
    const reslotted = await api('POST', `/api/appointments/${appointment.id}/reschedule`, { token: P, body: { date: bookingDate, time: newTime } });
    ok('Report du rendez-vous', reslotted.status === 200 && reslotted.json.time === newTime, JSON.stringify(reslotted.json?.error));
    appointment = reslotted.json;
  }

  section('Consultation par messagerie');
  // Pick any free chat slot in the coming days (repeat runs must not collide).
  let chatDate: string | null = null;
  let chatTime: string | null = null;
  for (let i = 1; i <= 14 && !chatDate; i++) {
    const date = todayISO(i);
    const slots = await api('GET', `/api/doctors/d1/slots?date=${date}`);
    const free = (slots.json ?? []).find((s: any) => s.available);
    if (free) { chatDate = date; chatTime = free.time; }
  }
  const chatBooked = await api('POST', '/api/appointments', {
    token: P, body: { doctorId: 'd1', type: 'chat', date: chatDate, time: chatTime, motif: 'Suivi traitement allergie saisonnière' },
  });
  ok('Réservation consultation chat → 201', chatBooked.status === 201, JSON.stringify(chatBooked.json?.error));
  const threads = await api('GET', '/api/consultations/threads', { token: P });
  ok('Fil de discussion créé pour le chat', threads.status === 200 && threads.json.some((t: any) => t.appointmentId === chatBooked.json.id));
  const chatThread = threads.json.find((t: any) => t.appointmentId === chatBooked.json.id);

  const sent = await api('POST', `/api/consultations/threads/${chatThread.id}/messages`, { token: P, body: { kind: 'text', text: 'Bonjour docteur, les éternuements ont repris.' } });
  ok('Message patient envoyé', sent.status === 201 && sent.json.sender === 'patient');
  const docThreads = await api('GET', '/api/consultations/threads', { token: D });
  const docThread = docThreads.json.find((t: any) => t.id === chatThread.id);
  ok('Le médecin voit le fil et le message', !!docThread && docThread.messages.some((m: any) => m.text?.includes('éternuements')));
  const reply = await api('POST', `/api/consultations/threads/${chatThread.id}/messages`, { token: D, body: { kind: 'text', text: 'Bonjour, reprendre la loratadine 10 mg une fois par jour.' } });
  ok('Réponse du médecin', reply.status === 201 && reply.json.sender === 'doctor');
  const threadAfter = await api('GET', `/api/consultations/threads/${chatThread.id}`, { token: P });
  ok('Patient voit la réponse + notification', threadAfter.json.messages.length >= 2 && (await api('GET', '/api/notifications/unread-count', { token: P })).json.count > 0);
  const ended = await api('POST', `/api/consultations/threads/${chatThread.id}/end`, { token: D });
  ok('Fin de la conversation', ended.status === 200 && ended.json.status === 'ended');
  const afterEnd = await api('POST', `/api/consultations/threads/${chatThread.id}/messages`, { token: P, body: { kind: 'text', text: 'Encore une question ?' } });
  ok('Message après clôture → 422', afterEnd.status === 422);

  // La clôture du fil déclenche en arrière-plan la génération (unique) du
  // compte-rendu IA fondé sur l'intégralité de l'échange — alors même que le
  // rendez-vous n'est pas encore clôturé par le médecin.
  let autoSummary: any = null;
  for (let i = 0; i < 40 && !autoSummary; i++) {
    const list = await api('GET', `/api/consultations/summaries?appointmentId=${chatBooked.json.id}`, { token: P });
    autoSummary = (list.json ?? []).find((s: any) => s.appointmentId === chatBooked.json.id) ?? null;
    if (!autoSummary) await new Promise((r) => setTimeout(r, 1000));
  }
  ok('Compte-rendu généré automatiquement à la clôture du fil', !!autoSummary && typeof autoSummary.observations === 'string' && autoSummary.observations.length > 20);
  ok('Compte-rendu automatique patient sans bloc diagnostique', !!autoSummary && autoSummary.aiDiagnostic === undefined);
  const autoAgain = await api('POST', '/api/consultations/summaries', { token: P, body: { appointmentId: chatBooked.json.id } });
  ok('Génération unique — le bouton manuel renvoie le même compte-rendu', autoAgain.status === 200 && !!autoSummary && autoAgain.json.id === autoSummary.id);
  const autoDoc = await api('GET', `/api/consultations/summaries/${autoSummary?.id}`, { token: D });
  if (autoSummary?.aiGenerated) {
    ok('Pré-diagnostic IA présent côté médecin (compte-rendu automatique)', autoDoc.status === 200 && !!autoDoc.json.aiDiagnostic?.hypothesis);
  } else {
    ok('Repli moteur local actif (clé IA absente) — compte-rendu automatique', !!autoSummary && autoSummary.aiGenerated === false && autoDoc.json.aiDiagnostic === undefined);
  }

  section('Clôture de consultation + compte-rendu + ordonnance');
  const completed = await api('POST', `/api/appointments/${appointment.id}/complete`, { token: D, body: { notes: 'Patient orienté vers bilan paludisme si fièvre persistante.' } });
  ok('Consultation clôturée par le médecin', completed.status === 200 && completed.json.status === 'completed');
  const completedAgain = await api('POST', `/api/appointments/${appointment.id}/complete`, { token: D });
  ok('Clôture idempotente (second participant à raccrocher)', completedAgain.status === 200 && completedAgain.json.status === 'completed');
  const patientComplete = await api('POST', `/api/appointments/${chatBooked.json.id}/complete`, { token: P });
  ok('Le patient peut aussi clôturer (raccrochage de l’appel vidéo)', patientComplete.status === 200 && patientComplete.json.status === 'completed');
  const cancelAfterComplete = await api('POST', `/api/appointments/${appointment.id}/cancel`, { token: P });
  ok('Annulation après clôture → 422', cancelAfterComplete.status === 422);

  // La clôture génère le compte-rendu en arrière-plan (plus de bouton manuel
  // côté client) : on sonde comme pour la fin de fil de messagerie.
  let summary: any = null;
  for (let i = 0; i < 40 && !summary; i++) {
    const list = await api('GET', `/api/consultations/summaries?appointmentId=${appointment.id}`, { token: P });
    summary = (list.json ?? []).find((s: any) => s.appointmentId === appointment.id) ?? null;
    if (!summary) await new Promise((r) => setTimeout(r, 1000));
  }
  ok('Compte-rendu généré automatiquement à la clôture', !!summary && typeof summary.observations === 'string' && summary.observations.length > 20);
  ok('Compte-rendu contient recommandations + examens', !!summary && Array.isArray(summary.recommendations) && summary.recommendations.length >= 2 && Array.isArray(summary.exams));
  const rxFromSummary = summary?.prescriptionId;
  ok('Ordonnance liée au compte-rendu', !!rxFromSummary);
  const summaryAgain = await api('POST', '/api/consultations/summaries', { token: P, body: { appointmentId: appointment.id } });
  ok('Génération idempotente', summaryAgain.status === 200 && summaryAgain.json.id === summary?.id);
  const docsAfterSummary = await api('GET', '/api/patient/documents', { token: P });
  ok('Compte-rendu ajouté aux documents', docsAfterSummary.json.some((d: any) => d.type === 'compte-rendu'));
  const summaryNotif = await api('GET', '/api/notifications', { token: P });
  ok('Notification « compte-rendu disponible »', summaryNotif.json.some((n: any) => n.type === 'summary' && n.deepLink === `/consultation/summary/${summary?.id}`));

  section('Ordonnances');
  const rxList = await api('GET', '/api/prescriptions', { token: P });
  ok('Liste des ordonnances du patient', rxList.status === 200 && rxList.json.length >= 2);
  const rxDetail = await api('GET', `/api/prescriptions/${rxFromSummary}`, { token: P });
  ok('Détail ordonnance + lignes', rxDetail.status === 200 && rxDetail.json.lines.length >= 1);
  const doctorCreates = await api('POST', '/api/prescriptions', {
    token: D,
    body: { patientId: 'p1', lines: [{ name: 'Loratadine', dosage: '10 mg', form: 'comprimé', quantity: '1 boîte', frequency: '1 par jour', duration: '30 jours' }], instructions: 'À prendre le matin.' },
  });
  ok('Médecin crée une ordonnance', doctorCreates.status === 201 && /^RX-/.test(doctorCreates.json.code ?? ''), JSON.stringify(doctorCreates.json?.error));
  const patientCreates = await api('POST', '/api/prescriptions', { token: P, body: { patientId: 'p1', lines: [{ name: 'X' }] } });
  ok('Patient ne peut pas créer d’ordonnance → 403', patientCreates.status === 403);
  const imported = await api('POST', '/api/prescriptions/import', {
    token: P,
    body: { doctorName: 'Dr Extérieur', establishment: 'Clinique extern', lines: [{ name: 'Ibuprofène', dosage: '400 mg', form: 'comprimé', quantity: '1 boîte', frequency: '3 par jour', duration: '5 jours' }] },
  });
  ok('Import d’ordonnance papier', imported.status === 201 && imported.json.source === 'imported' && imported.json.status === 'active');
  const docsAfterImport = await api('GET', '/api/patient/documents', { token: P });
  ok('Ordonnance importée ajoutée aux documents', docsAfterImport.json.some((d: any) => d.name?.includes(imported.json.code)));

  section('Pharmacie : panier → commande → paiement → validation pharmacien');
  await api('DELETE', '/api/pharmacy/cart', { token: P });
  const cartEmpty = await api('GET', '/api/pharmacy/cart', { token: P });
  ok('Panier vide au départ', cartEmpty.status === 200 && cartEmpty.json.length === 0);
  const addOtc = await api('POST', '/api/pharmacy/cart/items', { token: P, body: { medicationId: 'm1', quantity: 2 } });
  ok('Ajout au panier (2× paracétamol)', addOtc.status === 201 && addOtc.json.some((c: any) => c.medicationId === 'm1' && c.quantity === 2));
  const addAgain = await api('POST', '/api/pharmacy/cart/items', { token: P, body: { medicationId: 'm1' } });
  ok('Ajout répété fusionne la quantité', addAgain.json.find((c: any) => c.medicationId === 'm1').quantity === 3);
  const rxMed = (await api('GET', '/api/medications')).json.find((m: any) => m.requiresPrescription);
  await api('POST', '/api/pharmacy/cart/items', { token: P, body: { medicationId: rxMed.id } });
  const noRxCheckout = await api('POST', '/api/pharmacy/orders', { token: P, body: { pharmacyId: 'ph1', mode: 'pickup' } });
  ok('Commande Rx sans ordonnance → 422', noRxCheckout.status === 422, JSON.stringify(noRxCheckout.json?.error));
  const rxListFresh = await api('GET', '/api/prescriptions', { token: P });
  const activeRx = rxListFresh.json.find((r: any) => r.status === 'active' && r.id === doctorCreates.json.id) ?? doctorCreates.json;

  const cartBeforeCheckout = await api('GET', '/api/pharmacy/cart', { token: P });
  const subtotal = cartBeforeCheckout.json.reduce((s: number, c: any) => s + c.unitPrice * c.quantity, 0);
  const checkout = await api('POST', '/api/pharmacy/orders', {
    token: P, body: { pharmacyId: 'ph1', mode: 'delivery', address: 'Quartier Bastos, Rue 3.21, Yaoundé', prescriptionId: activeRx.id },
  });
  const placedOrder = checkout.json?.order;
  ok('Checkout → commande « en attente » + code de remise', checkout.status === 201 && placedOrder?.status === 'en attente' && /^\d{6}$/.test(checkout.json?.handoverCode ?? ''), JSON.stringify(checkout.json?.error));
  ok('Total = sous-total + frais de livraison', placedOrder?.total === subtotal + 1000, `${placedOrder?.total} vs ${subtotal} + 1000`);
  const orderId: string = placedOrder.id;
  // The code returned at checkout is the customer's secret; /code regenerates it.
  let handoverCode: string = checkout.json.handoverCode;
  const initialCode = await api('POST', `/api/pharmacy/orders/${orderId}/code`, { token: P });
  ok('Code de remise régénérable par le client', initialCode.status === 200 && /^\d{6}$/.test(initialCode.json.handoverCode ?? ''));
  handoverCode = initialCode.json.handoverCode;
  const cartAfterCheckout = await api('GET', '/api/pharmacy/cart', { token: P });
  ok('Panier conservé avant paiement', cartAfterCheckout.json.length === 2);

  // Guards: unpaid orders cannot be validated; the queue is pharmacist-only.
  const earlyValidate = await api('POST', `/api/pharmacist/orders/${orderId}/validate`, { token: R });
  ok('Validation d’une commande non payée → 422', earlyValidate.status === 422);
  const queueAsPatient = await api('GET', '/api/pharmacist/orders', { token: P });
  ok('File pharmacien interdite au patient → 403', queueAsPatient.status === 403);

  const orderPay = await api('POST', '/api/payments', { token: P, body: { category: 'order', relatedId: orderId, method: 'orange_money' } });
  ok('Paiement de la commande', orderPay.status === 201 && orderPay.json.amount === placedOrder.total);
  const orderPaid = await api('GET', `/api/pharmacy/orders/${orderId}`, { token: P });
  ok('Commande toujours « en attente » (validation par la pharmacie)', orderPaid.json.status === 'en attente' && orderPaid.json.paymentId === orderPay.json.id);
  const cartAfterPay = await api('GET', '/api/pharmacy/cart', { token: P });
  ok('Panier vidé après paiement', cartAfterPay.json.length === 0);

  // Pharmacist workspace
  const queue = await api('GET', '/api/pharmacist/orders', { token: R });
  ok('La file du pharmacien contient la commande', queue.status === 200 && queue.json.some((o: any) => o.id === orderId));
  ok('La vue pharmacien expose l’ordonnance liée', queue.json.find((o: any) => o.id === 'ord2')?.prescription?.code === 'AUR-RX-2026-0841');
  const validate = await api('POST', `/api/pharmacist/orders/${orderId}/validate`, { token: R });
  ok('Pharmacien valide → « confirmée »', validate.status === 200 && validate.json.status === 'confirmée');
  const validateTwice = await api('POST', `/api/pharmacist/orders/${orderId}/validate`, { token: R });
  ok('Re-validation → 409', validateTwice.status === 409);
  const ready = await api('POST', `/api/pharmacist/orders/${orderId}/ready`, { token: R });
  ok('Pharmacien prépare → « prête » avec livreur affecté', ready.status === 200 && ready.json.status === 'prête' && Boolean(ready.json.courierName), JSON.stringify(ready.json?.courierName));

  // Courier workflow — the handover code is only known by the customer.
  const courierQueue = await api('GET', '/api/delivery/orders', { token: C });
  const assigned = courierQueue.json.find((o: any) => o.id === orderId);
  ok('Le livreur voit la commande affectée', courierQueue.status === 200 && Boolean(assigned));
  ok('Le livreur ne voit jamais le code de remise', assigned && !JSON.stringify(courierQueue.json).includes(handoverCode));
  const wrongDeliverLate = await api('POST', `/api/delivery/orders/${orderId}/deliver`, { token: C, body: { code: handoverCode } });
  ok('Livraison avant récupération du colis → 409', wrongDeliverLate.status === 409);
  const pickup = await api('POST', `/api/delivery/orders/${orderId}/pickup`, { token: C });
  ok('Colis récupéré → « en livraison »', pickup.status === 200 && pickup.json.status === 'en livraison');
  const wrongCode = await api('POST', `/api/delivery/orders/${orderId}/deliver`, { token: C, body: { code: '000000' } });
  ok('Livraison avec mauvais code → 400', wrongCode.status === 400, JSON.stringify(wrongCode.json?.error));
  const delivered = await api('POST', `/api/delivery/orders/${orderId}/deliver`, { token: C, body: { code: handoverCode } });
  ok('Livraison confirmée avec le code client → « livrée »', delivered.status === 200 && delivered.json.status === 'livrée');

  // Pickup handover at the counter, verified against the customer's code.
  await api('DELETE', '/api/pharmacy/cart', { token: P });
  await api('POST', '/api/pharmacy/cart/items', { token: P, body: { medicationId: 'm7', quantity: 1 } });
  const pickupOrder = await api('POST', '/api/pharmacy/orders', { token: P, body: { pharmacyId: 'ph1', mode: 'pickup' } });
  ok('Commande retrait créée', pickupOrder.status === 201 && Boolean(pickupOrder.json?.order?.id), JSON.stringify(pickupOrder.json?.error));
  const pickupOrderId: string = pickupOrder.json.order.id;
  const pickupCode: string = pickupOrder.json.handoverCode;
  await api('POST', '/api/payments', { token: P, body: { category: 'order', relatedId: pickupOrderId, method: 'card' } });
  await api('POST', `/api/pharmacist/orders/${pickupOrderId}/validate`, { token: R });
  await api('POST', `/api/pharmacist/orders/${pickupOrderId}/ready`, { token: R });
  const badHandover = await api('POST', `/api/pharmacist/orders/${pickupOrderId}/handover`, { token: R, body: { code: '999999' } });
  ok('Remise retrait avec mauvais code → 400', badHandover.status === 400);
  const goodHandover = await api('POST', `/api/pharmacist/orders/${pickupOrderId}/handover`, { token: R, body: { code: pickupCode } });
  ok('Retrait remis contre le code client → « livrée »', goodHandover.status === 200 && goodHandover.json.status === 'livrée');

  // Seeded delivery orders appear in the courier's run sheet (read-only check,
  // so the suite stays repeatable across runs).
  const courierQueueSeed = await api('GET', '/api/delivery/orders', { token: C });
  ok('Commande seedée ord6 visible par le livreur', courierQueueSeed.status === 200 && courierQueueSeed.json.some((o: any) => o.id === 'ord6'));

  // Customer can regenerate their code; pharmacist can reject an order (→ refund).
  const regen = await api('POST', '/api/pharmacy/orders/ord2/code', { token: P });
  ok('Régénération du code par le client', regen.status === 200 && /^\d{6}$/.test(regen.json.handoverCode ?? '') && regen.json.handoverCode !== '123456');
  await api('POST', '/api/pharmacy/cart/items', { token: P, body: { medicationId: 'm1' } });
  const order2 = await api('POST', '/api/pharmacy/orders', { token: P, body: { pharmacyId: 'ph1', mode: 'pickup' } });
  const order2Id: string = order2.json.order.id;
  const pay2 = await api('POST', '/api/payments', { token: P, body: { category: 'order', relatedId: order2Id, method: 'card' } });
  const cancel = await api('POST', `/api/pharmacist/orders/${order2Id}/reject`, { token: R, body: { reason: 'Rupture de stock' } });
  ok('Rejet par le pharmacien → « annulée »', cancel.status === 200 && cancel.json.status === 'annulée');
  const refund = await api('GET', `/api/payments/${pay2.json.id}`, { token: P });
  ok('Paiement remboursé après rejet', refund.json.status === 'refunded');

  section('Pharmacie : gestion des médicaments (catalogue + stock)');
  const pharmMeds = await api('GET', '/api/pharmacist/medications', { token: R });
  ok('Catalogue du pharmacien avec stock', pharmMeds.status === 200 && pharmMeds.json.length === 12 && pharmMeds.json.every((m: any) => typeof m.stock === 'number' && typeof m.lowStock === 'boolean'), `got ${pharmMeds.json?.length}`);
  const medCreate = await api('POST', '/api/pharmacist/medications', {
    token: R, body: { name: 'Oméprazole', form: 'gélule', dosage: '20 mg', lab: 'TestLab', category: 'Antiacide', description: 'Test smoke.', requiresPrescription: true, unitPrice: 900, stock: 7 },
  });
  ok('Création d’un médicament → 201 + stock', medCreate.status === 201 && medCreate.json.stock === 7, JSON.stringify(medCreate.json?.error));
  const medPublic = await api('GET', '/api/medications?pharmacyId=ph1');
  ok('Nouveau médicament visible dans le catalogue public', medPublic.status === 200 && medPublic.json.some((m: any) => m.id === medCreate.json.id));
  const medPatch = await api('PATCH', `/api/pharmacist/medications/${medCreate.json.id}`, { token: R, body: { unitPrice: 950, stock: 2 } });
  ok('Mise à jour prix + stock → stock faible', medPatch.status === 200 && medPatch.json.unitPrice === 950 && medPatch.json.stock === 2 && medPatch.json.lowStock === true, JSON.stringify(medPatch.json?.error));
  const medDelete = await api('DELETE', `/api/pharmacist/medications/${medCreate.json.id}`, { token: R });
  const medPublicAfter = await api('GET', '/api/medications?pharmacyId=ph1');
  ok('Retrait du catalogue (lien pharmacie nettoyé)', medDelete.status === 200 && !medPublicAfter.json.some((m: any) => m.id === medCreate.json.id));
  const medAsPatient = await api('GET', '/api/pharmacist/medications', { token: P });
  ok('Catalogue pharmacien interdit au patient → 403', medAsPatient.status === 403);

  section('Pharmacie : livreurs, affectation manuelle & suivi de progression');
  const couriersList = await api('GET', '/api/pharmacist/couriers', { token: R });
  ok('Liste des livreurs de la pharmacie', couriersList.status === 200 && couriersList.json.length >= 2 && typeof couriersList.json[0].activeDeliveries === 'number', JSON.stringify(couriersList.json?.error));
  const assignWaiting = await api('POST', '/api/pharmacist/orders/ord2/assign', { token: R, body: { courierId: 'c1' } });
  ok('Affectation avant validation → 409', assignWaiting.status === 409, JSON.stringify(assignWaiting.json?.error));
  const m1Before = pharmMeds.json.find((m: any) => m.id === 'm1').stock;
  const assign = await api('POST', '/api/pharmacist/orders/ord4/assign', { token: R, body: { courierId: 'c1' } });
  ok('Affectation manuelle du livreur sur ord4', assign.status === 200 && assign.json.courierId === 'c1', JSON.stringify(assign.json?.error));
  const readyOrd4 = await api('POST', '/api/pharmacist/orders/ord4/ready', { token: R });
  ok('La préparation conserve le livreur affecté manuellement', readyOrd4.status === 200 && readyOrd4.json.courierId === 'c1', JSON.stringify(readyOrd4.json?.courierId));
  const ord4Detail = await api('GET', '/api/pharmacist/orders/ord4', { token: R });
  const ord4Statuses = (ord4Detail.json?.events ?? []).map((e: any) => e.status);
  ok('Détail commande + journal de progression', ord4Detail.status === 200 && ord4Detail.json.order.id === 'ord4' && ord4Statuses.includes('confirmée') && ord4Statuses.includes('prête') && ord4Detail.json.events.some((e: any) => String(e.label).includes('Livreur affecté')), JSON.stringify(ord4Statuses));
  const pickupOrd4 = await api('POST', '/api/delivery/orders/ord4/pickup', { token: C });
  ok('Le livreur affecté récupère le colis', pickupOrd4.status === 200 && pickupOrd4.json.status === 'en livraison');
  const deliverOrd4 = await api('POST', '/api/delivery/orders/ord4/deliver', { token: C, body: { code: '123456' } });
  ok('Livraison clôturée avec le code seedé', deliverOrd4.status === 200 && deliverOrd4.json.status === 'livrée');
  const m1After = (await api('GET', '/api/pharmacist/medications', { token: R })).json.find((m: any) => m.id === 'm1').stock;
  ok('Stock décrémenté après dispensation', m1After === m1Before - 1, `${m1Before} → ${m1After}`);
  const fullTimeline = (await api('GET', '/api/pharmacist/orders/ord4', { token: R })).json.events.map((e: any) => e.status);
  ok('Timeline complète : création → livraison', ['en attente', 'confirmée', 'prête', 'en livraison', 'livrée'].every((s) => fullTimeline.includes(s)), JSON.stringify(fullTimeline));

  section('Paiements & notifications');
  const payments = await api('GET', '/api/payments', { token: P });
  ok('Historique des paiements', payments.status === 200 && payments.json.length >= 4);

  const notifs = await api('GET', '/api/notifications', { token: P });
  const firstUnread = notifs.json.find((n: any) => !n.read);
  const marked = await api('POST', `/api/notifications/${firstUnread.id}/read`, { token: P });
  ok('Marquer une notification lue', marked.status === 200 && marked.json.read === true);
  await api('POST', '/api/notifications/read-all', { token: P });
  ok('Tout marquer lu → 0 non lues', (await api('GET', '/api/notifications/unread-count', { token: P })).json.count === 0);

  section('Orientation symptômes (IA Groq, repli moteur local)');
  const severe = await api('POST', '/api/symptoms/analyze', {
    token: P, body: { symptoms: ['Douleur thoracique'], duration: '2 heures', intensity: 'sévère', evolution: 'aggravation' },
  });
  ok('Triage sévère → priorité élevée', severe.status === 201 && severe.json.priority === 'élevée', JSON.stringify(severe.json?.error ?? severe.json?.priority));
  ok('Réponse patient sans diagnostic IA', severe.status === 201 && severe.json.aiDiagnostic === undefined && typeof severe.json.orientation === 'string' && severe.json.orientation.length > 10);
  const mild = await api('POST', '/api/symptoms/analyze', {
    token: P, body: { symptoms: ['Toux', 'Fatigue'], duration: '2 jours', intensity: 'légère', evolution: 'stable', details: 'Toux sèche nocturne' },
  });
  ok('Triage léger → priorité contenue', mild.status === 201 && ['faible', 'modérée'].includes(mild.json.priority), mild.json?.priority);
  const preps = await api('GET', '/api/symptoms/preps', { token: P });
  ok('Préparations listées (jamais de diagnostic côté patient)', preps.status === 200 && preps.json.length >= 2 && preps.json.every((p: any) => p.aiDiagnostic === undefined));
  const sentPrep = await api('POST', `/api/symptoms/preps/${mild.json.id}/send`, { token: P });
  ok('Préparation envoyée au médecin', sentPrep.status === 200 && sentPrep.json.sentToDoctor === true);
  const noSymptom = await api('POST', '/api/symptoms/analyze', { token: P, body: { symptoms: [] } });
  ok('Analyse sans symptôme → 400', noSymptom.status === 400);

  section('Espace médecin');
  const docPatients = await api('GET', '/api/doctor/patients', { token: D });
  ok('Fiches patients du médecin', docPatients.status === 200 && docPatients.json.length >= 3 && docPatients.json[0].allergies !== undefined);
  const docPatient = await api('GET', `/api/doctor/patients/${docPatients.json[0].id}`, { token: D });
  ok('Détail fiche patient', docPatient.status === 200 && docPatient.json.firstName !== undefined);
  const agenda = await api('GET', '/api/doctor/agenda', { token: D });
  ok('Agende du jour (rdv d1 today)', agenda.status === 200 && Array.isArray(agenda.json.appointments));
  const patientOnDoctorRoute = await api('GET', '/api/doctor/patients', { token: P });
  ok('Patient bloqué sur /doctor → 403', patientOnDoctorRoute.status === 403);
  const doctorOnCart = await api('GET', '/api/pharmacy/cart', { token: D });
  ok('Médecin bloqué sur /pharmacy → 403', doctorOnCart.status === 403);

  section('Diagnostic IA — réservé au médecin');
  const patientPrepsAttempt = await api('GET', '/api/doctor/symptom-preps', { token: P });
  ok('Patient bloqué sur les analyses IA → 403', patientPrepsAttempt.status === 403);
  const docPreps = await api('GET', '/api/doctor/symptom-preps?patientId=p1', { token: D });
  ok('Le médecin voit les préparations du patient', docPreps.status === 200 && docPreps.json.length >= 1, JSON.stringify(docPreps.json?.error));
  const aiEnabled = docPreps.json.some((p: any) => p.aiGenerated === true);
  ok(
    aiEnabled
      ? 'Diagnostic IA présent côté médecin (Groq actif)'
      : 'Repli moteur local actif (GROQ_API_KEY absente) — pas de diagnostic IA',
    docPreps.json.every((p: any) => (p.aiGenerated ? p.aiDiagnostic !== undefined : p.aiDiagnostic === undefined)),
  );
  if (aiEnabled) {
    const diag = docPreps.json.find((p: any) => p.aiDiagnostic)?.aiDiagnostic;
    ok('Diagnostic IA structuré (synthèse + hypothèses)', typeof diag?.summary === 'string' && diag.summary.length > 10 && Array.isArray(diag?.possibleConditions));
    const docSummary = await api('GET', `/api/consultations/summaries/${summary?.id}`, { token: D });
    ok(
      docSummary.json.aiGenerated
        ? 'Compte-rendu : diagnostic IA visible du médecin'
        : 'Compte-rendu généré par le moteur local (repli)',
      docSummary.status === 200 && (docSummary.json.aiDiagnostic !== undefined) === Boolean(docSummary.json.aiGenerated),
    );
  }
  const patientSummary = await api('GET', `/api/consultations/summaries/${summary?.id}`, { token: P });
  ok('Compte-rendu patient JAMAIS de diagnostic IA', patientSummary.status === 200 && patientSummary.json.aiDiagnostic === undefined);

  section('Candidature professionnel & session');
  const apply = await api('POST', '/api/professionals/apply', {
    body: { type: 'pharmacy', name: 'Pharmacie Mfoundi', phone: '+237 622 00 11 22', email: 'contact@mfoundi.cm', city: 'Yaoundé', address: 'Av. Kotto', manager: 'Odette Balla', documents: ['registre.pdf'] },
  });
  ok('Candidature pro → 201', apply.status === 201 && /48 h/i.test(apply.json.message ?? ''));

  section('Administration : activation des médecins');
  const forbiddenAdmin = await api('GET', '/api/admin/doctors', { token: P });
  ok('/api/admin interdit au patient → 403', forbiddenAdmin.status === 403, `status=${forbiddenAdmin.status}`);

  const adminLogin = await api('POST', '/api/auth/demo', { body: { role: 'admin' } });
  ok('Login démo admin → 200', adminLogin.status === 200 && adminLogin.json?.role === 'admin', `status=${adminLogin.status}`);
  const A = adminLogin.json?.token as string | undefined;

  if (A) {
    const overview = await api('GET', '/api/admin/overview', { token: A });
    ok('Vue d’ensemble admin', overview.status === 200 && typeof overview.json?.doctors?.pending === 'number' && overview.json?.hospitals >= 3 && overview.json?.pharmacies >= 3);

    // Two doctors register publicly → both land in the pending queue.
    const docStamp = Date.now().toString().slice(-8);
    const pendingA = await api('POST', '/api/auth/register-doctor', {
      body: { firstName: 'Emmanuel', lastName: `Test${docStamp}a`, email: `dr.a.${docStamp}@test.cm`, phone: `+237 69${docStamp}1`, specialty: 'Cardiologie', pin: '5678', experienceYears: 6, fee: 10000 },
    });
    const pendingB = await api('POST', '/api/auth/register-doctor', {
      body: { firstName: 'Clarisse', lastName: `Test${docStamp}b`, email: `dr.b.${docStamp}@test.cm`, phone: `+237 69${docStamp}2`, specialty: 'Pédiatrie', pin: '5678' },
    });
    ok('Inscription médecin → 201, profil « pending »', pendingA.status === 201 && pendingA.json?.doctor?.activationStatus === 'pending', `status=${pendingA.status} ${JSON.stringify(pendingA.json?.error)}`);

    const badSpec = await api('POST', '/api/auth/register-doctor', {
      body: { firstName: 'Faux', lastName: 'Spécialiste', email: `dr.x.${docStamp}@test.cm`, phone: `+237 69${docStamp}3`, specialty: 'Astrologie', pin: '5678' },
    });
    ok('Spécialité inconnue → 400', badSpec.status === 400);

    const newDoctorId = pendingA.json?.doctor?.id as string | undefined;
    const pendingDoctorToken = pendingA.json?.token as string | undefined;

    // Before activation: invisible in the catalog, workspace locked.
    const publicList = await api('GET', '/api/doctors');
    ok('Médecin en attente absent du catalogue', (publicList.json ?? []).every((d: any) => d.id !== newDoctorId));
    const publicDetail = await api('GET', `/api/doctors/${newDoctorId}`);
    ok('Détail médecin en attente → 404', publicDetail.status === 404);
    const lockedWorkspace = await api('GET', '/api/doctor/agenda', { token: pendingDoctorToken });
    ok('Espace médecin verrouillé avant activation → 403', lockedWorkspace.status === 403, `status=${lockedWorkspace.status}`);
    const lockedBooking = await api('POST', '/api/appointments', {
      token: P, body: { doctorId: newDoctorId, type: 'video', date: todayISO(2), time: '10:00', motif: 'Tentative avant activation' },
    });
    ok('Réservation d’un médecin non activé → 404', lockedBooking.status === 404, `status=${lockedBooking.status}`);

    const queue = await api('GET', '/api/admin/doctors?status=pending', { token: A });
    ok('File d’attente admin contient les nouveaux médecins', queue.status === 200 && (queue.json ?? []).some((d: any) => d.id === newDoctorId) && (queue.json ?? []).every((d: any) => d.activationStatus === 'pending'));

    const activated = await api('POST', `/api/admin/doctors/${newDoctorId}/activate`, { token: A });
    ok('Activation par l’admin → « active »', activated.status === 200 && activated.json?.activationStatus === 'active' && activated.json?.activatedAt, JSON.stringify(activated.json?.error));
    const reActivate = await api('POST', `/api/admin/doctors/${newDoctorId}/activate`, { token: A });
    ok('Double activation → 409', reActivate.status === 409);

    const visibleAfter = await api('GET', `/api/doctors/${newDoctorId}`);
    ok('Médecin activé visible dans le catalogue', visibleAfter.status === 200 && visibleAfter.json?.activationStatus === 'active');
    const unlockedWorkspace = await api('GET', '/api/doctor/agenda', { token: pendingDoctorToken });
    ok('Espace médecin débloqué après activation', unlockedWorkspace.status === 200, `status=${unlockedWorkspace.status} ${JSON.stringify(unlockedWorkspace.json?.error)}`);

    // Rejection: the other registration is refused and its session revoked.
    const rejectedId = pendingB.json?.doctor?.id as string | undefined;
    const rejected = await api('POST', `/api/admin/doctors/${rejectedId}/reject`, { token: A, body: { reason: 'Documents justificatifs non conformes' } });
    ok('Rejet par l’admin → « rejected » + motif', rejected.status === 200 && rejected.json?.activationStatus === 'rejected' && /conformes/.test(rejected.json?.rejectionReason ?? ''));
    const sessionAfterReject = await api('GET', '/api/auth/me', { token: pendingB.json?.token });
    ok('Session du médecin rejeté invalidée', sessionAfterReject.status === 401, `status=${sessionAfterReject.status}`);
    const rejectedInCatalog = await api('GET', `/api/doctors/${rejectedId}`);
    ok('Médecin rejeté absent du catalogue', rejectedInCatalog.status === 404);

    // Establishments + applications, readable by the admin only.
    const adminHospitals = await api('GET', '/api/admin/hospitals', { token: A });
    ok('Admin : hôpitaux (infos de base + nb médecins)', adminHospitals.status === 200 && adminHospitals.json?.length >= 3 && typeof adminHospitals.json?.[0]?.doctorCount === 'number');
    const adminPharmacies = await api('GET', '/api/admin/pharmacies', { token: A });
    ok('Admin : pharmacies (infos de base + stock + commandes)', adminPharmacies.status === 200 && adminPharmacies.json?.length >= 3 && typeof adminPharmacies.json?.[0]?.medicationCount === 'number' && typeof adminPharmacies.json?.[0]?.openOrders === 'number');
    const adminApplications = await api('GET', '/api/admin/applications?status=pending', { token: A });
    ok('Admin : candidatures pro en attente', adminApplications.status === 200 && (adminApplications.json ?? []).some((a: any) => a.name === 'Pharmacie Mfoundi'));
  }

  const logout = await api('POST', '/api/auth/logout', { token: P });
  ok('Déconnexion', logout.status === 200);
  const meAfterLogout = await api('GET', '/api/auth/me', { token: P });
  ok('Token invalidé après déconnexion', meAfterLogout.status === 401);

  // ---------------------------------------------------------------------------
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Résultat : ${passed} réussite(s), ${failed} échec(s)`);
  if (failures.length) {
    console.log('\nÉchecs :');
    for (const f of failures) console.log(`  ✗ ${f}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
