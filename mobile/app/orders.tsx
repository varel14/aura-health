import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Badge, Button, Card, EmptyState, ErrorState, ListSkeleton, Screen } from '@/components/ui';
import { PaymentSheet } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { orderService } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { dayLabel, fcfa } from '@/utils/format';
import { Order } from '@/models/types';

const statusBadge: Record<Order['status'], { label: string; variant: 'success' | 'warning' | 'info' | 'primary' | 'neutral' | 'danger' }> = {
  'en attente': { label: 'En attente', variant: 'warning' },
  confirmée: { label: 'Confirmée', variant: 'info' },
  prête: { label: 'Prête au retrait', variant: 'primary' },
  'en livraison': { label: 'En livraison', variant: 'info' },
  livrée: { label: 'Livrée', variant: 'success' },
  annulée: { label: 'Annulée', variant: 'danger' },
};

/** Steps that still end with a handover — the code must stay visible. */
const ACTIVE: Order['status'][] = ['en attente', 'confirmée', 'prête', 'en livraison'];

const statusHint: Partial<Record<Order['status'], string>> = {
  'en attente': 'En attente de la validation de la pharmacie.',
  confirmée: 'Validée par la pharmacie — préparation en cours.',
  'en livraison': 'Un livreur est en route — préparez votre code de remise.',
};

/** Orders created but not yet charged: they block pharmacist validation until paid. */
const isUnpaid = (o: Order) => o.status === 'en attente' && !o.paymentId;

export default function OrdersScreen() {
  const orders = useAsync(() => orderService.listMine(), []);
  const [payingId, setPayingId] = useState<string | null>(null);
  const sorted = [...(orders.data ?? [])].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const paying = sorted.find((o) => o.id === payingId) ?? null;

  return (
    <Screen title="Mes commandes" onBack={() => router.back()}>
      {orders.loading ? (
        <View style={{ marginTop: spacing.m }}>
          <ListSkeleton rows={4} />
        </View>
      ) : orders.error ? (
        <ErrorState onRetry={orders.reload} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Aucune commande"
          message="Vos commandes de médicaments apparaîtront ici. Rendez-vous dans la pharmacie pour passer votre première commande."
          actionLabel="Découvrir le catalogue"
          onAction={() => router.replace('/(patient)/pharmacy')}
        />
      ) : (
        <View style={{ gap: spacing.s, marginTop: spacing.s }}>
          {sorted.map((order) => {
            const badge = statusBadge[order.status] ?? { label: order.status, variant: 'neutral' as const };
            const itemsCount = order.items.reduce((s, it) => s + it.quantity, 0);
            const unpaid = isUnpaid(order);
            const onPress = order.paymentId
              ? () => router.push(`/payments/${order.paymentId}`)
              : unpaid
                ? () => setPayingId(order.id)
                : undefined;
            const active = ACTIVE.includes(order.status);
            const hint = unpaid
              ? 'Paiement à finaliser — la pharmacie préparera votre commande dès réception.'
              : statusHint[order.status];
            return (
              <Pressable key={order.id} onPress={onPress} disabled={!onPress} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
                <Card style={{ gap: spacing.s }}>
                  <View style={styles.topRow}>
                    <View style={styles.phIcon}>
                      <Ionicons name="medkit" size={18} color={colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.phName} numberOfLines={1}>{order.pharmacyName}</Text>
                      <Text style={styles.date}>{dayLabel(order.date)} à {order.time}</Text>
                    </View>
                    <Badge label={badge.label} variant={badge.variant} size="sm" />
                  </View>

                  <View style={styles.itemsBox}>
                    {order.items.slice(0, 2).map((it) => (
                      <Text key={it.medicationId} style={styles.itemLine} numberOfLines={1}>
                        • {it.name} × {it.quantity}
                      </Text>
                    ))}
                    {order.items.length > 2 && <Text style={styles.itemMore}>+ {order.items.length - 2} autre article</Text>}
                  </View>

                  {order.status === 'annulée' && order.cancelReason ? (
                    <Text style={styles.cancelReason} numberOfLines={2}>Motif : {order.cancelReason}</Text>
                  ) : null}
                  {active && order.handoverCode ? (
                    <View style={styles.codeBox}>
                      <View style={styles.codeRow}>
                        <Ionicons name="key" size={14} color={colors.warning} />
                        <Text style={styles.codeLabel}>Code de remise</Text>
                        <Text style={styles.codeValue}>{order.handoverCode}</Text>
                      </View>
                      <Text style={styles.codeHint}>
                        {order.mode === 'delivery'
                          ? 'À donner au livreur pour confirmer la réception.'
                          : 'À présenter au comptoir pour récupérer votre commande.'}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.footerRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name={order.mode === 'delivery' ? 'bicycle' : 'bag-handle'} size={14} color={colors.textMuted} />
                      <Text style={styles.modeText}>
                        {order.mode === 'delivery' ? 'Livraison' : 'Retrait'}
                        {order.courierName ? ` — ${order.courierName}` : ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.itemsCount}>{itemsCount} article{itemsCount > 1 ? 's' : ''}</Text>
                      <Text style={styles.total}>{fcfa(order.total)}</Text>
                      {onPress && <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />}
                    </View>
                  </View>
                  {unpaid && (
                    <Button title="Finaliser le paiement" icon="card" size="sm" variant="soft" onPress={() => setPayingId(order.id)} fullWidth />
                  )}
                  {active && hint ? <Text style={styles.statusHint}>{hint}</Text> : null}
                </Card>
              </Pressable>
            );
          })}
          <Text style={styles.refreshNote}>
            <Text onPress={orders.reload} style={styles.refreshLink}>Actualiser</Text>
          </Text>
        </View>
      )}

      <PaymentSheet
        visible={!!paying}
        onClose={() => setPayingId(null)}
        amount={paying?.total ?? 0}
        label={`Commande pharmacie — ${paying?.pharmacyName ?? ''}`}
        category="order"
        relatedId={paying?.id}
        onSuccess={() => orders.reload()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  phIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.s,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phName: { fontSize: font.size.base, fontWeight: '700', color: colors.text, flexShrink: 1 },
  date: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  itemsBox: {
    backgroundColor: colors.bg,
    borderRadius: radii.m,
    padding: spacing.m,
    gap: 3,
  },
  itemLine: { fontSize: font.size.sm, color: colors.text },
  itemMore: { fontSize: font.size.xs, color: colors.textFaint },
  cancelReason: { fontSize: font.size.xs, color: colors.danger, lineHeight: 16 },
  codeBox: {
    backgroundColor: colors.warningSoft,
    borderRadius: radii.m,
    padding: spacing.m,
    gap: 4,
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeLabel: { fontSize: font.size.xs, fontWeight: '700', color: colors.warning, flex: 1 },
  codeValue: { fontSize: font.size.lg, fontWeight: '800', color: colors.text, letterSpacing: 4 },
  codeHint: { fontSize: font.size.xs, color: colors.textMuted, lineHeight: 15 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.s,
  },
  modeText: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: '600', flexShrink: 1 },
  itemsCount: { fontSize: font.size.xs, color: colors.textFaint },
  total: { fontSize: font.size.md, fontWeight: '800', color: colors.primaryDark },
  statusHint: { fontSize: font.size.xs, color: colors.textFaint, marginTop: -spacing.xs },
  refreshNote: { textAlign: 'center', padding: spacing.m },
  refreshLink: { fontSize: font.size.sm, color: colors.primary, fontWeight: '600' },
});
