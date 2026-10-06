import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../ui/BottomSheet';
import { Input } from '../ui/Input';
import { useAppData } from '@/context/AppDataContext';
import { colors, font, radii, spacing } from '@/constants/theme';
import { fcfa, nowTime, todayISO } from '@/utils/format';
import { Payment, PaymentMethod } from '@/models/types';

const methods: { id: PaymentMethod; name: string; sub: string; tint: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'mtn_momo', name: 'MTN Mobile Money', sub: 'Paiement par compte MTN', tint: '#F5C400', icon: 'phone-portrait' },
  { id: 'orange_money', name: 'Orange Money', sub: 'Paiement par compte Orange', tint: '#FF7900', icon: 'phone-portrait' },
  { id: 'card', name: 'Carte bancaire', sub: 'Visa, Mastercard', tint: colors.info, icon: 'card' },
];

export function PaymentSheet({
  visible,
  onClose,
  amount,
  label,
  category,
  relatedId,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  amount: number;
  label: string;
  category: Payment['category'];
  relatedId?: string;
  onSuccess: (payment: Payment) => void;
}) {
  const { addPayment } = useAppData();
  const [method, setMethod] = useState<PaymentMethod>('mtn_momo');
  const [phone, setPhone] = useState('+237 691 45 78 20');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [phase, setPhase] = useState<'select' | 'processing' | 'success' | 'failed'>('select');
  const [payError, setPayError] = useState<string | null>(null);

  const reset = () => {
    setPhase('select');
    setPayError(null);
  };

  const pay = async () => {
    setPhase('processing');
    try {
      // The server computes reference/amount/label and applies the flow's side
      // effects; the returned payment is the canonical receipt.
      const payment = await addPayment({
        id: '',
        reference: '',
        label,
        category,
        amount,
        status: 'paid',
        method,
        date: todayISO(),
        time: nowTime(),
        relatedId,
      });
      setPhase('success');
      onSuccess(payment);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Paiement impossible pour le moment.');
      setPhase('failed');
    }
  };

  const methodReady =
    method === 'card' ? cardNumber.replace(/\s/g, '').length >= 12 && cardExp.length >= 4 && cardCvv.length >= 3 : phone.replace(/\D/g, '').length >= 9;

  return (
    <BottomSheet visible={visible} onClose={() => { onClose(); reset(); }} title={phase === 'select' ? 'Paiement sécurisé' : undefined} height="88%">
      {phase === 'select' && (
        <View style={{ flex: 1 }}>
          {/* Scrollable form area — the sheet is height-capped, and with the
              card method selected the inputs overflow it on small screens. */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.s }}>
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Montant à payer</Text>
              <Text style={styles.amount}>{fcfa(amount)}</Text>
              <Text style={styles.amountSub}>{label}</Text>
            </View>

            <Text style={styles.sectionTitle}>Moyen de paiement</Text>
            {methods.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setMethod(m.id)}
                style={[styles.method, method === m.id && styles.methodSelected]}
              >
                <View style={[styles.methodIcon, { backgroundColor: `${m.tint}22` }]}>
                  <Ionicons name={m.icon} size={20} color={m.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodName}>{m.name}</Text>
                  <Text style={styles.methodSub}>{m.sub}</Text>
                </View>
                {method === m.id ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : (
                  <View style={styles.radio} />
                )}
              </Pressable>
            ))}

            {method === 'card' ? (
              <View style={{ marginTop: spacing.s }}>
                <Input label="Numéro de carte" placeholder="4242 4242 4242 4242" keyboardType="number-pad" value={cardNumber} onChangeText={setCardNumber} leftIcon="card" />
                <View style={{ flexDirection: 'row', gap: spacing.s }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Expiration" placeholder="MM/AA" keyboardType="number-pad" value={cardExp} onChangeText={setCardExp} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="CVV" placeholder="123" keyboardType="number-pad" secureTextEntry value={cardCvv} onChangeText={setCardCvv} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ marginTop: spacing.s }}>
                <Input
                  label={method === 'mtn_momo' ? 'Numéro MTN Mobile Money' : 'Numéro Orange Money'}
                  leftIcon="call"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  hint="Vous recevrez une demande de confirmation sur votre téléphone (simulation)."
                />
              </View>
            )}
          </ScrollView>

          {/* Actions stay pinned below the scroll area. */}
          <View style={{ gap: spacing.s, paddingTop: spacing.s }}>
            <Pressable onPress={() => setPhase('failed')} style={styles.failSim}>
              <Text style={styles.failSimText}>Simuler un échec de paiement (démo)</Text>
            </Pressable>
            <Pressable style={styles.payButton} onPress={pay} disabled={!methodReady}>
              <Ionicons name="lock-closed" size={16} color={colors.white} />
              <Text style={styles.payText}>Payer {fcfa(amount)}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {phase === 'processing' && (
        <View style={styles.center}>
          <View style={styles.spinnerWrap}>
            <Ionicons name="sync" size={40} color={colors.primary} />
          </View>
          <Text style={styles.centerTitle}>Traitement du paiement…</Text>
          <Text style={styles.centerSub}>
            {method === 'card'
              ? 'Validation de votre carte en cours.'
              : 'Confirmez la transaction sur votre téléphone si une demande a été envoyée.'}
          </Text>
        </View>
      )}

      {phase === 'success' && (
        <View style={styles.center}>
          <View style={[styles.resultIcon, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="checkmark" size={40} color={colors.success} />
          </View>
          <Text style={styles.centerTitle}>Paiement réussi</Text>
          <Text style={styles.centerSub}>
            {fcfa(amount)} payés via {method === 'mtn_momo' ? 'MTN Mobile Money' : method === 'orange_money' ? 'Orange Money' : 'carte bancaire'}.
          </Text>
          <View style={{ alignSelf: 'stretch', marginTop: spacing.l }}>
            <Pressable style={styles.payButton} onPress={() => { onClose(); reset(); }}>
              <Text style={styles.payText}>Continuer</Text>
            </Pressable>
          </View>
        </View>
      )}

      {phase === 'failed' && (
        <View style={styles.center}>
          <View style={[styles.resultIcon, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="close" size={40} color={colors.danger} />
          </View>
          <Text style={styles.centerTitle}>Paiement échoué</Text>
          <Text style={styles.centerSub}>
            {payError ?? 'La transaction n’a pas pu être finalisée. Votre compte n’a pas été débité. Veuillez réessayer ou choisir un autre moyen de paiement.'}
          </Text>
          <View style={{ alignSelf: 'stretch', marginTop: spacing.l, gap: spacing.s }}>
            <Pressable style={styles.payButton} onPress={reset}>
              <Ionicons name="refresh" size={16} color={colors.white} />
              <Text style={styles.payText}>Réessayer</Text>
            </Pressable>
            <Pressable style={[styles.payButton, { backgroundColor: colors.divider }]} onPress={() => { onClose(); reset(); }}>
              <Text style={[styles.payText, { color: colors.text }]}>Plus tard</Text>
            </Pressable>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  amountCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.l,
    alignItems: 'center',
    paddingVertical: spacing.l,
  },
  amountLabel: {
    fontSize: font.size.sm,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 4,
  },
  amountSub: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: spacing.l,
  },
  sectionTitle: {
    fontSize: font.size.base,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.s,
    backgroundColor: colors.card,
  },
  methodSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodName: {
    fontSize: font.size.base,
    fontWeight: '700',
    color: colors.text,
  },
  methodSub: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.m,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payText: {
    color: colors.white,
    fontSize: font.size.md,
    fontWeight: '700',
  },
  failSim: {
    alignSelf: 'center',
    padding: spacing.s,
  },
  failSimText: {
    fontSize: font.size.xs,
    color: colors.textFaint,
    textDecorationLine: 'underline',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
  spinnerWrap: { marginBottom: spacing.m },
  resultIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  centerTitle: {
    fontSize: font.size.xl,
    fontWeight: '800',
    color: colors.text,
  },
  centerSub: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: spacing.m,
  },
});
