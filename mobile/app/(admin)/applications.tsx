import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Card, EmptyState, ErrorState, ListSkeleton } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { adminService } from '@/services/admin';
import { AdminApplication } from '@/models/types';

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
] as const;
type FilterKey = (typeof FILTERS)[number]['key'];

function statusBadge(status: string): { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (status === 'approved') return { label: 'Acceptée', variant: 'success' };
  if (status === 'rejected') return { label: 'Refusée', variant: 'danger' };
  return { label: 'En attente', variant: 'warning' };
}

function ApplicationCard({ application }: { application: AdminApplication }) {
  const badge = statusBadge(application.status);
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.icon, { backgroundColor: application.type === 'hospital' ? colors.primarySoft : colors.infoSoft }]}>
          <Ionicons name={application.type === 'hospital' ? 'business' : 'medkit'} size={18} color={application.type === 'hospital' ? colors.primary : colors.info} />
        </View>
        <View style={{ flex: 1, marginHorizontal: spacing.s }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{application.name}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {application.type === 'hospital' ? 'Hôpital' : 'Pharmacie'} • {application.manager}
          </Text>
        </View>
        <Badge label={badge.label} variant={badge.variant} size="sm" />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.line}>
          <Ionicons name="location" size={13} color={colors.textFaint} />
          <Text style={styles.lineText} numberOfLines={1}>{application.address}, {application.city}</Text>
        </View>
        <View style={styles.line}>
          <Ionicons name="call" size={13} color={colors.textFaint} />
          <Text style={styles.lineText}>{application.phone}</Text>
        </View>
        <View style={styles.line}>
          <Ionicons name="mail" size={13} color={colors.textFaint} />
          <Text style={styles.lineText} numberOfLines={1}>{application.email}</Text>
        </View>
        {application.documents.length > 0 && (
          <View style={styles.line}>
            <Ionicons name="attach" size={13} color={colors.textFaint} />
            <Text style={styles.lineText}>{application.documents.length} pièce(s) jointe(s)</Text>
          </View>
        )}
      </View>
      <Text style={styles.date}>
        Reçue le {new Date(application.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </Text>
    </Card>
  );
}

export default function AdminApplications() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterKey>('all');
  const list = useAsync(() => adminService.applications(), []);
  useFocusEffect(useCallback(() => list.reload(), []));

  const applications = list.data ?? [];
  const visible = useMemo(
    () => (filter === 'all' ? applications : applications.filter((a) => a.status === filter)),
    [applications, filter],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + spacing.s }} />
      <View style={styles.header}>
        <Text style={styles.title}>Candidatures</Text>
        <Text style={styles.subtitle}>Demandes d’inscription du formulaire professionnel</Text>
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
        {list.loading && !list.data ? (
          <ListSkeleton rows={4} />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : visible.length === 0 ? (
          <Card>
            <EmptyState
              icon="document-text"
              title="Aucune candidature"
              message={
                filter === 'pending'
                  ? 'Aucune demande en attente — les soumissions du formulaire pro arrivent ici.'
                  : 'Aucune candidature reçue pour le moment.'
              }
            />
          </Card>
        ) : (
          visible.map((a) => <ApplicationCard key={a.id} application={a} />)
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
  card: { gap: spacing.s },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: radii.s, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  cardBody: { gap: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  lineText: { fontSize: font.size.xs, color: colors.textMuted, flex: 1 },
  date: { fontSize: font.size.xs, color: colors.textFaint },
});
