import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Badge, Button, Card, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { categoryStyle } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { fcfa, todayISO } from '@/utils/format';

export default function CartScreen() {
  const { cart, setCartQuantity, prescriptions } = useAppData();

  const subtotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);
  const rxItems = cart.filter((c) => c.requiresPrescription);

  const activePrescriptions = useMemo(
    () => prescriptions.filter((p) => p.status === 'active' && p.expiryDate >= todayISO()),
    [prescriptions],
  );
  const rxBlocked = rxItems.length > 0 && activePrescriptions.length === 0;

  if (cart.length === 0) {
    return (
      <Screen title="Mon panier" onBack={() => router.back()}>
        <EmptyState
          icon="cart-outline"
          title="Votre panier est vide"
          message="Parcourez le catalogue de la pharmacie et ajoutez vos médicaments pour passer commande."
          actionLabel="Découvrir le catalogue"
          onAction={() => router.replace('/(patient)/pharmacy')}
        />
      </Screen>
    );
  }

  return (
    <Screen title={`Mon panier (${cart.length})`} onBack={() => router.back()}>
      <View style={{ gap: spacing.s }}>
        {cart.map((item) => {
          const style = categoryStyle(item.category);
          return (
            <Card key={item.medicationId} style={{ gap: spacing.s }}>
              <View style={{ flexDirection: 'row', gap: spacing.m }}>
                <View style={[styles.itemIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={style.icon} size={20} color={style.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    {item.requiresPrescription && <Badge label="Rx" variant="warning" size="sm" />}
                  </View>
                  <Text style={styles.itemSub}>{item.form} · {item.dosage}</Text>
                  <Text style={styles.itemUnit}>{fcfa(item.unitPrice)} / unité</Text>
                </View>
                <Pressable hitSlop={8} onPress={() => setCartQuantity(item.medicationId, 0)} style={styles.trashBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
              <View style={styles.itemFooter}>
                <View style={styles.stepper}>
                  <Pressable onPress={() => setCartQuantity(item.medicationId, item.quantity - 1)} style={styles.stepBtn}>
                    <Ionicons name="remove" size={16} color={colors.primary} />
                  </Pressable>
                  <Text style={styles.stepQty}>{item.quantity}</Text>
                  <Pressable onPress={() => setCartQuantity(item.medicationId, Math.min(10, item.quantity + 1))} style={styles.stepBtn}>
                    <Ionicons name="add" size={16} color={colors.primary} />
                  </Pressable>
                </View>
                <Text style={styles.lineTotal}>{fcfa(item.unitPrice * item.quantity)}</Text>
              </View>
            </Card>
          );
        })}
      </View>

      {rxItems.length > 0 && (
        <View style={[styles.rxNotice, rxBlocked && styles.rxBlocked]}>
          <Ionicons name={rxBlocked ? 'warning' : 'information-circle'} size={18} color={rxBlocked ? colors.warning : colors.info} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rxNoticeText, rxBlocked && { color: colors.warning, fontWeight: '700' }]}>
              {rxBlocked
                ? 'Ordonnance obligatoire — certains articles de votre panier nécessitent une ordonnance médicale valide.'
                : `${rxItems.length} article${rxItems.length > 1 ? 's' : ''} sur ordonnance — une ordonnance active vous sera demandée à la commande.`}
            </Text>
            {rxBlocked && (
              <Button
                title="Importer une ordonnance"
                icon="cloud-download"
                size="sm"
                style={{ marginTop: spacing.s }}
                onPress={() => router.push('/prescriptions/import')}
              />
            )}
          </View>
        </View>
      )}

      <SectionHeader title="Récapitulatif" style={{ paddingHorizontal: 0 }} />
      <Card>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sous-total ({cart.reduce((s, c) => s + c.quantity, 0)} articles)</Text>
          <Text style={styles.summaryValue}>{fcfa(subtotal)}</Text>
        </View>
        <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.summaryLabel}>Livraison</Text>
          <Text style={styles.summaryValue}>À partir de 1 000 FCFA</Text>
        </View>
      </Card>

      <View style={{ marginTop: spacing.l, gap: spacing.s }}>
        <Button
          title={rxBlocked ? 'Ordonnance requise pour continuer' : 'Passer commande'}
          icon={rxBlocked ? 'lock-closed' : 'arrow-forward'}
          size="lg"
          fullWidth
          disabled={rxBlocked}
          onPress={() => router.push('/checkout')}
        />
        <Button
          title="Continuer mes achats"
          variant="ghost"
          onPress={() => router.replace('/(patient)/pharmacy')}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { fontSize: font.size.base, fontWeight: '700', color: colors.text, flexShrink: 1 },
  itemSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  itemUnit: { fontSize: font.size.xs, color: colors.textFaint, marginTop: 4 },
  trashBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.s,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: { fontSize: font.size.base, fontWeight: '800', color: colors.text, minWidth: 22, textAlign: 'center' },
  lineTotal: { fontSize: font.size.md, fontWeight: '800', color: colors.text },
  rxNotice: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.infoSoft,
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.m,
  },
  rxBlocked: { backgroundColor: colors.warningSoft, borderWidth: 1.5, borderColor: '#F3DFB3' },
  rxNoticeText: { flex: 1, fontSize: font.size.xs, color: colors.info, lineHeight: 17 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  summaryLabel: { fontSize: font.size.sm, color: colors.textMuted },
  summaryValue: { fontSize: font.size.sm, color: colors.text, fontWeight: '600' },
});
