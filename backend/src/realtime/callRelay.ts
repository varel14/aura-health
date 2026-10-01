/**
 * Temps réel des consultations vidéo (relais d'images caméra).
 *
 * Chaque participant ouvre un socket, rejoint la salle de son rendez-vous et y
 * publie ses frames caméra (JPEG en base64, ~2 im/s). Le serveur authentifie le
 * socket avec le même token de session que l'API REST, vérifie que
 * l'utilisateur appartient bien au rendez-vous vidéo, puis relaie frames et
 * événements de présence à l'autre participant uniquement.
 */
import type { Server, Socket } from 'socket.io';
import { one } from '../db.js';

/** Taille max d'une frame acceptée (base64) — rejette les captures non compressées. */
const FRAME_MAX_BASE64 = 400_000;
const ROOM_PREFIX = 'call:';

interface SocketUser {
  id: string;
  role: string;
  displayName: string;
  patientId: string | null;
  doctorId: string | null;
}

/** Attache le relais d'appels vidéo au serveur socket.io. */
export function attachCallRelay(io: Server) {
  // Authentification au handshake : mêmes sessions que le middleware REST.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) return next(new Error('Authentification requise'));
      const row = await one<{
        id: string; role: string; display_name: string;
        patient_id: string | null; doctor_id: string | null;
      }>(
        `SELECT u.id, u.role, u.display_name, u.patient_id, u.doctor_id
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = $1 AND s.expires_at > now()`,
        [token],
      );
      if (!row) return next(new Error('Session expirée ou invalide'));
      socket.data.user = {
        id: row.id,
        role: row.role,
        displayName: row.display_name,
        patientId: row.patient_id,
        doctorId: row.doctor_id,
      } satisfies SocketUser;
      next();
    } catch (err) {
      next(err instanceof Error ? err : new Error('Authentification impossible'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    let room: string | null = null;

    const leaveCurrent = () => {
      if (!room) return;
      console.log(`[call] ${user.displayName} quitte ${room}`);
      socket.to(room).emit('call:peer-left');
      void socket.leave(room);
      room = null;
    };

    socket.on('call:join', async (payload: unknown, ack?: (res: unknown) => void) => {
      const appointmentId = String((payload as { appointmentId?: unknown })?.appointmentId ?? '');
      const respond = (res: unknown) => (typeof ack === 'function' ? ack(res) : undefined);
      if (!appointmentId) return respond({ ok: false, error: 'Rendez-vous manquant' });

      const appt = await one<{ doctor_id: string; patient_id: string; type: string }>(
        `SELECT doctor_id, patient_id, type FROM appointments WHERE id = $1`,
        [appointmentId],
      );
      if (!appt) return respond({ ok: false, error: 'Rendez-vous introuvable' });
      if (appt.type !== 'video') return respond({ ok: false, error: 'Ce rendez-vous n’est pas une consultation vidéo' });
      const isParticipant =
        (user.patientId !== null && user.patientId === appt.patient_id) ||
        (user.doctorId !== null && user.doctorId === appt.doctor_id);
      if (!isParticipant) return respond({ ok: false, error: 'Accès refusé à cette consultation' });

      leaveCurrent();
      room = ROOM_PREFIX + appointmentId;
      await socket.join(room);
      const sockets = await io.in(room).fetchSockets();
      const peerPresent = sockets.some((s) => s.id !== socket.id);
      if (peerPresent) socket.to(room).emit('call:peer-joined');
      console.log(`[call] ${user.displayName} (${user.role}) a rejoint ${room} — correspondant présent : ${peerPresent}`);
      respond({ ok: true, peerPresent });
    });

    socket.on('call:frame', (payload: unknown) => {
      const data = (payload as { data?: unknown })?.data;
      if (room && typeof data === 'string' && data.length > 0 && data.length <= FRAME_MAX_BASE64) {
        socket.to(room).emit('call:frame', { data });
      }
    });

    /** État caméra du participant (pour afficher « caméra coupée » en face). */
    socket.on('call:state', (payload: unknown) => {
      const camOn = (payload as { camOn?: unknown })?.camOn;
      if (room && typeof camOn === 'boolean') {
        socket.to(room).emit('call:state', { camOn });
      }
    });

    socket.on('call:leave', leaveCurrent);
    socket.on('disconnect', leaveCurrent);
  });
}
