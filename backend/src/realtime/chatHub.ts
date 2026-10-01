/**
 * Temps réel de la messagerie de consultation.
 *
 * Le stockage reste transactionnel via l'API REST (POST …/messages) ; le hub
 * se contente de pousser chaque message enregistré — et la clôture d'un fil —
 * aux deux parties, sur toutes leurs sessions ouvertes. L'authentification du
 * handshake est partagée avec le relais vidéo (`callRelay`, middleware
 * `io.use`) : chaque socket arrive déjà authentifié dans `socket.data.user`.
 */
import type { Server } from 'socket.io';
import { query } from '../db.js';

let ioRef: Server | null = null;

const userRoom = (userId: string) => `user:${userId}`;

/** Attache le hub chat : chaque socket authentifié rejoint sa salle personnelle. */
export function attachChatHub(io: Server) {
  ioRef = io;
  io.on('connection', (socket) => {
    const user = socket.data.user as { id?: string } | undefined;
    if (user?.id) void socket.join(userRoom(user.id));
  });
}

/** Retrouve les comptes utilisateurs des deux parties d'un fil de discussion. */
async function threadUserIds(patientId: string, doctorId: string): Promise<string[]> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users
     WHERE (role = 'patient' AND patient_id = $1) OR (role = 'doctor' AND doctor_id = $2)`,
    [patientId, doctorId],
  );
  return rows.map((r) => r.id);
}

/**
 * Pousse un événement aux deux participants du fil (émetteur inclus : ses
 * autres sessions — et le client, qui dédoublonne par id — restent à jour).
 */
export async function broadcastToThread(
  patientId: string,
  doctorId: string,
  event: string,
  payload: unknown,
) {
  if (!ioRef) return;
  try {
    for (const userId of await threadUserIds(patientId, doctorId)) {
      ioRef.to(userRoom(userId)).emit(event, payload);
    }
  } catch {
    /* la diffusion temps réel ne doit jamais faire échouer la requête REST */
  }
}
