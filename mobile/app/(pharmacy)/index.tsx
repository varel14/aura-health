import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Badge } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { pharmacyOrderService, WORKSPACE } from '@/services/orders';
import { WorkspaceOrder } from '@/models/types';
import { dayLabel, fcfa } from '@/utils/format';

const FILTERS = ['Toutes', 'À valider', 'À préparer', 'En livraison', 'Terminées'] as const;
type Filter = (typeof FILTERS)[number];

const statusBadge: Record<WorkspaceOrder['status'], { label: string; variant: 'success' | 'warning' | 'info' | 'primary' | 'neutral' | 'danger' }> = {
  'en attente': { label: 'À valider', variant: 'warning' },
  confirmée: { label: 'À préparer', variant: 'info' },
  prête: { label: 'Prête', variant: 'primary' },
  'en livraison': { label: 'En livraison', variant: 'info' },
  livrée: { label: 'Livrée', variant: 'success' },
  annulée: { label: 'Annulée', variant: 'danger' },
};

function matches(order: WorkspaceOrder, filter: Filter): boolean {
  switch (filter) {
    case 'À valider': return order.status === 'en attente';
    case 'À préparer': return ['confirmée', 'prête'].includes(order.status);
    case 'En livraison': return order.status === 'en livraison';
    case 'Terminées': return ['livrée', 'annulée'].includes(order.status);
    default: return true;
  }
}

export default function PharmacyHome() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('Toutes');
  const queue = useAsync(() => pharmacyOrderService.list(), []);
  // The workflow service holds the state; refresh whenever the tab appears.
  useFocusEffect(useCallback(() => queue.reload(), []));

  const orders = queue.data ?? [];
  const toValidate = orders.filter((o) => o.status === 'en attente');
  const toPrepare = orders.filter((o) => ['confirmée', 'prête'].includes(o.status));
  const inDelivery = orders.filter((o) => o.status === 'en livraison');
  const doneToday = orders.filter((o) => o.status === 'livrée' && o.date === new Date().toISOString().slice(0, 10));
  const visible = orders.filter((o) => matches(o, filter));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: insets.top + spacing.s }} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Avatar name={WORKSPACE.pharmacistName} size={48} />
          <View style={{ marginLeft: spacing.m, flex: 1 }}>
            <Text style={styles.greeting}>Pharmacie du Centre</Text>
            <Text style={styles.greetingSub}>{'Pharmacie partenaire'} • {WORKSPACE.pharmacistName}</Text>
          </View>
        </View>
        <Pressable style={styles.bell} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications" size={21} color={colors.text} />
          {toValidate.length > 0 && <View style={styles.bellDot} />}
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{toValidate.length}</Text>
          <Text style={styles.statLabel}>À valider</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.info }]}>{toPrepare.length}</Text>
          <Text style={styles.statLabel}>À préparer</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{inDelivery.length}</Text>
          <Text style={styles.statLabel}>En livraison</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{doneToday.length}</Text>
          <Text style={styles.statLabel}>Livrées</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.m, gap: spacing.s, paddingBottom: 40 }}>
        {queue.loading ? (
          [0, 1, 2].map((i) => <View key={i} style={[styles.skelRow, { opacity: 1 - i * 0.25 }]} />)
        ) : visible.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={28} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>Aucune commande</Text>
            <Text style={styles.emptyText}>Les commandes de vos patients arrivent ici en temps réel.</Text>
          </View>
        ) : (
          visible.map((order) => {
            const badge = statusBadge[order.status];
            const itemsCount = order.items.reduce((s, it) => s + it.quantity, 0);
            return (
              <Pressable key={order.id} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} onPress={() => router.push(`/(pharmacy)/order/${order.id}`)}>
                <View style={styles.cardTop}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="person" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName} numberOfLines={1}>{order.patientName ?? 'Client'}</Text>
                    <Text style={styles.cardSub}>{dayLabel(order.date)} à {order.time} • {order.mode === 'delivery' ? 'Livraison' : 'Retrait'}</Text>
                  </View>
                  <Badge label={badge.label} variant={badge.variant} size="sm" />
                </View>
                <Text style={styles.cardItems} numberOfLines={1}>
                  {order.items.map((it) => `${it.name} ×${it.quantity}`).join(' • ')}
                </Text>
                <View style={styles.cardFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {!order.paid && <Badge label="Non payée" variant="danger" size="sm" />}
                    {order.prescription && <Badge label="Rx" variant="warning" size="sm" />}
                    {order.mode === 'delivery' && ['confirmée', 'prête'].includes(order.status) && !order.courierId && (
                      <Badge label="Sans livreur" variant="danger" size="sm" />
                    )}
                    {order.courierName && order.status !== 'annulée' && <Text style={styles.courier}>{order.courierName}</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.itemsCount}>{itemsCount} art.</Text>
                    <Text style={styles.total}>{fcfa(order.total)}</Text>
                    <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
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
  statValue: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  filters: { flexDirection: 'row', gap: spacing.s, paddingHorizontal: spacing.m, paddingVertical: spacing.m },
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    gap: spacing.s,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.s,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  cardItems: { fontSize: font.size.xs, color: colors.textMuted, lineHeight: 16 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.s,
  },
  courier: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: '600' },
  itemsCount: { fontSize: font.size.xs, color: colors.textFaint },
  total: { fontSize: font.size.md, fontWeight: '800', color: colors.primaryDark },
  skelRow: {
    height: 104,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: { alignItems: 'center', paddingVertical: spacing.xl + spacing.l, gap: 6 },
  emptyTitle: { fontSize: font.size.lg, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 19 },
});
