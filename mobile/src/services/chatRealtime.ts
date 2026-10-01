/**
 * Socket temps réel de la messagerie de consultation.
 *
 * Les messages restent envoyés et stockés via l'API REST ; ce socket reçoit
 * uniquement les poussées du serveur (`chat:message`, `chat:thread-ended`,
 * `chat:summary` — compte-rendu généré à la clôture) afin que le
 * correspondant les voie instantanément, sans attendre le prochain
 * rafraîchissement. Un socket par session : il (re)démarre à chaque
 * changement de token et se coupe à la déconnexion. Côté serveur :
 * `backend/src/realtime/chatHub.ts`.
 */
import { io, type Socket } from 'socket.io-client';
import { API_BASE, getToken } from './api';
import { ChatMessage } from '../models/types';

export interface ChatMessageEvent {
  threadId: string;
  message: ChatMessage;
}

export interface ChatThreadEndedEvent {
  threadId: string;
  endedAt?: string;
}

/**
 * Poussée à la clôture d'un fil dont le compte-rendu IA vient d'être généré.
 * Le payload ne porte que des identifiants : chaque client relit le
 * compte-rendu via l'API, qui filtre le bloc diagnostique selon le rôle.
 */
export interface ChatSummaryEvent {
  threadId?: string | null;
  appointmentId: string;
  summaryId: string;
}

let socket: Socket | null = null;
let boundToken: string | null = null;
const messageHandlers = new Set<(event: ChatMessageEvent) => void>();
const endedHandlers = new Set<(event: ChatThreadEndedEvent) => void>();
const summaryHandlers = new Set<(event: ChatSummaryEvent) => void>();

/**
 * Aligne l'état du socket sur la session courante : connexion à l'ouverture
 * d'une session, reconnexion si le token change, coupure à la déconnexion.
 */
export function syncChatRealtime(token: string | null | undefined) {
  const current = token ?? getToken() ?? null;
  if (!current) {
    if (socket) {
      socket.disconnect();
      socket = null;
      boundToken = null;
    }
    return;
  }
  if (socket && boundToken === current) return;
  if (socket) socket.disconnect();

  boundToken = current;
  socket = io(API_BASE, {
    transports: ['websocket'],
    auth: { token: current },
    reconnectionDelay: 800,
  });

  socket.on('chat:message', (payload: unknown) => {
    const event = payload as ChatMessageEvent;
    if (event && typeof event.threadId === 'string' && event.message?.id) {
      messageHandlers.forEach((cb) => cb(event));
    }
  });
  socket.on('chat:thread-ended', (payload: unknown) => {
    const event = payload as ChatThreadEndedEvent;
    if (event && typeof event.threadId === 'string') {
      endedHandlers.forEach((cb) => cb(event));
    }
  });
  socket.on('chat:summary', (payload: unknown) => {
    const event = payload as ChatSummaryEvent;
    if (event && typeof event.summaryId === 'string') {
      summaryHandlers.forEach((cb) => cb(event));
    }
  });
}

/** S'abonne aux messages poussés par le serveur ; renvoie la désinscription. */
export function onChatMessage(cb: (event: ChatMessageEvent) => void): () => void {
  messageHandlers.add(cb);
  return () => messageHandlers.delete(cb);
}

/** S'abonne aux clôtures de fil poussées par le serveur. */
export function onChatThreadEnded(cb: (event: ChatThreadEndedEvent) => void): () => void {
  endedHandlers.add(cb);
  return () => endedHandlers.delete(cb);
}

/** S'abonne aux compte-rendus générés automatiquement à la clôture d'un fil. */
export function onChatSummary(cb: (event: ChatSummaryEvent) => void): () => void {
  summaryHandlers.add(cb);
  return () => summaryHandlers.delete(cb);
}
