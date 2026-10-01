import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Badge, Button, Card, EmptyState, Input, Screen, SectionHeader, useToast } from '@/components/ui';
import { PaymentSheet, categoryStyle } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { pharmacyService, orderService } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useLocation } from '@/hooks/useLocation';
import { useAppData } from '@/context/AppDataContext';
import { fcfa, todayISO } from '@/utils/format';
import { formatDistance, haversineKm } from '@/utils/geo';
import { Order, Payment } from '@/models/types';

const DELIVERY_FEE = 1000;

export default function CheckoutScreen() {
  const { cart, clearCart, prescriptions } = useAppData();
  const { show } = useToast();

  const pharmacies = useAsync(() => pharmacyService.list({}), []);
  const { status: locationStatus, coords, retry: retryLocation } = useLocation();

  const [step, setStep] = useState(0);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [mode, setMode] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('Quartier Nlongkak, Rue 1.234, Yaoundé');
  const [payVisible, setPayVisible] = useState(false);
  const [placing, setPlacing] = useState(false);
  /** Order already created server-side (« en attente », unpaid), awaiting the charge. */
  const [draft, setDraft] = useState<{ order: Order; handoverCode: string } | null>(null);
  const [placed, setPlaced] = useState<{ order: Order; handoverCode: string; paymentId: string } | null>(null);

  const activePrescriptions = useMemo(
    () => prescriptions.filter((p) => p.status === 'active' && p.expiryDate >= todayISO()),
    [prescriptions],
  );

  const rxNeeded = cart.some((c) => c.requiresPrescription);
  const rxStep = rxNeeded ? 0 : -1;
  const deliveryStep = rxNeeded ? 1 : 0;
  const steps = [...(rxNeeded ? ['Ordonnance'] : []), 'Livraison', 'Confirmation'];

  const subtotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);
  const deliveryFee = mode === 'delivery' ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  const allPharmacies = pharmacies.data ?? [];

  const distances = useMemo(() => {
    const map = new Map<string, number>();
    if (!coords) return map;
    for (const p of allPharmacies) {
      if (typeof p.latitude === 'number' && typeof p.longitude === 'number') map.set(p.id, haversineKm(coords, p));
    }
    return map;
  }, [allPharmacies, coords]);
  const hasFix = distances.size > 0;

  /**
   * The pharmacy is not chosen by the user: the order is attached to the
   * closest pharmacy stocking the whole cart (first stocked one when the
   * position is unknown). Non-stocking pharmacies source from their partners.
   */
  const pharmacy = useMemo(() => {
    if (allPharmacies.length === 0) return null;
    const stocked = allPharmacies.filter((p) => cart.every((c) => p.medicationIds.includes(c.medicationId)));
    const candidates = stocked.length > 0 ? stocked : allPharmacies;
    if (!hasFix) return candidates[0];
    return [...candidates].sort((a, b) => (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity))[0];
  }, [allPharmacies, cart, distances, hasFix]);
  const fullyStocked = allPharmacies.some((p) => cart.every((c) => p.medicationIds.includes(c.medicationId)));

  // The attached pharmacy gates the handover modes (backend rejects unsupported ones).
  useEffect(() => {
    if (!pharmacy) return;
    if (mode === 'delivery' && !pharmacy.deliveryAvailable && pharmacy.pickupAvailable) setMode('pickup');
    else if (mode === 'pickup' && !pharmacy.pickupAvailable && pharmacy.deliveryAvailable) setMode('delivery');
  }, [pharmacy, mode]);
  const deliveryOk = pharmacy?.deliveryAvailable ?? true;
  const pickupOk = pharmacy?.pickupAvailable ?? true;

  if (cart.length === 0 && !placed) {
    return (
      <Screen title="Commande" onBack={() => router.back()}>
        <EmptyState
          icon="cart-outline"
          title="Votre panier est vide"
          message="Ajoutez des médicaments à votre panier avant de passer commande."
          actionLabel="Retour à la pharmacie"
          onAction={() => router.replace('/(patient)/pharmacy')}
        />
      </Screen>
    );
  }

  const prescriptionReady = !rxNeeded || (prescriptionId !== null && activePrescriptions.some((p) => p.id === prescriptionId));
  const canNext =
    step === rxStep ? prescriptionReady : step === deliveryStep ? !!pharmacy && (mode === 'pickup' || address.trim().length > 5) : true;

  /** Creates the « en attente » order server-side, then opens the payment sheet on it. */
  const startPayment = async () => {
    if (!pharmacy || placing) return;
    if (draft) {
      setPayVisible(true);
      return;
    }
    setPlacing(true);
    try {
      const created = await orderService.create({
        pharmacyId: pharmacy.id,
        mode,
        address: mode === 'delivery' ? address : pharmacy.address,
        prescriptionId: prescriptionId ?? undefined,
      });
      setDraft(created);
      setPayVisible(true);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Impossible de créer la commande', 'error');
    } finally {
      setPlacing(false);
    }
  };

  /** The charge succeeded — the backend attached the payment and cleared the cart. */
  const onPaid = (payment: Payment) => {
    if (!draft) return;
    setPlaced({ ...draft, paymentId: payment.id });
    void clearCart();
    setStep(steps.length - 1);
    show('Commande confirmée, merci !');
  };

  return (
    <Screen
      title={placed ? 'Commande confirmée' : 'Commande'}
      onBack={() =>
        placed || step >= steps.length - 1
          ? router.replace('/(patient)/pharmacy')
          : step > 0
            ? setStep(step - 1)
            : router.back()
      }
    >
      {!placed && (
        <>
          <View style={styles.progressRow}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.progressSeg, i <= step && styles.progressSegActive]} />
            ))}
          </View>
          <Text style={styles.stepLabel}>Étape {step + 1} sur {steps.length} — {steps[step]}</Text>

          <Card style={{ marginTop: spacing.m }} padded={false}>
            {cart.map((c, i) => {
              const style = categoryStyle(c.category);
              return (
                <View key={c.medicationId} style={[styles.cartRow, i > 0 && styles.cartRowSep]}>
                  <View style={[styles.cartIcon, { backgroundColor: style.bg }]}>
                    <Ionicons name={style.icon} size={17} color={style.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartName} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.cartSub}>{c.dosage} · × {c.quantity}</Text>
                  </View>
                  {c.requiresPrescription && <Badge label="Rx" variant="warning" size="sm" />}
                  <Text style={styles.cartPrice}>{fcfa(c.unitPrice * c.quantity)}</Text>
                </View>
              );
            })}
          </Card>
        </>
      )}

      {placed ? (
        <View style={{ alignItems: 'center', paddingTop: spacing.l }}>
          <View style={styles.checkWrap}>
            <Ionicons name="checkmark" size={40} color={colors.white} />
          </View>
          <Text style={styles.doneTitle}>Merci pour votre commande !</Text>
          <Text style={styles.doneSub}>
            {placed.order.mode === 'delivery'
              ? `Livraison à : ${placed.order.address}`
              : `À retirer chez ${placed.order.pharmacyName}`}
          </Text>

          <Card style={[styles.codeCard, { alignSelf: 'stretch', marginTop: spacing.l }]}>
            <View style={styles.codeHeader}>
              <Ionicons name="key" size={16} color={colors.warning} />
              <Text style={styles.codeTitle}>VOTRE CODE DE REMISE</Text>
            </View>
            <Text style={styles.codeValue}>{placed.handoverCode.split('').join(' ')}</Text>
            <Text style={styles.codeHint}>
              Secret et personnel : communiquez-le au livreur ou au pharmacien uniquement au moment de
              recevoir votre commande. Retrouvez-le dans « Mes commandes ».
            </Text>
          </Card>

          <Card style={{ alignSelf: 'stretch', marginTop: spacing.m }} padded={false}>
            {placed.order.items.map((it) => (
              <View key={it.medicationId} style={styles.summaryRow}>
                <Text style={styles.summaryLabel} numberOfLines={1}>{it.name} × {it.quantity}</Text>
                <Text style={styles.summaryValue}>{fcfa(it.unitPrice * it.quantity)}</Text>
              </View>
            ))}
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={[styles.summaryLabel, { fontWeight: '800', color: colors.text }]}>Total payé</Text>
              <Text style={[styles.summaryValue, { fontWeight: '800' }]}>{fcfa(placed.order.total)}</Text>
            </View>
          </Card>
          <View style={{ alignSelf: 'stretch', marginTop: spacing.l, gap: spacing.s }}>
            <Button title="Voir le reçu de paiement" icon="receipt" size="lg" onPress={() => router.push(`/payments/${placed.paymentId}`)} fullWidth />
            <Button title="Suivre mes commandes" variant="soft" onPress={() => router.replace('/orders')} fullWidth />
            <Button title="Retour à l’accueil" variant="outline" onPress={() => router.replace('/(patient)')} fullWidth />
          </View>
        </View>
      ) : (
        <>
          {step === rxStep && (
            <View>
              <SectionHeader title="Ordonnance associée" style={{ paddingHorizontal: 0 }} />
              {activePrescriptions.map((rx) => (
                <Pressable key={rx.id} onPress={() => setPrescriptionId(rx.id)} style={[styles.option, prescriptionId === rx.id && styles.optionActive]}>
                  <Ionicons name="document-text" size={18} color={prescriptionId === rx.id ? colors.primary : colors.textMuted} />
                  <View style={{ flex: 1, marginLeft: spacing.m }}>
                    <Text style={styles.optionTitle}>{rx.code}</Text>
                    <Text style={styles.optionSub}>{rx.doctorName} • expire le {rx.expiryDate.split('-').reverse().join('/')}</Text>
                  </View>
                  {prescriptionId === rx.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </Pressable>
              ))}
              <Pressable style={styles.importLink} onPress={() => router.push('/prescriptions/import')}>
                <Ionicons name="cloud-download" size={15} color={colors.primary} />
                <Text style={styles.importLinkText}>Importer une autre ordonnance</Text>
              </Pressable>
            </View>
          )}

          {step === deliveryStep && (
            <View>
              <SectionHeader title="Mode de retrait" style={{ paddingHorizontal: 0 }} />

              {draft ? (
                <View style={styles.pendingNotice}>
                  <Ionicons name="time" size={18} color={colors.warning} />
                  <Text style={styles.pendingNoticeText}>
                    Commande enregistrée chez {draft.order.pharmacyName} — finalisez le paiement pour qu’elle soit préparée.
                  </Text>
                </View>
              ) : pharmacies.loading ? (
                <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.l }} />
              ) : pharmacy ? (
                <View style={styles.option}>
                  <View style={styles.optionIcon}>
                    <Ionicons name="medkit" size={18} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{pharmacy.name}</Text>
                    <Text style={styles.optionSub}>
                      {pharmacy.district}, {pharmacy.city}
                      {hasFix && distances.has(pharmacy.id) ? ` · à ${formatDistance(distances.get(pharmacy.id)!)}` : ''}
                    </Text>
                    <Text style={styles.autoNote}>
                      {fullyStocked
                        ? hasFix
                          ? 'La plus proche de votre position disposant de tous vos articles.'
                          : 'Sélection automatique — activez la localisation pour viser la plus proche.'
                        : 'Aucune pharmacie ne dispose de tous les articles : la commande sera transmise à la plus proche, qui s’approvisionne auprès de ses partenaires.'}
                    </Text>
                  </View>
                  {pharmacy.onDuty && <Badge label="De garde" variant="success" size="sm" />}
                </View>
              ) : (
                <View style={styles.pendingNotice}>
                  <Ionicons name="warning" size={18} color={colors.warning} />
                  <Text style={styles.pendingNoticeText}>
                    Impossible de charger les pharmacies.{' '}
                    <Text onPress={pharmacies.reload} style={styles.retryText}>Réessayer</Text>
                  </Text>
                </View>
              )}

              {!draft && pharmacy && (
                <>
                  {locationStatus !== 'loading' && locationStatus !== 'granted' && (
                    <View style={styles.locationNote}>
                      <Ionicons name="location-outline" size={15} color={colors.info} />
                      <Text style={styles.locationNoteText}>Position indisponible : la pharmacie partenaire par défaut est utilisée.</Text>
                      <Text style={styles.locationRetry} onPress={retryLocation}>
                        Réessayer
                      </Text>
                    </View>
                  )}

                  <Pressable
                    style={[styles.option, mode === 'delivery' && styles.optionActive, !deliveryOk && styles.optionDisabled]}
                    onPress={() => deliveryOk && setMode('delivery')}
                    disabled={!deliveryOk}
                  >
                    <Ionicons name="bicycle" size={20} color={mode === 'delivery' ? colors.primary : colors.textMuted} />
                    <View style={{ flex: 1, marginLeft: spacing.m }}>
                      <Text style={styles.optionTitle}>Livraison à domicile</Text>
                      <Text style={styles.optionSub}>
                        {deliveryOk ? `Sous 2 à 4 heures — frais ${fcfa(DELIVERY_FEE)}` : `${pharmacy.name} ne propose pas la livraison`}
                      </Text>
                    </View>
                    {mode === 'delivery' && deliveryOk && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </Pressable>
                  <Pressable
                    style={[styles.option, mode === 'pickup' && styles.optionActive, !pickupOk && styles.optionDisabled]}
                    onPress={() => pickupOk && setMode('pickup')}
                    disabled={!pickupOk}
                  >
                    <Ionicons name="bag-handle" size={20} color={mode === 'pickup' ? colors.primary : colors.textMuted} />
                    <View style={{ flex: 1, marginLeft: spacing.m }}>
                      <Text style={styles.optionTitle}>Retrait en pharmacie</Text>
                      <Text style={styles.optionSub}>
                        {pickupOk ? `${pharmacy.name} — gratuitement` : `${pharmacy.name} ne propose pas le retrait`}
                      </Text>
                    </View>
                    {mode === 'pickup' && pickupOk && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </Pressable>

                  {mode === 'delivery' && (
                    <View style={{ marginTop: spacing.s }}>
                      <Input label="Adresse de livraison" leftIcon="location" value={address} onChangeText={setAddress} placeholder="Quartier, rue, repère…" />
                    </View>
                  )}
                  <Card style={{ marginTop: spacing.s }} padded={false}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Sous-total</Text>
                      <Text style={styles.summaryValue}>{fcfa(subtotal)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Livraison</Text>
                      <Text style={styles.summaryValue}>{deliveryFee ? fcfa(deliveryFee) : 'Gratuit'}</Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryTotal]}>
                      <Text style={[styles.summaryLabel, { fontWeight: '800', color: colors.text }]}>Total</Text>
                      <Text style={[styles.summaryValue, { fontWeight: '800' }]}>{fcfa(total)}</Text>
                    </View>
                  </Card>
                </>
              )}
            </View>
          )}

          <Button
            title={draft ? 'Finaliser le paiement' : step === deliveryStep ? `Payer ${fcfa(total)}` : 'Continuer'}
            disabled={!canNext}
            icon={step === deliveryStep ? 'lock-closed' : undefined}
            size="lg"
            fullWidth
            style={{ marginTop: spacing.l }}
            onPress={() => (step === deliveryStep ? startPayment() : setStep(step + 1))}
          />
        </>
      )}

      <PaymentSheet
        visible={payVisible}
        onClose={() => setPayVisible(false)}
        amount={draft?.order.total ?? total}
        label={`Commande pharmacie — ${draft?.order.pharmacyName ?? pharmacy?.name ?? ''}`}
        category="order"
        relatedId={draft?.order.id}
        onSuccess={onPaid}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', gap: 6, marginTop: spacing.s },
  progressSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.divider },
  progressSegActive: { backgroundColor: colors.primary },
  stepLabel: { fontSize: font.size.xs, color: colors.textMuted, marginTop: spacing.s, fontWeight: '600' },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.m,
  },
  cartRowSep: { borderTopWidth: 1, borderTopColor: colors.divider },
  cartIcon: { width: 38, height: 38, borderRadius: radii.s, alignItems: 'center', justifyContent: 'center' },
  cartName: { fontSize: font.size.sm, fontWeight: '700', color: colors.text, flexShrink: 1 },
  cartSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  cartPrice: { fontSize: font.size.sm, fontWeight: '700', color: colors.text },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: '#F4FAF8' },
  optionDisabled: { opacity: 0.5 },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.s,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  optionSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  autoNote: { fontSize: font.size.xs, color: colors.textFaint, marginTop: 4, lineHeight: 15 },
  importLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', padding: spacing.s },
  importLinkText: { fontSize: font.size.sm, color: colors.primary, fontWeight: '600' },
  pendingNotice: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  pendingNoticeText: { flex: 1, fontSize: font.size.xs, color: colors.text, lineHeight: 17 },
  retryText: { color: colors.primary, fontWeight: '700' },
  locationNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.s },
  locationNoteText: { flex: 1, fontSize: font.size.xs, color: colors.textMuted, lineHeight: 16 },
  locationRetry: { fontSize: font.size.xs, color: colors.primary, fontWeight: '700', paddingHorizontal: 4 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  summaryTotal: { borderBottomWidth: 0 },
  summaryLabel: { fontSize: font.size.sm, color: colors.textMuted, flexShrink: 1, marginRight: spacing.m },
  summaryValue: { fontSize: font.size.sm, color: colors.text, fontWeight: '600' },
  checkWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCard: {
    borderWidth: 1.5,
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.l,
    padding: spacing.l,
    alignItems: 'center',
  },
  codeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeTitle: { fontSize: font.size.xs, fontWeight: '800', color: colors.warning, letterSpacing: 1 },
  codeValue: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 6,
    marginTop: spacing.s,
  },
  codeHint: { fontSize: font.size.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.s, lineHeight: 17 },
  doneTitle: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text, marginTop: spacing.l },
  doneSub: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: spacing.l },
});
