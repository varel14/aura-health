import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionRow, Avatar, Card, EmptyState, ErrorState, ListSkeleton, SectionHeader } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { adminService } from '@/services/admin';
import { AdminDoctor } from '@/models/types';

function DoctorRow({ doctor }: { doctor: AdminDoctor }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.docRow, pressed && { opacity: 0.8 }]}
      onPress={() => router.push(`/(admin)/doctors/${doctor.id}`)}
    >
      <Avatar name={`Dr ${doctor.firstName} ${doctor.lastName}`} size={42} />
      <View style={{ flex: 1, marginLeft: spacing.s }}>
        <Text style={styles.docName} numberOfLines={1}>Dr {doctor.firstName} {doctor.lastName}</Text>
        <Text style={styles.docSub} numberOfLines={1}>
          {doctor.specialty}{doctor.hospitalName ? ` • ${doctor.hospitalName}` : ''}
        </Text>
      </View>
      <View style={styles.docAction}>
        <Text style={styles.docActionText}>Valider</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </View>
    </Pressable>
  );
}

export default function AdminHome() {
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const overview = useAsync(() => adminService.overview(), []);
  const pending = useAsync(() => adminService.doctors('pending'), []);
  useFocusEffect(
    useCallback(() => {
      overview.reload();
      pending.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const stats = [
    { value: overview.data?.doctors.pending ?? 0, label: 'À valider', color: colors.warning, icon: 'hourglass' as const },
    { value: overview.data?.doctors.active ?? 0, label: 'Médecins actifs', color: colors.success, icon: 'checkmark-circle' as const },
    { value: overview.data?.doctors.rejected ?? 0, label: 'Rejetés', color: colors.danger, icon: 'close-circle' as const },
    { value: overview.data?.pendingApplications ?? 0, label: 'Candidatures', color: colors.info, icon: 'document-text' as const },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: insets.top + spacing.s }} />
      <View style={styles.header}>
        <Avatar name="Administration Aura" size={48} color={colors.dark} />
        <View style={{ marginLeft: spacing.m, flex: 1 }}>
          <Text style={styles.greeting}>Administration</Text>
          <Text style={styles.greetingSub}>Back-office Aura Health {role === 'admin' ? '• session admin' : ''}</Text>
        </View>
      </View>

      {overview.error ? (
        <View style={{ paddingHorizontal: spacing.m }}><ErrorState message={overview.error} onRetry={overview.reload} /></View>
      ) : (
        <>
          <View style={styles.statsGrid}>
            {stats.map((s, i) => (
              <View key={s.label} style={[styles.statCard, i % 2 === 1 && styles.statCardRight]}>
                <View style={[styles.statIcon, { backgroundColor: `${s.color}18` }]}>
                  <Ionicons name={s.icon} size={17} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <Card style={{ marginHorizontal: spacing.m, marginTop: spacing.s }}>
            <View style={styles.establishRow}>
              <View style={styles.establishItem}>
                <Ionicons name="business" size={18} color={colors.primary} />
                <Text style={styles.establishValue}>{overview.data?.hospitals ?? '—'}</Text>
                <Text style={styles.establishLabel}>Hôpitaux</Text>
              </View>
              <View style={styles.establishDivider} />
              <View style={styles.establishItem}>
                <Ionicons name="medkit" size={18} color={colors.info} />
                <Text style={styles.establishValue}>{overview.data?.pharmacies ?? '—'}</Text>
                <Text style={styles.establishLabel}>Pharmacies</Text>
              </View>
            </View>
          </Card>

          <SectionHeader
            title="Médecins à valider"
            actionLabel="Tout voir"
            onAction={() => router.push('/(admin)/doctors')}
            style={{ marginHorizontal: spacing.m, marginTop: spacing.l }}
          />
          <View style={{ paddingHorizontal: spacing.m, gap: spacing.s }}>
            {pending.loading && !pending.data ? (
              <ListSkeleton rows={2} />
            ) : pending.error ? (
              <ErrorState message={pending.error} onRetry={pending.reload} />
            ) : (pending.data ?? []).length === 0 ? (
              <Card>
                <EmptyState
                  compact
                  icon="checkmark-done"
                  title="File vide"
                  message="Aucun médecin en attente de validation. Les nouvelles inscriptions apparaissent ici."
                />
              </Card>
            ) : (
              <Card padded={false}>
                {(pending.data ?? []).slice(0, 4).map((d, i) => (
                  <View key={d.id}>
                    {i > 0 && <View style={styles.docSeparator} />}
                    <DoctorRow doctor={d} />
                  </View>
                ))}
              </Card>
            )}
          </View>

          <SectionHeader title="Gestion" style={{ marginHorizontal: spacing.m, marginTop: spacing.l }} />
          <Card padded={false} style={{ marginHorizontal: spacing.m }}>
            <ActionRow
              icon="pulse"
              label="Tous les médecins"
              sublabel="File de validation, activation et rejet"
              onPress={() => router.push('/(admin)/doctors')}
            />
            <ActionRow
              icon="business"
              label="Établissements"
              sublabel="Hôpitaux et pharmacies partenaires"
              tint={colors.info}
              onPress={() => router.push('/(admin)/establishments')}
            />
            <ActionRow
              icon="document-text"
              label="Candidatures professionnelles"
              sublabel="Demandes d’inscription hôpitaux & pharmacies"
              tint={colors.warning}
              onPress={() => router.push('/(admin)/applications')}
            />
          </Card>
        </>
      )}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.m,
    marginTop: spacing.m,
    marginHorizontal: -spacing.xs,
  },
  statCard: {
    flexBasis: '50%',
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.s,
  },
  statCardRight: { marginTop: 0 },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.s,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
  },
  statValue: { fontSize: font.size.xxl, fontWeight: '800' },
  statLabel: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  establishRow: { flexDirection: 'row', alignItems: 'center' },
  establishItem: { flex: 1, alignItems: 'center', gap: 2 },
  establishDivider: { width: 1, height: 40, backgroundColor: colors.divider },
  establishValue: { fontSize: font.size.xl, fontWeight: '800', color: colors.text, marginTop: 4 },
  establishLabel: { fontSize: font.size.xs, color: colors.textMuted },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
  },
  docSeparator: { height: 1, backgroundColor: colors.divider },
  docName: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  docSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  docAction: { flexDirection: 'row', alignItems: 'center' },
  docActionText: { fontSize: font.size.sm, fontWeight: '700', color: colors.primary },
});
