/**
 * Test de bout en bout du relais vidéo (socket.io) — exécuter backend démarré :
 *   node scripts/call-relay-check.mjs
 */
import { io } from 'socket.io-client';

const API = 'http://localhost:4000';
const APPT = process.argv[2] ?? 'appt10';

const failures = [];
const check = (name, cond) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures.push(name);
};

async function login(phone) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, pin: '1234' }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`login ${phone}: ${JSON.stringify(json)}`);
  return json.token;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(API, { transports: ['websocket'], auth: { token }, reconnection: false });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
}

const join = (socket, appointmentId) =>
  new Promise((resolve) => socket.timeout(5000).emit('call:join', { appointmentId }, (err, res) => resolve(err ? { ok: false, error: String(err) } : res)));

const once = (socket, event, timeoutMs = 4000) =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), timeoutMs);
    socket.once(event, (p) => { clearTimeout(t); resolve(p); });
  });

const main = async () => {
  const [patientToken, doctorToken, pharmacistToken] = await Promise.all([
    login('+237 691 45 78 20'),
    login('+237 690 00 00 01'),
    login('+237 622 21 45 90'),
  ]);
  check('logins patient / médecin / pharmacien', !!patientToken && !!doctorToken && !!pharmacistToken);

  // 1. Token invalide rejeté au handshake
  await new Promise((resolve) => {
    const bad = io(API, { transports: ['websocket'], auth: { token: 'nope' }, reconnection: false });
    bad.on('connect_error', () => { check('handshake rejeté avec un token invalide', true); bad.close(); resolve(); });
    bad.on('connect', () => { check('handshake rejeté avec un token invalide', false); bad.close(); resolve(); });
  });

  const patient = await connect(patientToken);
  const doctor = await connect(doctorToken);

  // 2. RDV non vidéo refusé
  const chatJoin = await join(patient, 'appt2');
  check('jointure refusée sur un RDV non vidéo', chatJoin.ok === false);

  // 3. Non-participant refusé (pharmacien)
  const pharmacist = await connect(pharmacistToken);
  const foreignJoin = await join(pharmacist, APPT);
  check('jointure refusée pour un non-participant', foreignJoin.ok === false);
  pharmacist.close();

  // 4. Jointure patient puis médecin + présence
  const peerJoinedP = once(patient, 'call:peer-joined');
  const first = await join(patient, APPT);
  check('patient rejoint la salle (peerPresent=false)', first.ok === true && first.peerPresent === false);
  const second = await join(doctor, APPT);
  check('médecin rejoint la salle (peerPresent=true)', second.ok === true && second.peerPresent === true);
  check('patient notifié de l’arrivée du médecin', (await peerJoinedP) !== null);

  // 5. Relais des frames dans les deux sens
  const frameAtDoctor = once(doctor, 'call:frame');
  patient.emit('call:frame', { data: 'PATIENT-JPEG-BASE64' });
  check('frame patient → médecin', (await frameAtDoctor)?.data === 'PATIENT-JPEG-BASE64');

  const frameAtPatient = once(patient, 'call:frame');
  doctor.emit('call:frame', { data: 'DOCTEUR-JPEG-BASE64' });
  check('frame médecin → patient', (await frameAtPatient)?.data === 'DOCTEUR-JPEG-BASE64');

  // 6. Frame trop grosse rejetée (silencieusement)
  const stray = once(patient, 'call:frame', 800);
  doctor.emit('call:frame', { data: 'x'.repeat(500_000) });
  check('frame surdimensionnée non relayée', (await stray) === null);

  // 7. État caméra relayé
  const stateAtPatient = once(patient, 'call:state');
  doctor.emit('call:state', { camOn: false });
  check('état caméra relayé au correspondant', (await stateAtPatient)?.camOn === false);

  // 8. Départ du médecin → peer-left côté patient
  const leftAtPatient = once(patient, 'call:peer-left');
  doctor.close();
  check('patient notifié du départ du médecin', (await leftAtPatient) !== null);

  // 9. Ré-émission apres reconnexion du patient sur le second créneau
  const other = await join(patient, 'appt11');
  check('le patient peut rejoindre l’autre salle (appt11)', other.ok === true);
  const stranger = await connect(doctorToken);
  const otherJoin = await join(stranger, 'appt11');
  check('médecin voit le patient sur appt11', otherJoin.ok === true && otherJoin.peerPresent === true);
  stranger.close();

  patient.close();
  console.log(failures.length ? `\n${failures.length} échec(s)` : '\nTous les checks passent 🎉');
  process.exit(failures.length ? 1 : 0);
};

main().catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
