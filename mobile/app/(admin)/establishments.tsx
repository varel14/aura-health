import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Card, EmptyState, ErrorState, ListSkeleton } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { adminService } from '@/services/admin';

type Tab = 'hospitals' | 'pharmacies';

export default function AdminEstablishments() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('hospitals');
  const hospitals = useAsync(() => adminService.hospitals(), []);
  const pharmacies = useAsync(() => adminService.pharmacies(), []);
  useFocusEffect(
    useCallback(() => {
      hospitals.reload();
      pharmacies.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const loading = (tab === 'hospitals' ? hospitals : pharmacies).loading;
  const error = (tab === 'hospitals' ? hospitals : pharmacies).error;
  const reload = tab === 'hospitals' ? hospitals.reload : pharmacies.reload;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + spacing.s }} />
      <View style={styles.header}>
        <Text style={styles.title}>Établissements</Text>
        <Text style={styles.subtitle}>Infos de base du réseau Aura Health</Text>
      </View>

      <View style={styles.segmentWrap}>
        {( [
          { key: 'hospitals', label: `Hôpitaux (${hospitals.data?.length ?? '—'})` },
          { key: 'pharmacies', label: `Pharmacies (${pharmacies.data?.length ?? '—'})` },
        ] as const).map((s) => (
          <Pressable key={s.key} style={[styles.segment, tab === s.key && styles.segmentActive]} onPress={() => setTab(s.key)}>
            <Text style={[styles.segmentText, tab === s.key && styles.segmentTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.m, paddingBottom: 40, gap: spacing.s }}>
        {loading && !hospitals.data && !pharmacies.data ? (
          <ListSkeleton rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : tab === 'hospitals' ? (
          (hospitals.data ?? []).map((h) => (
            <Card key={h.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="business" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginHorizontal: spacing.s }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{h.name}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{h.type} • {h.district}, {h.city}</Text>
                </View>
                {h.emergency && <Badge label="Urgences" variant="danger" size="sm" />}
              </View>
              <View style={styles.rowStats}>
                <View style={styles.stat}>
                  <Ionicons name="people" size={14} color={colors.textMuted} />
                  <Text style={styles.statText}>{h.doctorCount} médecin{h.doctorCount > 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="star" size={14} color={colors.accent} />
                  <Text style={styles.statText}>{h.rating.toFixed(1)}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="call" size={14} color={colors.textMuted} />
                  <Text style={styles.statText} numberOfLines={1}>{h.phone}</Text>
                </View>
              </View>
            </Card>
          ))
        ) : (
          (pharmacies.data ?? []).map((p) => (
            <Card key={p.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={[styles.rowIcon, { backgroundColor: colors.infoSoft }]}>
                  <Ionicons name="medkit" size={18} color={colors.info} />
                </View>
                <View style={{ flex: 1, marginHorizontal: spacing.s }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{p.district}, {p.city}</Text>
                </View>
                {p.onDuty && <Badge label="De garde" variant="warning" size="sm" />}
              </View>
              <View style={styles.rowStats}>
                <View style={styles.stat}>
                  <Ionicons name="beaker" size={14} color={colors.textMuted} />
                  <Text style={styles.statText}>{p.medicationCount} méd.</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="cube" size={14} color={colors.textMuted} />
                  <Text style={styles.statText}>{p.openOrders} en cours</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name={p.deliveryAvailable ? 'bicycle' : 'storefront'} size={14} color={colors.textMuted} />
                  <Text style={styles.statText}>{p.deliveryAvailable ? 'Livraison' : 'Retrait'}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="star" size={14} color={colors.accent} />
                  <Text style={styles.statText}>{p.rating.toFixed(1)}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
        {!loading && !error && tab === 'hospitals' && (hospitals.data ?? []).length === 0 && (
          <Card><EmptyState icon="business" title="Aucun hôpital" message="Le réseau ne contient pas encore d’établissement." /></Card>
        )}
        {!loading && !error && tab === 'pharmacies' && (pharmacies.data ?? []).length === 0 && (
          <Card><EmptyState icon="medkit" title="Aucune pharmacie" message="Le réseau ne contient pas encore de pharmacie." /></Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.m, paddingTop: spacing.m },
  title: { fontSize: font.size.title, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 4 },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginHorizontal: spacing.m,
    marginTop: spacing.m,
  },
  segment: { flex: 1, paddingVertical: 9, borderRadius: radii.full, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: font.size.sm, fontWeight: '600', color: colors.textMuted },
  segmentTextActive: { color: colors.white },
  rowCard: { gap: spacing.s },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 40, height: 40, borderRadius: radii.s, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  rowStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.s,
    gap: spacing.m,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: '600' },
});
