import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, BottomSheet, Button, Card, ErrorState, Input, Screen, SectionHeader, TimelineItem, useToast } from '@/components/ui';
import { CodeInput } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { pharmacyOrderService } from '@/services/orders';
import { useAsync } from '@/hooks/useAsync';
import { CourierWithLoad } from '@/models/types';
import { dayLabel, fcfa, fullDate } from '@/utils/format';

const badgeByStatus: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'primary' | 'neutral' | 'danger' }> = {
  'en attente': { label: 'À valider', variant: 'warning' },
  confirmée: { label: 'À préparer', variant: 'info' },
  prête: { label: 'Prête', variant: 'primary' },
  'en livraison': { label: 'En livraison', variant: 'info' },
  livrée: { label: 'Livrée', variant: 'success' },
  annulée: { label: 'Annulée', variant: 'danger' },
};

const eventColor: Record<string, string> = {
  'en attente': colors.warning,
  confirmée: colors.info,
  prête: colors.primary,
  'en livraison': colors.info,
  livrée: colors.success,
  annulée: colors.danger,
};

const isoOf = (datetime: string) => {
  const d = new Date(datetime);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const hhmm = (datetime: string) => {
  const d = new Date(datetime);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function PharmacyOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useToast();
  const detail = useAsync(() => pharmacyOrderService.detail(id), [id]);

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [courierSheet, setCourierSheet] = useState(false);

  const couriers = useAsync(() => (courierSheet ? pharmacyOrderService.couriers() : Promise.resolve<CourierWithLoad[]>([])), [courierSheet]);

  const reload = () => {
    setCode('');
    setCodeError(null);
    detail.reload();
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      show(success);
      reload();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Opération impossible', 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = () =>
    run(async () => {
      try {
        await pharmacyOrderService.handoverPickup(id, code);
      } catch (err) {
        setCodeError(err instanceof Error ? err.message : 'Code invalide');
        throw err;
      }
    }, 'Commande remise au client');

  const assignCourier = (courierId: string, courierName: string) =>
    run(async () => {
      await pharmacyOrderService.assign(id, courierId);
      setCourierSheet(false);
    }, `Livreur affecté : ${courierName}`);

  const data = detail.data?.order;
  const events = detail.data?.events ?? [];
  // Assignment is allowed until the parcel leaves the pharmacy.
  const canAssign = Boolean(data && data.mode === 'delivery' && ['confirmée', 'prête'].includes(data.status));

  return (
    <Screen title="Commande" onBack={() => router.back()}>
      {detail.loading ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
      ) : detail.error || !data ? (
        <ErrorState onRetry={detail.reload} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{data.patientName ?? 'Client'}</Text>
              <Text style={styles.subtitle}>{fullDate(data.date)} • {data.time}</Text>
            </View>
            <Badge {...badgeByStatus[data.status]} size="md" />
          </View>

          {data.status === 'annulée' && data.cancelReason ? (
            <View style={styles.cancelBox}>
              <Ionicons name="close-circle" size={16} color={colors.danger} />
              <Text style={styles.cancelText}>Commande annulée — {data.cancelReason}</Text>
            </View>
          ) : null}

          <Card padded={false} style={{ marginTop: spacing.m }}>
            {data.items.map((it, i) => (
              <View key={it.medicationId} style={[styles.itemRow, i > 0 && styles.itemSep]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                  <Text style={styles.itemSub}>{it.dosage} • × {it.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>{fcfa(it.unitPrice * it.quantity)}</Text>
              </View>
            ))}
            <View style={[styles.itemRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total {data.paid ? 'payé' : 'à percevoir'}</Text>
              <Text style={styles.totalValue}>{fcfa(data.total)}</Text>
            </View>
          </Card>

          {!data.paid && (
            <View style={[styles.notice, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={[styles.noticeText, { color: colors.danger }]}>
                Paiement non finalisé — la validation est bloquée tant que le client n’a pas payé.
              </Text>
            </View>
          )}

          {data.prescription && (
            <Card style={styles.rxCard}>
              <View style={styles.rxHeader}>
                <Ionicons name="document-text" size={16} color={colors.warning} />
                <Text style={styles.rxTitle}>Ordonnance à vérifier</Text>
                <Badge label={data.prescription.expiryDate >= new Date().toISOString().slice(0, 10) ? 'Valide' : 'Expirée'} variant="warning" size="sm" />
              </View>
              <Text style={styles.rxCode}>{data.prescription.code}</Text>
              <Text style={styles.rxSub}>{data.prescription.doctorName} • valable jusqu’au {data.prescription.expiryDate.split('-').reverse().join('/')}</Text>
            </Card>
          )}

          <Card style={{ marginTop: spacing.m, gap: spacing.s }}>
            <View style={styles.infoRow}>
              <Ionicons name={data.mode === 'delivery' ? 'bicycle' : 'bag-handle'} size={16} color={colors.textMuted} />
              <Text style={styles.infoText}>{data.mode === 'delivery' ? 'Livraison à domicile' : 'Retrait en pharmacie'}</Text>
            </View>
            {data.mode === 'delivery' && data.address ? (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>{data.address}</Text>
              </View>
            ) : null}
            {data.patientPhone ? (
              <View style={styles.infoRow}>
                <Ionicons name="call" size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>{data.patientPhone}</Text>
              </View>
            ) : null}
          </Card>

          {/* ------------------------ Livreur ------------------------ */}
          {data.mode === 'delivery' && data.status !== 'annulée' && (
            <Card style={{ marginTop: spacing.m }}>
              <View style={styles.courierHead}>
                <Ionicons name="bicycle" size={16} color={colors.primary} />
                <Text style={styles.courierTitle}>Livreur</Text>
                {canAssign && (
                  <Pressable hitSlop={6} onPress={() => setCourierSheet(true)}>
                    <Text style={styles.courierAction}>{data.courierId ? 'Changer' : 'Affecter'}</Text>
                  </Pressable>
                )}
              </View>
              {data.courierName ? (
                <View style={styles.courierRow}>
                  <View style={styles.courierAvatar}>
                    <Text style={styles.courierAvatarText}>{data.courierName.split(' ').map((p) => p[0]).join('').slice(0, 2)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courierName}>{data.courierName}</Text>
                    <Text style={styles.courierSub}>
                      {data.status === 'en livraison' ? 'En course — livraison en cours' : 'En attente de récupération du colis'}
                    </Text>
                  </View>
                  {data.status === 'en livraison' && <Badge label="En route" variant="info" size="sm" />}
                </View>
              ) : (
                <Text style={styles.courierEmpty}>
                  Aucun livreur affecté. La préparation en choisira un automatiquement, ou sélectionnez-le vous-même.
                </Text>
              )}
            </Card>
          )}

          {/* ------------------------ Progression ------------------------ */}
          {events.length > 0 && (
            <Card style={{ marginTop: spacing.m }}>
              <SectionHeader title="Suivi de la commande" style={{ marginBottom: spacing.m }} />
              {events.map((e, i) => (
                <TimelineItem
                  key={e.id}
                  title={e.label}
                  subtitle={e.note}
                  date={`${dayLabel(isoOf(e.createdAt))} à ${hhmm(e.createdAt)}`}
                  color={eventColor[e.status] ?? colors.primary}
                  last={i === events.length - 1}
                />
              ))}
            </Card>
          )}

          {/* ---------------------------- Actions ---------------------------- */}
          {data.status === 'en attente' && (
            <View style={{ marginTop: spacing.l, gap: spacing.s }}>
              <Button
                title="Valider la commande"
                icon="checkmark"
                size="lg"
                disabled={!data.paid}
                loading={busy}
                onPress={() => run(() => pharmacyOrderService.validate(id), 'Commande validée — à préparer')}
                fullWidth
              />
              {!rejecting ? (
                <Button title="Rejeter" variant="outline" onPress={() => setRejecting(true)} fullWidth />
              ) : (
                <View style={{ gap: spacing.s }}>
                  <Input placeholder="Motif du rejet (rupture de stock…)" value={reason} onChangeText={(t) => { setReason(t); setReasonError(null); }} error={reasonError ?? undefined} />
                  <View style={{ flexDirection: 'row', gap: spacing.s }}>
                    <View style={{ flex: 1 }}>
                      <Button title="Annuler" variant="soft" onPress={() => setRejecting(false)} fullWidth />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Confirmer le rejet"
                        variant="danger"
                        loading={busy}
                        onPress={() =>
                          run(async () => {
                            try {
                              await pharmacyOrderService.reject(id, reason);
                            } catch (err) {
                              setReasonError(err instanceof Error ? err.message : 'Motif requis');
                              throw err;
                            }
                          }, 'Commande annulée')
                        }
                        fullWidth
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {data.status === 'confirmée' && (
            <View style={{ marginTop: spacing.l, gap: spacing.s }}>
              <Button
                title={data.mode === 'delivery' ? (data.courierId ? 'Commande prête — confier au livreur' : 'Commande prête — affecter un livreur') : 'Commande prête au retrait'}
                icon="checkmark-done"
                size="lg"
                loading={busy}
                onPress={() => run(() => pharmacyOrderService.markReady(id), data.mode === 'delivery' ? 'Prête — livreur affecté' : 'Prête au retrait')}
                fullWidth
              />
            </View>
          )}

          {data.status === 'prête' && data.mode === 'delivery' && (
            <View style={[styles.notice, { backgroundColor: colors.infoSoft, marginTop: spacing.l }]}>
              <Ionicons name="bicycle" size={16} color={colors.info} />
              <Text style={[styles.noticeText, { color: colors.info }]}>
                En attente du livreur{data.courierName ? ` (${data.courierName})` : ''} — il confirmera la remise avec le code du client.
              </Text>
            </View>
          )}

          {data.status === 'prête' && data.mode === 'pickup' && (
            <View style={{ marginTop: spacing.l }}>
              <Card style={{ gap: spacing.m }}>
                <Text style={styles.handoverTitle}>Remise au comptoir</Text>
                <CodeInput value={code} onChangeText={(v) => { setCode(v); setCodeError(null); }} error={codeError} />
                <Button
                  title="Confirmer la remise"
                  icon="hand-left"
                  size="lg"
                  disabled={code.length !== 6}
                  loading={busy}
                  onPress={submitCode}
                  fullWidth
                />
              </Card>
            </View>
          )}

          {data.status === 'en livraison' && (
            <View style={[styles.notice, { backgroundColor: colors.infoSoft, marginTop: spacing.l }]}>
              <Ionicons name="bicycle" size={16} color={colors.info} />
              <Text style={[styles.noticeText, { color: colors.info }]}>
                Colis en cours de livraison — le livreur clôture la commande avec le code secret du client.
              </Text>
            </View>
          )}

          {['livrée', 'annulée'].includes(data.status) && (
            <View style={[styles.notice, { backgroundColor: data.status === 'livrée' ? colors.successSoft : colors.dangerSoft, marginTop: spacing.l }]}>
              <Ionicons name={data.status === 'livrée' ? 'checkmark-circle' : 'close-circle'} size={16} color={data.status === 'livrée' ? colors.success : colors.danger} />
              <Text style={[styles.noticeText, { color: data.status === 'livrée' ? colors.success : colors.danger }]}>
                {data.status === 'livrée' ? 'Commande remise et clôturée.' : 'Commande annulée.'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ---------------- Affectation du livreur ---------------- */}
      <BottomSheet visible={courierSheet} onClose={() => setCourierSheet(false)} title="Affecter un livreur">
        {couriers.loading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.l }} />
        ) : (couriers.data ?? []).length === 0 ? (
          <Text style={styles.sheetEmpty}>Aucun livreur dans votre équipe.</Text>
        ) : (
          <ScrollView style={{ maxHeight: 400 }}>
            {(couriers.data ?? []).map((c) => {
              const selected = data?.courierId === c.id;
              return (
                <Pressable
                  key={c.id}
                  disabled={!c.active || busy}
                  onPress={() => assignCourier(c.id, `${c.firstName} ${c.lastName}`)}
                  style={({ pressed }) => [styles.courierOption, (!c.active || pressed) && { opacity: 0.55 }]}
                >
                  <View style={[styles.courierAvatar, { backgroundColor: c.active ? colors.primarySoft : colors.divider }]}>
                    <Text style={styles.courierAvatarText}>{`${c.firstName} ${c.lastName}`.split(' ').map((p) => p[0]).join('').slice(0, 2)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courierOptionName}>
                      {c.firstName} {c.lastName} {!c.active && <Text style={styles.courierInactive}>· inactif</Text>}
                    </Text>
                    <Text style={styles.courierOptionSub}>
                      {c.vehicle === 'voiture' ? 'Voiture' : 'Moto'} • {c.activeDeliveries} livraison{c.activeDeliveries > 1 ? 's' : ''} en cours
                    </Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : <Ionicons name="ellipse-outline" size={22} color={colors.border} />}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.m, gap: spacing.m },
  title: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  cancelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.m,
  },
  cancelText: { flex: 1, fontSize: font.size.sm, color: colors.danger },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, padding: spacing.m },
  itemSep: { borderTopWidth: 1, borderTopColor: colors.divider },
  itemName: { fontSize: font.size.sm, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  itemPrice: { fontSize: font.size.sm, fontWeight: '700', color: colors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.divider },
  totalLabel: { flex: 1, fontSize: font.size.sm, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: font.size.md, fontWeight: '800', color: colors.primaryDark },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.m,
  },
  noticeText: { flex: 1, fontSize: font.size.xs, lineHeight: 17 },
  rxCard: { marginTop: spacing.m, borderWidth: 1.5, borderColor: colors.warning, backgroundColor: colors.warningSoft },
  rxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rxTitle: { fontSize: font.size.sm, fontWeight: '800', color: colors.warning, flex: 1 },
  rxCode: { fontSize: font.size.sm, fontWeight: '700', color: colors.text, marginTop: spacing.s },
  rxSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  infoText: { flex: 1, fontSize: font.size.sm, color: colors.text },
  courierHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.s },
  courierTitle: { fontSize: font.size.sm, fontWeight: '800', color: colors.text, flex: 1 },
  courierAction: { fontSize: font.size.sm, fontWeight: '700', color: colors.primary },
  courierRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  courierAvatar: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierAvatarText: { fontSize: font.size.sm, fontWeight: '800', color: colors.primaryDark },
  courierName: { fontSize: font.size.sm, fontWeight: '700', color: colors.text },
  courierSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  courierEmpty: { fontSize: font.size.xs, color: colors.textMuted, lineHeight: 17 },
  courierOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.s },
  courierOptionName: { fontSize: font.size.base, fontWeight: '600', color: colors.text },
  courierOptionSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  courierInactive: { color: colors.textFaint, fontWeight: '400' },
  sheetEmpty: { fontSize: font.size.sm, color: colors.textMuted, paddingVertical: spacing.l, textAlign: 'center' },
  handoverTitle: { fontSize: font.size.base, fontWeight: '800', color: colors.text },
});
