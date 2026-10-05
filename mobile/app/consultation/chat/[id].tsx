import { Fragment, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, ErrorState, Screen, useToast } from '@/components/ui';
import { ChatBubble } from '@/components/domain/ChatBubble';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { fullDate, nowTime, todayISO } from '@/utils/format';

// Chat wallpaper, kept close to the brand like WhatsApp's tinted doodle cloth.
const CHAT_BG = '#F2F0F6';

export default function ConsultationChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { threads, hydrating, addMessage, endThread, summaries } = useAppData();
  const { role } = useAuth();
  const { show } = useToast();
  const insets = useSafeAreaInsets();
  const thread = threads.find((t) => t.id === id);
  const [text, setText] = useState('');
  const listRef = useRef<ScrollView>(null);

  const isPatient = role !== 'doctor';
  const ended = thread?.status === 'ended';
  const hasSummary = thread?.appointmentId ? summaries.some((s) => s.appointmentId === thread.appointmentId) : false;

  const scrollToEnd = (animated = true) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  };

  useEffect(() => {
    scrollToEnd(false);
    const sub = Keyboard.addListener('keyboardDidShow', () => scrollToEnd());
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id]);

  // No router.back() effect here: on a deep link the threads are still loading
  // and navigating this early crashes expo-router. The branch below waits for
  // the initial sync, then shows an error state the user can leave from.
  if (!thread) {
    return (
      <Screen title="Conversation" onBack={() => router.back()}>
        {hydrating ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 120 }} />
        ) : (
          <ErrorState message="Cette conversation n’existe pas ou n’est plus accessible." />
        )}
      </Screen>
    );
  }

  // Each side sees its counterpart: patients see the doctor, doctors see the patient.
  const counterpartName = isPatient ? thread.doctorName : thread.patientName ?? 'Patient';

  // Date separators follow the real message days, not a hardcoded label.
  const dayChipLabel = (date?: string) => {
    if (!date) return null;
    if (date === todayISO()) return 'Aujourd’hui';
    if (date === todayISO(-1)) return 'Hier';
    return fullDate(date);
  };

  // Messages persist through POST /api/consultations/threads/:id/messages —
  // the server derives the sender from the session role.
  const send = (msg: Parameters<typeof addMessage>[1]) => {
    addMessage(thread.id, msg).catch((err) =>
      show(err instanceof Error ? err.message : 'Envoi impossible.', 'error'),
    );
  };

  const sendText = () => {
    const v = text.trim();
    if (!v) return;
    setText('');
    send({ sender: isPatient ? 'patient' : 'doctor', kind: 'text', text: v, time: nowTime() });
  };

  const endConsultation = async () => {
    try {
      // Closing the thread is allowed to both parties; closing the appointment
      // itself is the doctor's action (POST /api/appointments/:id/complete).
      await endThread(thread.id);
      show('Consultation terminée.', 'info');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Impossible de terminer la consultation.', 'error');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View>
          <Avatar name={counterpartName} size={40} />
          {!ended && <View style={styles.presenceDot} />}
        </View>
        <View style={{ flex: 1, marginLeft: spacing.s }}>
          <Text style={styles.headerName} numberOfLines={1}>{counterpartName}</Text>
          <View style={styles.headerStatusRow}>
            {ended ? (
              <Text style={styles.headerSub}>Consultation terminée</Text>
            ) : (
              <>
                <View style={styles.statusDot} />
                <Text style={[styles.headerSub, { color: colors.success }]}>En ligne</Text>
              </>
            )}
            {!isPatient && <Text style={styles.headerSub}> • Consultation par messagerie</Text>}
          </View>
        </View>
        {!ended && (
          <Pressable onPress={endConsultation} style={styles.endBtn} hitSlop={6}>
            <Ionicons name="checkmark-done" size={16} color={colors.danger} />
            <Text style={styles.endBtnText}>Terminer</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={{ flex: 1, backgroundColor: CHAT_BG }}>
          <Text style={styles.notice}>
            <Ionicons name="shield-checkmark" size={12} color={colors.textMuted} />  Échange confidentiel entre vous et votre médecin.
          </Text>
          <ScrollView
            ref={listRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: spacing.m, paddingTop: spacing.s }}
            onContentSizeChange={() => scrollToEnd()}
            keyboardShouldPersistTaps="handled"
          >
            {thread.messages.map((m, i) => {
              const prev = thread.messages[i - 1];
              const newDay = m.date !== undefined && prev?.date !== m.date;
              const sameSenderAsPrev = prev && prev.sender === m.sender && prev.kind !== 'system' && !newDay;
              const groupedWithNext = thread.messages[i + 1]?.sender === m.sender;
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <View style={styles.dateChip}>
                      <Text style={styles.dateChipText}>{dayChipLabel(m.date)}</Text>
                    </View>
                  )}
                  <ChatBubble
                    message={m}
                    isPatient={isPatient}
                    showTail={!sameSenderAsPrev}
                    flat={groupedWithNext}
                  />
                </Fragment>
              );
            })}
            {ended && (
              <View style={styles.endedCard}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <Text style={styles.endedTitle}>Consultation terminée</Text>
                <Text style={styles.endedText}>
                  Retrouvez ci-dessous le résumé, l’ordonnance et les recommandations du médecin.
                </Text>
                {/* Le compte-rendu IA est généré à la clôture du fil : la poussée
                    `chat:summary` fait apparaître le bouton dès qu'il est prêt. */}
                {thread.appointmentId && !hasSummary && (
                  <Text style={styles.endedPending}>Résumé IA en cours de génération…</Text>
                )}
                {hasSummary && thread.appointmentId && (
                  <Button
                    title="Voir le résumé de la consultation"
                    icon="sparkles"
                    size="sm"
                    onPress={() => router.push(`/consultation/summary/${thread.appointmentId}`)}
                    style={{ marginTop: spacing.m }}
                  />
                )}
              </View>
            )}
            <View style={{ height: spacing.s }} />
          </ScrollView>

          {!ended ? (
            <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
              <View style={styles.inputPill}>
                <TextInput
                  style={styles.input}
                  placeholder="Écrivez votre message…"
                  placeholderTextColor={colors.textFaint}
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={sendText}
                  returnKeyType="send"
                  blurOnSubmit={false}
                  multiline
                />
              </View>
              <Pressable
                onPress={sendText}
                disabled={!text.trim()}
                style={({ pressed }) => [
                  styles.sendBtn,
                  !text.trim() && styles.sendBtnMuted,
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
                hitSlop={4}
              >
                <Ionicons name="send" size={19} color={colors.white} style={{ marginLeft: -1 }} />
              </Pressable>
            </View>
          ) : (
            <View style={[styles.endedBar, { paddingBottom: insets.bottom + 10 }]}>
              <Ionicons name="lock-closed" size={13} color={colors.textFaint} />
              <Text style={styles.endedBarText}>Conversation archivée</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presenceDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: radii.full,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.card,
  },
  headerName: { fontSize: font.size.base, fontWeight: '800', color: colors.text },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.success,
    marginRight: 5,
  },
  headerSub: { fontSize: font.size.xs, color: colors.textMuted },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  endBtnText: { fontSize: font.size.xs, fontWeight: '700', color: colors.danger },
  notice: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.s,
    marginHorizontal: spacing.m,
  },
  dateChip: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: spacing.s,
    marginBottom: spacing.s,
  },
  dateChipText: { fontSize: font.size.xs, fontWeight: '600', color: colors.textMuted },
  endedCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.l,
    padding: spacing.m,
    alignItems: 'center',
    marginTop: spacing.s,
  },
  endedTitle: { fontSize: font.size.base, fontWeight: '800', color: colors.success, marginTop: 6 },
  endedText: { fontSize: font.size.xs, color: colors.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 17 },
  endedPending: { fontSize: font.size.xs, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.s },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.m,
    minHeight: 46,
    maxHeight: 110,
  },
  input: {
    flex: 1,
    fontSize: font.size.base,
    color: colors.text,
    paddingVertical: 12,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnMuted: { opacity: 0.35 },
  endedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.s,
  },
  endedBarText: { fontSize: font.size.xs, color: colors.textFaint, fontWeight: '600' },
});
