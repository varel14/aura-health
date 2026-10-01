import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Badge } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { deliveryService, WORKSPACE } from '@/services/orders';
import { WorkspaceOrder } from '@/models/types';
import { fcfa, todayISO } from '@/utils/format';

const badgeByStatus: Record<WorkspaceOrder['status'], { label: string; variant: 'success' | 'warning' | 'info' | 'primary' | 'neutral' | 'danger' }> = {
  'en attente': { label: 'En attente', variant: 'warning' },
  confirmée: { label: 'Validée', variant: 'info' },
  prête: { label: 'À récupérer', variant: 'primary' },
  'en livraison': { label: 'En livraison', variant: 'info' },
  livrée: { label: 'Livrée', variant: 'success' },
  annulée: { label: 'Annulée', variant: 'danger' },
};

function OrderCard({ order }: { order: WorkspaceOrder }) {
  const badge = badgeByStatus[order.status];
  const itemsCount = order.items.reduce((s, it) => s + it.quantity, 0);
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} onPress={() => router.push(`/(delivery)/order/${order.id}`)}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Ionicons name={order.status === 'en livraison' ? 'bicycle' : 'medkit'} size={16} color={order.status === 'en livraison' ? colors.info : colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={1}>{order.pharmacyName}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{order.status === 'en livraison' ? order.address : 'Colis à récupérer au comptoir'}</Text>
        </View>
        <Badge {...badge} size="sm" />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardItems}>{itemsCount} article{itemsCount > 1 ? 's' : ''}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.total}>{fcfa(order.total)}</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
        </View>
      </View>
    </Pressable>
  );
}

export default function DeliveryHome() {
  const insets = useSafeAreaInsets();
  const run = useAsync(() => deliveryService.list(), []);
  useFocusEffect(useCallback(() => run.reload(), []));

  const orders = run.data ?? [];
  const toCollect = orders.filter((o) => o.status === 'prête');
  const inProgress = orders.filter((o) => o.status === 'en livraison');
  const doneToday = orders.filter((o) => o.status === 'livrée' && o.date === todayISO());

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: insets.top + spacing.s }} />
      <View style={styles.header}>
        <Avatar name={WORKSPACE.courierName} size={48} />
        <View style={{ marginLeft: spacing.m, flex: 1 }}>
          <Text style={styles.greeting}>Bonjour {WORKSPACE.courierName.split(' ')[0]} 👋</Text>
          <Text style={styles.greetingSub}>Livreur moto • Pharmacie du Centre</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{toCollect.length}</Text>
          <Text style={styles.statLabel}>À récupérer</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.info }]}>{inProgress.length}</Text>
          <Text style={styles.statLabel}>En livraison</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{doneToday.length}</Text>
          <Text style={styles.statLabel}>Livrées aujourd’hui</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.m, paddingBottom: 40 }}>
        {run.loading ? (
          [0, 1].map((i) => <View key={i} style={[styles.skelRow, { opacity: 1 - i * 0.3 }]} />)
        ) : (
          <>
            <Text style={styles.section}>À récupérer en pharmacie</Text>
            {toCollect.length === 0 ? (
              <Text style={styles.none}>Rien à récupérer pour le moment.</Text>
            ) : (
              <View style={{ gap: spacing.s, marginBottom: spacing.l }}>
                {toCollect.map((o) => <OrderCard key={o.id} order={o} />)}
              </View>
            )}

            <Text style={styles.section}>En cours de livraison</Text>
            {inProgress.length === 0 ? (
              <Text style={styles.none}>Aucune livraison en cours.</Text>
            ) : (
              <View style={{ gap: spacing.s, marginBottom: spacing.l }}>
                {inProgress.map((o) => <OrderCard key={o.id} order={o} />)}
              </View>
            )}

            {doneToday.length > 0 && (
              <>
                <Text style={styles.section}>Livrées aujourd’hui ({doneToday.length})</Text>
                <View style={{ gap: spacing.s }}>
                  {doneToday.map((o) => <OrderCard key={o.id} order={o} />)}
                </View>
              </>
            )}
          </>
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
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center', paddingHorizontal: 4 },
  section: { fontSize: font.size.base, fontWeight: '800', color: colors.text, marginTop: spacing.l, marginBottom: spacing.s },
  none: { fontSize: font.size.sm, color: colors.textFaint, marginBottom: spacing.l },
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
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.s,
  },
  cardItems: { fontSize: font.size.xs, color: colors.textFaint },
  total: { fontSize: font.size.sm, fontWeight: '800', color: colors.primaryDark },
  skelRow: {
    height: 92,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.m,
  },
});
