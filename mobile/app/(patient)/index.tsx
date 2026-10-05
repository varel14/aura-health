import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, SectionHeader, Skeleton } from '@/components/ui';
import { AppointmentCard, CompactAppointmentBanner, DoctorRow, FacilityCard } from '@/components/domain';
import { colors, font, radii, shadow, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { useAsync } from '@/hooks/useAsync';
import { doctorService, hospitalService, pharmacyService } from '@/services';
import { dayLabel, fcfa } from '@/utils/format';

const shortcuts = [
  { icon: 'videocam' as const, label: 'Consulter un médecin', tint: colors.primary, route: '/doctors' },
  { icon: 'calendar' as const, label: 'Prendre rendez-vous', tint: colors.info, route: '/doctors' },
  { icon: 'flask' as const, label: 'Commander un médicament', tint: colors.ai, route: '/(patient)/pharmacy' },
  { icon: 'business' as const, label: 'Trouver un hôpital', tint: '#0F8B8D', route: '/hospitals' },
  { icon: 'medkit' as const, label: 'Trouver une pharmacie', tint: colors.warning, route: '/pharmacies' },
  { icon: 'cart' as const, label: 'Mon panier', tint: colors.danger, route: '/cart' },
  { icon: 'document-text' as const, label: 'Mes ordonnances', tint: '#B85C38', route: '/prescriptions' },
  { icon: 'card' as const, label: 'Mes paiements', tint: colors.success, route: '/payments' },
];

export default function PatientHome() {
  const {
    patient, appointments, prescriptions, payments, notifications, documents,
  } = useAppData();
  const insets = useSafeAreaInsets();

  const nearbyHospitals = useAsync(() => hospitalService.list({}), []);
  const nearbyPharmacies = useAsync(() => pharmacyService.list({ city: 'Yaoundé' }), []);
  const suggestedDoctors = useAsync(() => doctorService.list({ availableToday: true }), []);

  const upcoming = appointments
    .filter((a) => a.status === 'confirmed' || a.status === 'pending')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const next = upcoming[0];

  const recentCompleted = appointments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 2);
  const activePrescriptions = prescriptions.filter((p) => p.status === 'active');
  const unread = notifications.filter((n) => !n.read).length;
  const unpaid = upcoming.find((a) => !a.paid);
  const expiringRx = activePrescriptions.find((p) => p.id === 'rx1');

  const doctorInfo = (id: string) => {
    const doc = suggestedDoctors.data?.find((d) => d.id === id);
    return {
      name: doc ? `Dr ${doc.firstName} ${doc.lastName}` : 'Médecin',
      specialty: doc?.specialty ?? 'Médecine',
    };
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: insets.top + spacing.s }} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Avatar name={`${patient.firstName} ${patient.lastName}`} size={48} />
          <View style={{ marginLeft: spacing.m, flex: 1 }}>
            <Text style={styles.greeting}>Bonjour, {patient.firstName} 👋</Text>
            <Text style={styles.greetingSub} numberOfLines={2}>
              Comment pouvons-nous prendre soin de vous aujourd’hui ?
            </Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/notifications')} style={styles.bell}>
          <Ionicons name="notifications" size={22} color={colors.text} />
          {unread > 0 && (
            <View style={styles.bellDot}>
              <Text style={styles.bellDotText}>{unread}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Pressable style={styles.search} onPress={() => router.push('/doctors')}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <Text style={styles.searchText}>Rechercher un médecin, un hôpital…</Text>
      </Pressable>

      {next && (
        <View style={{ paddingHorizontal: spacing.m, marginTop: spacing.m }}>
          <CompactAppointmentBanner
            doctorName={doctorInfo(next.doctorId).name}
            specialty={doctorInfo(next.doctorId).specialty}
            date={dayLabel(next.date)}
            time={next.time}
            type={next.type}
            onPress={() => router.push(`/appointment/${next.id}`)}
          />
        </View>
      )}

      <SectionHeader title="Actions rapides" style={{ paddingHorizontal: spacing.m, marginTop: spacing.m, marginBottom: spacing.m }} />
      <View style={styles.shortcuts}>
        {shortcuts.map((s) => (
          <Pressable
            key={s.label}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push(s.route)}
          >
            <View style={[styles.tileIcon, { backgroundColor: `${s.tint}15` }]}>
              <Ionicons name={s.icon} size={22} color={s.tint} />
            </View>
            <Text style={styles.tileLabel}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.aiCard} onPress={() => router.push('/symptoms')}>
        <View style={styles.aiIcon}>
          <Ionicons name="sparkles" size={22} color={colors.ai} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTitle}>Vous ne savez pas quel médecin consulter ?</Text>
          <Text style={styles.aiSub}>Décrivez vos symptômes : notre IA vous oriente vers la bonne spécialité.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.ai} />
      </Pressable>

      {(unpaid || expiringRx) && (
        <View style={{ paddingHorizontal: spacing.m, marginTop: spacing.l }}>
          <Text style={styles.rappelTitle}>Rappels</Text>
          {unpaid && (
            <Pressable style={styles.rappel} onPress={() => router.push(`/appointment/${unpaid.id}`)}>
              <View style={[styles.rappelIcon, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="card" size={18} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rappelText}>Paiement en attente — {fcfa(unpaid.fee)}</Text>
                <Text style={styles.rappelSub}>Consultation avec {doctorInfo(unpaid.doctorId).name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          )}
          {expiringRx && (
            <Pressable style={styles.rappel} onPress={() => router.push('/(patient)/pharmacy')}>
              <View style={[styles.rappelIcon, { backgroundColor: colors.infoSoft }]}>
                <Ionicons name="refresh" size={18} color={colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rappelText}>Ordonnance bientôt expirée</Text>
                <Text style={styles.rappelSub}>{expiringRx.code} — pensez à commander vos médicaments</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          )}
        </View>
      )}

      <SectionHeader
        title="Consultations récentes"
        actionLabel="Tout voir"
        onAction={() => router.push('/(patient)/appointments')}
        style={{ paddingHorizontal: spacing.m }}
      />
      <View style={{ paddingHorizontal: spacing.m, gap: spacing.s }}>
        {recentCompleted.map((a) => {
          const info = doctorInfo(a.doctorId);
          return (
            <AppointmentCard
              key={a.id}
              appointment={a}
              doctorName={info.name}
              specialty={info.specialty}
              onPress={() => router.push(`/appointment/${a.id}`)}
            />
          );
        })}
      </View>

      <SectionHeader
        title="Ordonnances actives"
        actionLabel="Tout voir"
        onAction={() => router.push('/prescriptions')}
        style={{ paddingHorizontal: spacing.m }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.m, gap: spacing.s }}>
        {activePrescriptions.map((rx) => (
          <Pressable key={rx.id} style={styles.rxCard} onPress={() => router.push(`/prescriptions/${rx.id}`)}>
            <Ionicons name="document-text" size={18} color={colors.primary} />
            <Text style={styles.rxDoctor} numberOfLines={1}>{rx.doctorName}</Text>
            <Text style={styles.rxMeta}>{rx.lines.length} médicaments</Text>
            <Text style={styles.rxExpiry}>Expire le {dayLabel(rx.expiryDate)}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.rxAdd} onPress={() => router.push('/prescriptions/import')}>
          <Ionicons name="add-circle" size={26} color={colors.primary} />
          <Text style={styles.rxAddText}>Importer une ordonnance</Text>
        </Pressable>
      </ScrollView>

      <SectionHeader
        title="Médecins disponibles aujourd’hui"
        actionLabel="Tout voir"
        onAction={() => router.push('/doctors')}
        style={{ paddingHorizontal: spacing.m }}
      />
      {suggestedDoctors.loading ? (
        <View style={{ paddingHorizontal: spacing.m, gap: spacing.m }}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.skelRow}>
              <Skeleton width={46} height={46} radius={23} />
              <View style={{ flex: 1, gap: 7 }}>
                <Skeleton width="60%" height={13} />
                <Skeleton width="40%" height={11} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.m }}>
          {(suggestedDoctors.data ?? []).slice(0, 3).map((d) => (
            <DoctorRow key={d.id} doctor={d} onPress={() => router.push(`/doctors/${d.id}`)} />
          ))}
        </View>
      )}

      <SectionHeader
        title="Services à proximité"
        actionLabel="Hôpitaux"
        onAction={() => router.push('/hospitals')}
        style={{ paddingHorizontal: spacing.m }}
      />
      {nearbyHospitals.loading || nearbyPharmacies.loading ? (
        <View style={{ paddingHorizontal: spacing.m }}>
          <Skeleton width="100%" height={96} radius={radii.l} />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.m, gap: spacing.s }}>
          {(nearbyHospitals.data ?? []).slice(0, 3).map((h) => (
            <FacilityCard
              key={h.id}
              name={h.name}
              subtitle={`${h.district}, ${h.city}`}
              rating={h.rating}
              icon="business"
              onPress={() => router.push(`/hospitals/${h.id}`)}
            />
          ))}
          {(nearbyPharmacies.data ?? []).slice(0, 2).map((p) => (
            <FacilityCard
              key={p.id}
              name={p.name}
              subtitle={`${p.district}, ${p.city}`}
              rating={p.rating}
              icon="medkit"
              badges={p.onDuty ? [{ label: 'De garde', variant: 'success' }] : []}
              onPress={() => router.push(`/pharmacies/${p.id}`)}
            />
          ))}
        </ScrollView>
      )}

      <SectionHeader
        title="Mon dossier médical"
        actionLabel="Ouvrir"
        onAction={() => router.push('/(patient)/records')}
        style={{ paddingHorizontal: spacing.m }}
      />
      <View style={{ paddingHorizontal: spacing.m, flexDirection: 'row', gap: spacing.s }}>
        <Pressable style={styles.statCard} onPress={() => router.push('/(patient)/records')}>
          <Ionicons name="folder" size={20} color={colors.primary} />
          <Text style={styles.statValue}>{documents.length}</Text>
          <Text style={styles.statLabel}>Documents</Text>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => router.push('/prescriptions')}>
          <Ionicons name="document-text" size={20} color={colors.info} />
          <Text style={styles.statValue}>{activePrescriptions.length}</Text>
          <Text style={styles.statLabel}>Ordonnances actives</Text>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => router.push('/payments')}>
          <Ionicons name="card" size={20} color={colors.success} />
          <Text style={styles.statValue}>{payments.filter((p) => p.status === 'paid').length}</Text>
          <Text style={styles.statLabel}>Paiements</Text>
        </Pressable>
      </View>

      <View style={{ height: spacing.xl }} />
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
  greetingSub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
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
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellDotText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.m,
    marginTop: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.m,
    height: 46,
  },
  searchText: { color: colors.textFaint, fontSize: font.size.sm, flex: 1 },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
  },
  tile: {
    width: '23.5%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.m,
    alignItems: 'center',
    gap: 6,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 13,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginHorizontal: spacing.m,
    marginTop: spacing.m,
    backgroundColor: colors.aiSoft,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: '#DCD0F7',
    padding: spacing.m,
  },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.m,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: { fontSize: font.size.sm, fontWeight: '700', color: '#4C2889', flex: 1 },
  aiSub: { fontSize: font.size.xs, color: '#7A5FB5', marginTop: 2, lineHeight: 16 },
  rappelTitle: { fontSize: font.size.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.s },
  rappel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  rappelIcon: { width: 38, height: 38, borderRadius: radii.s, alignItems: 'center', justifyContent: 'center' },
  rappelText: { fontSize: font.size.sm, fontWeight: '700', color: colors.text },
  rappelSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  rxCard: {
    width: 190,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    gap: 4,
    ...shadow.card,
  },
  rxDoctor: { fontSize: font.size.sm, fontWeight: '700', color: colors.text, marginTop: 4 },
  rxMeta: { fontSize: font.size.xs, color: colors.textMuted },
  rxExpiry: { fontSize: font.size.xs, color: colors.warning, fontWeight: '600' },
  rxAdd: {
    width: 150,
    borderRadius: radii.l,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing.m,
  },
  rxAddText: { fontSize: font.size.xs, color: colors.primary, fontWeight: '600', textAlign: 'center' },
  skelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    alignItems: 'flex-start',
    gap: 4,
  },
  statValue: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: font.size.xs, color: colors.textMuted },
});
