import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EmptyState, ErrorState, ListSkeleton } from '@/components/ui';
import { AdminDoctorCard } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { adminService } from '@/services/admin';

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'À valider' },
  { key: 'active', label: 'Actifs' },
  { key: 'rejected', label: 'Rejetés' },
] as const;
type FilterKey = (typeof FILTERS)[number]['key'];

export default function AdminDoctors() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterKey>('all');
  const queue = useAsync(() => adminService.doctors(), []);
  useFocusEffect(useCallback(() => queue.reload(), []));

  const doctors = queue.data ?? [];
  const visible = useMemo(
    () => (filter === 'all' ? doctors : doctors.filter((d) => d.activationStatus === filter)),
    [doctors, filter],
  );
  const pendingCount = doctors.filter((d) => d.activationStatus === 'pending').length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + spacing.s }} />
      <View style={styles.header}>
        <Text style={styles.title}>Médecins</Text>
        <Text style={styles.subtitle}>
          {doctors.length} profil{doctors.length > 1 ? 's' : ''} • {pendingCount} en attente de validation
        </Text>
      </View>

      {/* flexGrow: 0 — otherwise the horizontal row claims vertical space in the flex column. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.filters}>
  {FILTERS.map((f) => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.chip, filter === f.key && styles.chipActive]}>
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.m, paddingBottom: 40, gap: spacing.s }}>
        {queue.loading && !queue.data ? (
          <ListSkeleton rows={5} />
        ) : queue.error ? (
          <ErrorState message={queue.error} onRetry={queue.reload} />
        ) : visible.length === 0 ? (
          <Card>
            <EmptyState
              icon="people-outline"
              title="Aucun médecin"
              message={
                filter === 'pending'
                  ? 'Aucun profil en attente — les nouvelles inscriptions arrivent ici.'
                  : 'Aucun profil ne correspond à ce filtre.'
              }
            />
          </Card>
        ) : (
          visible.map((d) => <AdminDoctorCard key={d.id} doctor={d} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.m, paddingTop: spacing.m },
  title: { fontSize: font.size.title, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 4 },
  filters: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s, paddingHorizontal: spacing.m, paddingVertical: spacing.m },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.size.sm, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.white },
});
