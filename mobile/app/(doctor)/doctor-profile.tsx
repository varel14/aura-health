import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Badge } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/services/api';
import { hospitalService, doctorWorkspaceService } from '@/services';
import { Doctor, Hospital } from '@/models/types';

const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** « Lun – Ven » pour une plage continue, « Lun, Mer, Ven » sinon. */
function workingDaysLabel(days: number[]): string {
  if (!days.length) return '—';
  const sorted = [...days].sort((a, b) => a - b);
  const runs: number[][] = [[sorted[0]]];
  for (const d of sorted.slice(1)) {
    const run = runs[runs.length - 1];
    if (d === run[run.length - 1] + 1) run.push(d);
    else runs.push([d]);
  }
  return runs.map((r) => (r.length > 2 ? `${DAY_SHORT[r[0]]} – ${DAY_SHORT[r[r.length - 1]]}` : r.map((d) => DAY_SHORT[d]).join(', '))).join(', ');
}

/** « 08:00 – 12:00 · 15:00 – 17:00 » à partir des créneaux du médecin. */
function slotHoursLabel(slots: string[]): string {
  if (!slots.length) return '—';
  const morning = slots.filter((t) => t < '13:00');
  const afternoon = slots.filter((t) => t >= '13:00');
  const range = (list: string[]) => (list.length ? `${list[0]} – ${list[list.length - 1]}` : '');
  return [range(morning), range(afternoon)].filter(Boolean).join(' · ');
}

/** Profil du médecin connecté (session réelle), undefined si non disponible. */
function useDoctorProfile(): { doctor?: Doctor; hospital?: Hospital } | undefined {
  const state = useAsync(async () => {
    try {
      const me = await api<{ role: string; doctor?: Doctor }>('/api/auth/me');
      if (!me.doctor) return undefined;
      const hospital = await hospitalService.get(me.doctor.hospitalId).catch(() => undefined);
      return { doctor: me.doctor, hospital };
    } catch {
      return undefined;
    }
  }, []);
  return state.data ?? undefined;
}

export default function DoctorProfile() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const profile = useDoctorProfile();
  const doctor = profile?.doctor;
  const hospital = profile?.hospital;

  // Live activity from the doctor workspace (patients followed, today's agenda).
  const activity = useAsync(
    () =>
      Promise.all([doctorWorkspaceService.patients(), doctorWorkspaceService.dayAppointments()])
        .then(([patients, agenda]) => ({ patients: patients.length, today: agenda.appointments.length }))
        .catch(() => undefined),
    [doctor?.id],
  );

  const name = doctor ? `Dr ${doctor.firstName} ${doctor.lastName}` : 'Dr Vanessa Mbarga';
  const specialty = doctor?.specialty ?? 'Médecine générale';
  const establishment = hospital?.name ?? 'Centre Médical de Bastos';
  const establishmentLine = hospital ? `${hospital.name} — ${hospital.city}` : 'Centre Médical de Bastos — Yaoundé';
  const fees = doctor
    ? `Vidéo ${grouped(doctor.videoFee ?? doctor.fee)} · Chat ${grouped(doctor.chatFee ?? doctor.fee)} · Cabinet ${grouped(doctor.fee)} FCFA`
    : 'Vidéo 10 000 · Chat 7 000 · Cabinet 10 000 FCFA';
  const statusBadge = doctor
    ? doctor.status === 'disponible'
      ? { label: 'Disponible', variant: 'success' as const }
      : doctor.status === 'occupé'
        ? { label: 'Occupé', variant: 'warning' as const }
        : { label: 'Indisponible', variant: 'neutral' as const }
    : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: insets.top + spacing.m, paddingHorizontal: spacing.m }}>
        <Text style={styles.title}>Mon profil</Text>

        <View style={styles.headerCard}>
          <Avatar name={name} size={64} />
          <View style={{ flex: 1, marginLeft: spacing.m }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.meta}>{specialty}</Text>
            <Text style={styles.meta}>{establishmentLine}</Text>
            {statusBadge && (
              <View style={{ flexDirection: 'row', marginTop: spacing.s }}>
                <Badge {...statusBadge} size="sm" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{activity.data ? String(activity.data.patients) : '—'}</Text>
            <Text style={styles.statLabel}>Patients suivis</Text>
          </View>
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={styles.statValue}>{activity.data ? String(activity.data.today) : '—'}</Text>
            <Text style={styles.statLabel}>RDV aujourd’hui</Text>
          </View>
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={styles.statValue}>{doctor ? `${doctor.experienceYears} ans` : '11 ans'}</Text>
            <Text style={styles.statLabel}>D’expérience</Text>
          </View>
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={styles.statValue}>{doctor ? `${String(doctor.rating).replace('.', ',')} ★` : '4,9 ★'}</Text>
            <Text style={styles.statLabel}>Satisfaction</Text>
          </View>
        </View>

        {doctor?.bio ? (
          <>
            <Text style={styles.section}>À propos</Text>
            <View style={styles.card}>
              <Text style={styles.bioText}>{doctor.bio}</Text>
            </View>
          </>
        ) : null}

        <Text style={styles.section}>Exercice professionnel</Text>
        <View style={styles.card}>
          <Row icon="business" label="Établissement" value={establishment} onPress={() => hospital && router.push(`/hospitals/${hospital.id}`)} />
          <Row icon="calendar" label="Jours de consultation" value={doctor ? workingDaysLabel(doctor.workingDays) : 'Lun – Ven'} />
          <Row icon="time" label="Horaires" value={doctor ? slotHoursLabel(doctor.slotTimes) : '08:00 – 12:00 · 15:00 – 17:00'} />
          <Row icon="cash" label="Tarifs" value={fees} />
          <Row icon="language" label="Langues" value={doctor ? doctor.languages.join(', ') : 'Français, Anglais, Ewondo'} last />
        </View>

        <Text style={styles.section}>Préférences</Text>
        <View style={styles.card}>
          <Row icon="notifications" label="Notifications" onPress={() => router.push('/profile/notifications')} />
          <Row icon="lock-closed" label="Sécurité" onPress={() => router.push('/profile/security')} />
          <Row icon="help-circle" label="Aide et assistance" onPress={() => router.push('/profile/help')} last />
        </View>

        <Text style={styles.section}>Démonstration</Text>
        <View style={styles.card}>
          <Row
            icon="swap-horizontal"
            label="Revenir à l’espace patient"
            sub="Basculer de rôle pour la démo"
            onPress={() => {
              signOut();
              router.replace('/(auth)/login');
            }}
            last
          />
        </View>

        <Pressable
          style={styles.logoutBtn}
          onPress={() => {
            signOut();
            router.replace('/(auth)/login');
          }}
        >
          <Ionicons name="log-out" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </Pressable>
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
  sub,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  sub?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {sub && <Text style={styles.rowValue}>{sub}</Text>}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginTop: spacing.m,
  },
  name: { fontSize: font.size.lg, fontWeight: '800', color: colors.text },
  meta: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.s,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.m },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.divider },
  statValue: { fontSize: font.size.md, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  section: {
    fontSize: font.size.sm,
    fontWeight: '800',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: 12, paddingHorizontal: spacing.m },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.s,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: font.size.base, fontWeight: '600', color: colors.text },
  rowValue: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  bioText: { fontSize: font.size.sm, color: colors.text, lineHeight: 20, paddingVertical: spacing.s, paddingHorizontal: spacing.m },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.dangerSoft,
    borderRadius: radii.m,
    paddingVertical: 14,
    marginTop: spacing.xl,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: font.size.base },
});
