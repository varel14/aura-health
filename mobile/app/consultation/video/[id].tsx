import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { colors, font, radii, shadow, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { doctorService } from '@/services';
import { connectCall, frameToDataUri, type CallClient } from '@/services/callClient';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';

/**
 * Consultation vidéo à deux : chaque participant diffuse ses frames caméra
 * (JPEG base64, ~2 im/s) via le relais socket du backend et affiche en
 * plein écran le flux reçu de l'autre — le patient et le médecin se voient
 * mutuellement. L'aperçu en vignette reste sa propre caméra.
 */
export default function VideoConsultation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appointments, updateAppointment } = useAppData();
  const { role } = useAuth();
  const { show } = useToast();
  const appointment = appointments.find((a) => a.id === id);
  const insets = useSafeAreaInsets();
  const isDoctor = role === 'doctor';

  const [phase, setPhase] = useState<'connecting' | 'connected'>('connecting');
  const [link, setLink] = useState<'online' | 'offline'>('online');
  const [peerPresent, setPeerPresent] = useState(false);
  const [remoteCamOn, setRemoteCamOn] = useState(true);
  const [remoteFrame, setRemoteFrame] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [front, setFront] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const [cameraReady, setCameraReady] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const callRef = useRef<CallClient | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    if (camOn && cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain) {
      requestCameraPermission();
    }
  }, [camOn, cameraPermission, requestCameraPermission]);

  const { data: doctor } = useAsync(
    () => (appointment ? doctorService.get(appointment.doctorId) : Promise.resolve(undefined)),
    [appointment?.doctorId],
  );
  // Le correspondant est l'autre partie : le patient voit le médecin, le médecin voit le patient.
  const remoteLabel = isDoctor
    ? (appointment?.patientName ?? 'Patient')
    : doctor
      ? `Dr ${doctor.firstName} ${doctor.lastName}`
      : 'Médecin';
  const remoteSub = isDoctor
    ? appointment ? `${appointment.patientAge} ans` : ''
    : (doctor?.specialty ?? 'Médecine');

  // Liaison temps réel : joint la salle du rendez-vous, reçoit les frames du
  // correspondant et les événements de présence.
  useEffect(() => {
    let cancelled = false;
    let call: CallClient | null = null;
    void connectCall(id).then((client) => {
      if (cancelled) {
        client.close();
        return;
      }
      call = client;
      callRef.current = client;
      const offs = [
        client.onFrame(setRemoteFrame),
        client.onPeer(setPeerPresent),
        client.onRemoteState((s) => setRemoteCamOn(s.camOn)),
        client.onLink(setLink),
      ];
      client.join().then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setPhase('connected');
          if (res.peerPresent) setPeerPresent(true);
        } else {
          show(res.error ?? 'Connexion à l’appel impossible.', 'error');
          // Mode local : l'écran reste utilisable même si le relais est injoignable.
          setPhase('connected');
        }
      });
    });
    return () => {
      cancelled = true;
      call?.close();
      callRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Diffusion : boucle de capture de notre caméra tant que la nôtre est allumée.
  useEffect(() => {
    let stop = false;
    (async () => {
      while (!stop) {
        const call = callRef.current;
        const cam = cameraRef.current;
        if (camOn && cameraReady && cameraPermission?.granted && call && cam) {
          try {
            const pic = await cam.takePictureAsync({
              quality: 0.35,
              base64: true,
              exif: false,
              shutterSound: false,
              imageType: 'jpg',
              scale: 0.4,
            });
            if (pic?.base64 && !stop) call.sendFrame(pic.base64);
          } catch {
            /* capture ignorée, on retente au prochain tour */
          }
        }
        await new Promise<void>((resolve) => setTimeout(resolve, camOn ? 350 : 200));
      }
    })();
    return () => {
      stop = true;
    };
  }, [camOn, cameraReady, cameraPermission?.granted]);

  const handleCamToggle = useCallback(
    (next: boolean) => {
      setCamOn(next);
      callRef.current?.sendState({ camOn: next });
    },
    [],
  );

  const onCameraReady = useCallback(async () => {
    setCameraReady(true);
    // Petites captures = relayage fluide : on retient la plus petite taille dispo.
    try {
      const sizes = await cameraRef.current?.getAvailablePictureSizesAsync();
      if (sizes?.length) {
        const smallest = sizes
          .map((s) => {
            const [w, h] = s.split('x').map(Number);
            return { s, area: (w || 0) * (h || 0) };
          })
          .filter((v) => v.area > 0)
          .sort((a, b) => a.area - b.area)[0];
        if (smallest) setPictureSize(smallest.s);
      }
    } catch {
      /* web : tailles non exposées, la capture suit la résolution webcam */
    }
  }, []);

  useEffect(() => {
    if (phase === 'connected') {
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase]);

  const duration = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const endCall = async () => {
    if (timer.current) clearInterval(timer.current);
    callRef.current?.close();
    // Hanging up closes the consultation for good, whichever side presses the
    // button: the server marks it completed (idempotent — the second
    // participant to hang up is a no-op) and generates the AI summary, so no
    // cancel / reschedule / symptom-prep action remains available afterwards.
    if (appointment && appointment.status !== 'completed' && appointment.status !== 'cancelled') {
      try {
        await updateAppointment(appointment.id, { status: 'completed' });
      } catch (err) {
        show(err instanceof Error ? err.message : 'Clôture impossible.', 'error');
      }
    }
    // Fin d'appel : chacun retourne à sa liste de rendez-vous
    // (le résumé IA reste accessible depuis le détail du rendez-vous).
    router.replace(role === 'doctor' ? '/agenda' : '/appointments');
  };

  const showRemoteVideo = phase === 'connected' && remoteCamOn && !!remoteFrame;

  return (
    <View style={styles.screen}>
      {/* Flux vidéo du correspondant (plein écran) */}
      <View style={styles.remote}>
        {showRemoteVideo ? (
          <Image
            source={{ uri: frameToDataUri(remoteFrame) }}
            style={styles.remoteVideo}
            resizeMode="cover"
          />
        ) : (
          <View style={{ alignItems: 'center' }}>
            {phase === 'connecting' || link === 'offline' ? (
              <>
                <Avatar name={remoteLabel} size={110} />
                <Text style={styles.connectingText}>
                  {link === 'offline' ? 'Connexion instable…' : 'Connexion sécurisée…'}
                </Text>
                <View style={styles.connectDots}>
                  <View style={styles.dot1} />
                  <View style={styles.dot2} />
                  <View style={styles.dot3} />
                </View>
                <Text style={styles.connectingSub}>Chiffrement de bout en bout actif</Text>
              </>
            ) : (
              <>
                <View style={styles.remoteRing}>
                  <Avatar name={remoteLabel} size={130} />
                  {peerPresent && <View style={styles.liveDot} />}
                </View>
                <Text style={styles.remoteName}>{remoteLabel}</Text>
                <Text style={styles.remoteSub}>
                  {peerPresent
                    ? remoteCamOn
                      ? 'Ouverture de la caméra…'
                      : 'Caméra désactivée'
                    : 'En attente de votre correspondant…'}
                </Text>
                <View style={styles.timerPill}>
                  <Ionicons name="radio" size={12} color={peerPresent ? colors.success : 'rgba(255,255,255,0.5)'} />
                  <Text style={styles.timerText}>{duration}</Text>
                </View>
              </>
            )}
          </View>
        )}
        {showRemoteVideo && (
          <View style={styles.remoteOverlay} pointerEvents="none">
            <View style={styles.remoteRingSmall}>
              <Avatar name={remoteLabel} size={44} />
              {peerPresent && <View style={styles.liveDot} />}
            </View>
            <Text style={styles.remoteNameSmall}>{remoteLabel}</Text>
          </View>
        )}
      </View>

      {/* Aperçu de notre propre caméra (ce que le correspondant reçoit) */}
      {camOn && (
        <View style={[styles.preview, { top: insets.top + 16 }]}>
          {cameraPermission?.granted ? (
            <>
              <CameraView
                ref={cameraRef}
                style={styles.previewCamera}
                facing={front ? 'front' : 'back'}
                mirror={front}
                animateShutter={false}
                pictureSize={pictureSize}
                onCameraReady={onCameraReady}
                active
              />
              <View style={styles.previewBadge} pointerEvents="none">
                <Text style={styles.previewLabel}>Vous{front ? '' : ' (arrière)'}</Text>
              </View>
            </>
          ) : cameraPermission === null ? (
            <View style={styles.previewInner}>
              <Avatar name="Stéphane Nkodo" size={40} />
              <Text style={styles.previewLabel}>Vous</Text>
            </View>
          ) : (
            <Pressable style={styles.previewInner} onPress={() => requestCameraPermission()}>
              <Ionicons name="videocam-off" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.previewLabel}>Autoriser la caméra</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Bandeau état */}
      {phase === 'connected' && (
        <View style={[styles.statusBar, { top: insets.top + 16 + (camOn ? 120 : 0) }]}>
          <Ionicons name="lock-closed" size={11} color={colors.white} />
          <Text style={styles.statusText}>
            {peerPresent ? 'Consultation vidéo en cours' : 'En attente du correspondant'}
          </Text>
        </View>
      )}

      {/* Contrôles */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        {phase === 'connecting' ? (
          <>
            <CtrlButton icon="close" label="Annuler" onPress={() => router.back()} danger />
            <CtrlButton
              icon={micOn ? 'mic' : 'mic-off'}
              label={micOn ? 'Micro' : 'Micro off'}
              active={micOn}
              onPress={() => setMicOn((v) => !v)}
            />
            <CtrlButton
              icon={camOn ? 'videocam' : 'videocam-off'}
              label={camOn ? 'Caméra' : 'Caméra off'}
              active={camOn}
              onPress={() => handleCamToggle(!camOn)}
            />
          </>
        ) : (
          <>
            <CtrlButton
              icon={micOn ? 'mic' : 'mic-off'}
              label={micOn ? 'Micro' : 'Micro off'}
              active={micOn}
              onPress={() => setMicOn((v) => !v)}
            />
            <CtrlButton
              icon={camOn ? 'videocam' : 'videocam-off'}
              label={camOn ? 'Caméra' : 'Caméra off'}
              active={camOn}
              onPress={() => handleCamToggle(!camOn)}
            />
            <CtrlButton
              icon="volume-high"
              label="Son"
              active={speakerOn}
              onPress={() => setSpeakerOn((v) => !v)}
            />
            <CtrlButton icon="camera-reverse" label="Pivoter" active onPress={() => setFront((v) => !v)} />
            <CtrlButton icon="call" label="Raccrocher" danger big onPress={endCall} />
          </>
        )}
      </View>

      {phase === 'connecting' && (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>
            Assurez-vous d’être dans un endroit calme et bien éclairé pour votre consultation.
          </Text>
        </View>
      )}
    </View>
  );
}

function CtrlButton({
  icon,
  label,
  onPress,
  active = true,
  danger,
  big,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  active?: boolean;
  danger?: boolean;
  big?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: 6 }}>
      <View
        style={[
          styles.ctrl,
          big && styles.ctrlBig,
          danger && styles.ctrlDanger,
          !active && !danger && styles.ctrlInactive,
        ]}
      >
        <Ionicons name={icon} size={big ? 26 : 22} color={danger ? colors.white : active ? colors.white : colors.textMuted} />
      </View>
      <Text style={styles.ctrlLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark },
  remote: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  remoteVideo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  remoteOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 150,
    alignItems: 'center',
    gap: 6,
  },
  remoteRingSmall: { padding: 3, borderRadius: 100, borderWidth: 2, borderColor: colors.primary },
  remoteNameSmall: {
    color: colors.white,
    fontSize: font.size.sm,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  connectingText: { color: colors.white, fontSize: font.size.lg, fontWeight: '700', marginTop: spacing.m },
  connectingSub: { color: 'rgba(255,255,255,0.5)', fontSize: font.size.xs, marginTop: 4 },
  connectDots: { flexDirection: 'row', gap: 6, marginTop: spacing.m },
  dot1: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  dot2: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, opacity: 0.6 },
  dot3: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, opacity: 0.3 },
  remoteRing: {
    padding: 8,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  liveDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.dark,
  },
  remoteName: { color: colors.white, fontSize: font.size.xl, fontWeight: '800', marginTop: spacing.m },
  remoteSub: { color: 'rgba(255,255,255,0.6)', fontSize: font.size.sm, marginTop: 2 },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: spacing.m,
  },
  timerText: { color: colors.white, fontWeight: '700', fontSize: font.size.sm },
  preview: {
    position: 'absolute',
    right: spacing.m,
    width: 120,
    height: 110,
    borderRadius: radii.l,
    backgroundColor: '#1C3430',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    ...shadow.float,
  },
  previewInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  previewCamera: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  previewBadge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 6,
    alignItems: 'center',
  },
  previewLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, textAlign: 'center' },
  statusBar: {
    position: 'absolute',
    left: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: spacing.m,
    paddingHorizontal: spacing.m,
  },
  ctrl: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBig: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.danger },
  ctrlDanger: { backgroundColor: colors.danger },
  ctrlInactive: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  ctrlLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },
  hintBar: {
    position: 'absolute',
    left: spacing.l,
    right: spacing.l,
    bottom: 140,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.m,
    padding: spacing.m,
  },
  hintText: { color: 'rgba(255,255,255,0.85)', fontSize: font.size.xs, textAlign: 'center', lineHeight: 17 },
});
