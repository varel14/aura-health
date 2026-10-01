/**
 * Socket temps réel d'une consultation vidéo.
 *
 * Chaque participant publie ses frames caméra (JPEG en base64, ~2 im/s) dans la
 * salle de son rendez-vous et reçoit celles de l'autre — c'est ce qui permet
 * aux deux parties de se voir en direct, y compris depuis Expo Go (aucun
 * module natif WebRTC requis). Le relais et l'authentification côté serveur :
 * `backend/src/realtime/callRelay.ts`.
 */
import { io, type Socket } from 'socket.io-client';
import { API_BASE, getToken, restoreToken } from './api';

export interface CallJoinResult {
  ok: boolean;
  peerPresent: boolean;
  error?: string;
}

export interface CallClient {
  join(): Promise<CallJoinResult>;
  /** Publie une frame caméra (base64, sans préfixe data:) dans la salle. */
  sendFrame(base64: string): void;
  /** Signale à l'autre participant l'état de notre caméra. */
  sendState(state: { camOn: boolean }): void;
  onFrame(cb: (base64: string) => void): () => void;
  onPeer(cb: (present: boolean) => void): () => void;
  onRemoteState(cb: (state: { camOn: boolean }) => void): () => void;
  /** 'online' = socket connecté au serveur, 'offline' = liaison perdue. */
  onLink(cb: (link: 'online' | 'offline') => void): () => void;
  close(): void;
}

/** Convertit du base64 brut en URI de données, en détectant le format réel. */
export function frameToDataUri(base64: string): string {
  const raw = stripDataUrlPrefix(base64);
  const mime = raw.startsWith('/9j/') ? 'image/jpeg' : raw.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${raw}`;
}

/** expo-camera renvoie un data URL complet sur le web, du base64 brut en natif. */
function stripDataUrlPrefix(base64: string): string {
  const match = /^data:image\/[a-z+]+;base64,/.exec(base64);
  return match ? base64.slice(match[0].length) : base64;
}

export async function connectCall(appointmentId: string): Promise<CallClient> {
  // Session persistée : le token peut ne pas être encore restauré au montage
  // profond de l'écran d'appel (lien direct / notification).
  await restoreToken();
  const socket: Socket = io(API_BASE, {
    transports: ['websocket'],
    // Recalculé à CHAQUE tentative de connexion : le token peut arriver après
    // la création du socket (reconnexions, restauration de session lente).
    auth: (cb) => cb({ token: getToken() }),
    reconnectionDelay: 800,
  });

  let joined = false; // jointure déjà réussie
  let wantsJoin = false; // intention de participer (survit aux échecs/transitoires)
  const frameCbs = new Set<(base64: string) => void>();
  const peerCbs = new Set<(present: boolean) => void>();
  const stateCbs = new Set<(state: { camOn: boolean }) => void>();
  const linkCbs = new Set<(link: 'online' | 'offline') => void>();

  const joinRequest = (): Promise<CallJoinResult> =>
    new Promise((resolve) => {
      let settled = false;
      const done = (res: CallJoinResult) => {
        if (!settled) {
          settled = true;
          resolve(res);
        }
      };
      socket.timeout(8000).emit('call:join', { appointmentId }, (err: Error | null, res?: CallJoinResult) => {
        if (err) done({ ok: false, peerPresent: false, error: 'Serveur injoignable' });
        else done({ ok: !!res?.ok, peerPresent: !!res?.peerPresent, error: res?.error });
      });
    });

  socket.on('connect', () => {
    linkCbs.forEach((cb) => cb('online'));
    // (Re)connexion : on reparticipe automatiquement dès qu'on le souhaite —
    // couvre le 1er essai pendant le démarrage de la page et les coupures réseau.
    if (wantsJoin) void joinRequest().then((res) => { if (res.ok) joined = true; });
  });
  socket.on('disconnect', () => linkCbs.forEach((cb) => cb('offline')));
  socket.on('call:frame', (payload: { data?: string }) => {
    if (typeof payload?.data === 'string' && payload.data) frameCbs.forEach((cb) => cb(payload.data!));
  });
  socket.on('call:peer-joined', () => peerCbs.forEach((cb) => cb(true)));
  socket.on('call:peer-left', () => peerCbs.forEach((cb) => cb(false)));
  socket.on('call:state', (payload: { camOn?: boolean }) => {
    if (typeof payload?.camOn === 'boolean') stateCbs.forEach((cb) => cb({ camOn: payload.camOn! }));
  });

  return {
    join: async () => {
      wantsJoin = true;
      const res = await joinRequest();
      if (res.ok) joined = true;
      return res;
    },
    sendFrame: (base64) => socket.emit('call:frame', { data: stripDataUrlPrefix(base64) }),
    sendState: (state) => socket.emit('call:state', state),
    onFrame: (cb) => {
      frameCbs.add(cb);
      return () => frameCbs.delete(cb);
    },
    onPeer: (cb) => {
      peerCbs.add(cb);
      return () => peerCbs.delete(cb);
    },
    onRemoteState: (cb) => {
      stateCbs.add(cb);
      return () => stateCbs.delete(cb);
    },
    onLink: (cb) => {
      linkCbs.add(cb);
      return () => linkCbs.delete(cb);
    },
    close: () => {
      wantsJoin = false;
      socket.disconnect();
    },
  };
}
