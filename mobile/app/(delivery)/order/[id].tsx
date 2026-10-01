import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, ErrorState, Screen, useToast } from '@/components/ui';
import { CodeInput } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { deliveryService } from '@/services/orders';
import { useAsync } from '@/hooks/useAsync';
import { fcfa } from '@/utils/format';
import { WorkspaceOrder } from '@/models/types';

export default function DeliveryOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useToast();
  const order = useAsync(() => deliveryService.list().then((list) => list.find((o) => o.id === id) ?? null), [id]);

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const data = order.data;

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      show(success);
      order.reload();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Opération impossible', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Livraison" onBack={() => router.back()}>
      {order.loading ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
      ) : order.error || !data ? (
        <ErrorState onRetry={order.reload} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{data.pharmacyName}</Text>
              <Text style={styles.subtitle}>Commande du {data.date.split('-').reverse().join('/')} à {data.time}</Text>
            </View>
            <Badge label={data.status === 'prête' ? 'À récupérer' : data.status === 'en livraison' ? 'En livraison' : data.status} variant={data.status === 'livrée' ? 'success' : data.status === 'en livraison' ? 'info' : 'primary'} size="md" />
          </View>

          {/* Étape 1 — récupérer le colis */}
          <Text style={styles.section}>1. Récupérer le colis</Text>
          <Card padded={false}>
            <View style={styles.infoRow}>
              <Ionicons name="medkit" size={16} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoMain}>{data.pharmacyName}</Text>
                <Text style={styles.infoSub}>Avenue Kennedy, face poste central — Yaoundé</Text>
              </View>
            </View>
            {data.items.map((it) => (
              <View key={it.medicationId} style={styles.itemRow}>
                <Text style={styles.itemText} numberOfLines={1}>• {it.name} × {it.quantity}</Text>
                <Text style={styles.itemPrice}>{fcfa(it.unitPrice * it.quantity)}</Text>
              </View>
            ))}
            <View style={[styles.itemRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Montant (déjà réglé)</Text>
              <Text style={styles.totalValue}>{fcfa(data.total)}</Text>
            </View>
          </Card>
          {data.status === 'prête' && (
            <Button
              title="J’ai récupéré le colis"
              icon="bag-check"
              size="lg"
              loading={busy}
              style={{ marginTop: spacing.m }}
              onPress={() => run(() => deliveryService.pickup(id), 'Colis récupéré — bonne route !')}
              fullWidth
            />
          )}

          {/* Étape 2 — remettre au client contre le code */}
          <Text style={styles.section}>2. Remettre au client</Text>
          <Card padded={false}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoMain}>{data.patientName ?? 'Client'}</Text>
                {data.patientPhone ? <Text style={styles.infoSub}>{data.patientPhone}</Text> : null}
              </View>
            </View>
            {data.address ? (
              <View style={[styles.infoRow, styles.infoSep]}>
                <Ionicons name="location" size={16} color={colors.textMuted} />
                <Text style={styles.infoSub}>{data.address}</Text>
              </View>
            ) : null}
          </Card>

          {data.status === 'prête' && (
            <View style={[styles.notice, { backgroundColor: colors.infoSoft }]}>
              <Ionicons name="lock-closed" size={16} color={colors.info} />
              <Text style={[styles.noticeText, { color: colors.info }]}>
                Récupérez d’abord le colis : la confirmation du code se débloque ensuite.
              </Text>
            </View>
          )}

          {data.status === 'en livraison' && (
            <Card style={{ marginTop: spacing.m, gap: spacing.m }}>
              <CodeInput
                value={code}
                onChangeText={(v) => { setCode(v); setCodeError(null); }}
                error={codeError}
                label="Code secret du client"
              />
              <Button
                title="Confirmer la livraison"
                icon="checkmark-circle"
                size="lg"
                disabled={code.length !== 6}
                loading={busy}
                onPress={() =>
                  run(async () => {
                    try {
                      await deliveryService.confirmDelivery(id, code);
                    } catch (err) {
                      setCodeError(err instanceof Error ? err.message : 'Code invalide');
                      throw err;
                    }
                  }, 'Livraison confirmée — merci !')
                }
                fullWidth
              />
            </Card>
          )}

          {data.status === 'livrée' && (
            <View style={[styles.notice, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.noticeText, { color: colors.success }]}>Colis remis contre le code du client. Merci !</Text>
            </View>
          )}
          {['en attente', 'confirmée', 'annulée'].includes(data.status) && (
            <View style={[styles.notice, { backgroundColor: colors.divider }]}>
              <Ionicons name="hourglass" size={16} color={colors.textMuted} />
              <Text style={[styles.noticeText, { color: colors.textMuted }]}>
                Cette commande n’est pas encore prête en pharmacie.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.m, gap: spacing.m },
  title: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  section: { fontSize: font.size.sm, fontWeight: '800', color: colors.textMuted, marginTop: spacing.l, marginBottom: spacing.s, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, padding: spacing.m },
  infoSep: { borderTopWidth: 1, borderTopColor: colors.divider },
  infoMain: { fontSize: font.size.sm, fontWeight: '700', color: colors.text, flex: 1 },
  infoSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1, flex: 1, lineHeight: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.m, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.divider },
  itemText: { fontSize: font.size.xs, color: colors.text, flexShrink: 1, marginRight: spacing.m },
  itemPrice: { fontSize: font.size.xs, color: colors.textMuted },
  totalRow: { paddingVertical: spacing.s },
  totalLabel: { fontSize: font.size.sm, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: font.size.sm, fontWeight: '800', color: colors.primaryDark },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.m,
  },
  noticeText: { flex: 1, fontSize: font.size.xs, lineHeight: 17 },
});
