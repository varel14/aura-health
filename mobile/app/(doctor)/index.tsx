import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, EmptyState, SectionHeader, useToast } from '@/components/ui';
import { PatientAppointmentRow } from '@/components/domain';
import { colors, font, radii, shadow, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/services/api';
import { doctorWorkspaceService, hospitalService } from '@/services';
import { Doctor, Hospital, SymptomPrep } from '@/models/types';
import { dayLabel, fcfa } from '@/utils/format';

/** Workspace owner: real profile when the session is hydratable, demo fallback otherwise. */
function useDoctorProfile() {
  return useAsync(async () => {
    try {
      const me = await api<{ role: string; doctor?: Doctor }>('/api/auth/me');
      if (!me.doctor) return undefined;
      const hospital = await hospitalService.get(me.doctor.hospitalId).catch(() => undefined);
      return { doctor: me.doctor, hospital };
    } catch {
      return undefined;
    }
  }, []);
}

const priorityColor = (p: SymptomPrep['priority']) =>
  p === 'élevée' ? colors.danger : p === 'modérée' ? colors.warning : colors.success;

export default function DoctorHome() {
  const { threads } = useAppData();
  const { show } = useToast();
  const insets = useSafeAreaInsets();
  const agenda = useAsync(() => doctorWorkspaceService.dayAppointments(), []);
  const preps = useAsync(() => doctorWorkspaceService.patientSymptomPreps(), []);
  const profile = useDoctorProfile();

  const doctor = profile.data?.doctor;
  const hospital: Hospital | undefined = profile.data?.hospital;
  const doctorName = doctor ? `Dr ${doctor.firstName} ${doctor.lastName}` : 'Dr Vanessa Mbarga';
  const doctorLastName = doctor ? `Dr ${doctor.lastName}` : 'Dr Mbarga';

  const items = agenda.data?.appointments ?? [];
  const completed = items.filter((a) => a.status === 'completed').length;
  const waiting = items.filter((a) => a.status === 'pending').length;
  const revenue = items.filter((a) => a.paid).reduce((sum, a) => sum + a.fee, 0);
  const next = items.find((a) => a.status === 'confirmed');
  const unread = threads.filter((t) => t.status === 'active').length;
  const prepList = preps.data ?? [];
  const nextThread = next ? threads.find((t) => t.appointmentId === next.id) : undefined;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: insets.top + spacing.s }} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Avatar name={doctorName} size={48} />
          <View style={{ marginLeft: spacing.m, flex: 1 }}>
            <Text style={styles.greeting}>Bonjour {doctorLastName} 👋</Text>
            <Text style={styles.greetingSub} numberOfLines={1}>
              {doctor ? `${doctor.specialty} • ${hospital?.name ?? ''}` : 'Médecine générale • Centre Médical de Bastos'}
            </Text>
          </View>
        </View>
        <Pressable style={styles.bell} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications" size={21} color={colors.text} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>RDV aujourd’hui</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{waiting}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.info }]}>{unread}</Text>
          <Text style={styles.statLabel}>Discussions</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{prepList.length}</Text>
          <Text style={styles.statLabel}>Prépas IA</Text>
        </View>
      </View>

      {next && (
        <View style={styles.nextCard}>
          <View style={styles.nextLabelRow}>
            <View style={styles.liveDot} />
            <Text style={styles.nextLabel}>PROCHAIN PATIENT — AUJOURD’HUI</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.m }}>
            <Avatar name={next.patientName} size={54} />
            <View style={{ flex: 1, marginLeft: spacing.m }}>
              <Text style={styles.nextName}>{next.patientName}</Text>
              <Text style={styles.nextMotif} numberOfLines={2}>{next.motif}</Text>
            </View>
            <View style={styles.nextTime}>
              <Text style={styles.nextTimeText}>{next.time}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.s, marginTop: spacing.l }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Ouvrir le dossier"
                variant="soft"
                onPress={() => router.push(`/(doctor)/patients/${next.patientId}`)}
                fullWidth
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={next.type === 'video' ? 'Démarrer la vidéo' : next.type === 'chat' ? 'Ouvrir le chat' : 'Voir le RDV'}
                onPress={() =>
                  next.type === 'video'
                    ? router.push(`/consultation/video/${next.id}`)
                    : next.type === 'chat' && nextThread
                      ? router.push(`/consultation/chat/${nextThread.id}`)
                      : router.push(`/appointment/${next.id}`)
                }
                fullWidth
              />
            </View>
          </View>
        </View>
      )}

      <SectionHeader
        title={`Consultations du jour (${items.length})`}
        actionLabel="Agenda"
        onAction={() => router.push('/(doctor)/agenda')}
        style={{ paddingHorizontal: spacing.m }}
      />
      {agenda.loading ? (
        <View style={{ paddingHorizontal: spacing.m, gap: spacing.s }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.skelRow, { opacity: 1 - i * 0.25 }]} />
          ))}
        </View>
      ) : items.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.m }}>
          <EmptyState
            icon="calendar-outline"
            title="Journée sans consultation"
            message="Aucun rendez-vous aujourd’hui. Les patients peuvent réserver vos créneaux libres."
          />
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.m, gap: spacing.s }}>
          {items.map((a) => (
            <PatientAppointmentRow
              key={a.id}
              appointment={a}
              onPress={() => router.push(`/appointment/${a.id}`)}
            />
          ))}
        </View>
      )}

      <SectionHeader
        title={`Préparations IA reçues (${prepList.length})`}
        style={{ paddingHorizontal: spacing.m, marginTop: spacing.s }}
      />
      {prepList.length === 0 ? (
        <Text style={styles.prepsEmpty}>
          Aucune préparation de symptômes envoyée par vos patients pour le moment.
        </Text>
      ) : (
        <View style={{ paddingHorizontal: spacing.m, gap: spacing.s }}>
          {prepList.slice(0, 3).map((prep) => (
            <Pressable
              key={prep.id}
              style={({ pressed }) => [styles.prepCard, pressed && { opacity: 0.85 }]}
              onPress={() => prep.patientId && router.push(`/(doctor)/patients/${prep.patientId}`)}
            >
              <View style={[styles.prepDot, { backgroundColor: priorityColor(prep.priority) }]} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.prepPatient} numberOfLines={1}>{prep.patientName ?? 'Patient'}</Text>
                  {prep.aiGenerated && (
                    <View style={styles.prepAiBadge}>
                      <Text style={styles.prepAiText}>IA</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.prepSymptoms} numberOfLines={1}>
                  {prep.symptoms.join(' · ')}
                </Text>
                <Text style={styles.prepMeta}>
                  {dayLabel(prep.createdAt)} · priorité {prep.priority}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          ))}
        </View>
      )}

      <SectionHeader title="Actions rapides" style={{ paddingHorizontal: spacing.m }} />
      <View style={{ flexDirection: 'row', gap: spacing.s, paddingHorizontal: spacing.m }}>
        <Pressable style={styles.quick} onPress={() => router.push('/prescriptions/create?patientId=p1')}>
          <Ionicons name="document-text" size={20} color={colors.primary} />
          <Text style={styles.quickText}>Créer une ordonnance</Text>
        </Pressable>
        <Pressable style={styles.quick} onPress={() => router.push('/(doctor)/patients')}>
          <Ionicons name="people" size={20} color={colors.info} />
          <Text style={styles.quickText}>Mes patients</Text>
        </Pressable>
        <Pressable
          style={styles.quick}
          onPress={() =>
            show(
              `${completed} terminée(s) · ${waiting} en attente · recette ${fcfa(revenue)}`,
              'info',
            )
          }
        >
          <Ionicons name="stats-chart" size={20} color={colors.success} />
          <Text style={styles.quickText}>Activité du jour</Text>
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
  },
  greeting: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  greetingSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.m,
    marginTop: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.m },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.divider },
  statValue: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, textAlign: 'center', paddingHorizontal: 4 },
  nextCard: {
    marginHorizontal: spacing.m,
    marginTop: spacing.m,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.l,
    ...shadow.float,
  },
  nextLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  nextLabel: { fontSize: font.size.xs, fontWeight: '800', color: colors.primarySoft, letterSpacing: 0.8 },
  nextName: { fontSize: font.size.xl, fontWeight: '800', color: colors.white },
  nextMotif: { fontSize: font.size.sm, color: colors.primarySoft, marginTop: 3, lineHeight: 19 },
  nextTime: {
    backgroundColor: colors.white,
    borderRadius: radii.m,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nextTimeText: { fontSize: font.size.lg, fontWeight: '800', color: colors.primaryDark },
  skelRow: {
    height: 84,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prepsEmpty: {
    paddingHorizontal: spacing.m,
    fontSize: font.size.sm,
    color: colors.textMuted,
  },
  prepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
  },
  prepDot: { width: 10, height: 10, borderRadius: 5 },
  prepPatient: { fontSize: font.size.base, fontWeight: '700', color: colors.text, flexShrink: 1 },
  prepAiBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.s,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prepAiText: { fontSize: 10, fontWeight: '800', color: colors.primaryDark },
  prepSymptoms: { fontSize: font.size.sm, color: colors.text, marginTop: 3 },
  prepMeta: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  quick: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.m,
  },
  quickText: { fontSize: 10, fontWeight: '600', color: colors.text, textAlign: 'center' },
});
