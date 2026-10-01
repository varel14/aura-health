import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, ErrorState, Screen, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { fcfa, fullDate } from '@/utils/format';

const methodLabels: Record<string, string> = {
  mtn_momo: 'MTN Mobile Money',
  orange_money: 'Orange Money',
  card: 'Carte bancaire',
};

const categoryLabels: Record<string, string> = {
  consultation: 'Paiement de consultation',
  medication: 'Achat de médicaments',
  order: 'Commande pharmacie',
};

export default function PaymentReceipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { payments, appointments } = useAppData();
  const { show } = useToast();
  const payment = payments.find((p) => p.id === id);

  if (!payment) {
    return (
      <Screen title="Reçu" onBack={() => router.back()}>
        <ErrorState message="Cette transaction n’existe pas." />
      </Screen>
    );
  }

  const relatedAppointment = appointments.find((a) => a.id === payment.relatedId);

  return (
    <Screen title="Détail du paiement" onBack={() => router.back()}>
      <View
        style={[
          styles.banner,
          {
            backgroundColor:
              payment.status === 'paid'
                ? colors.successSoft
                : payment.status === 'failed'
                  ? colors.dangerSoft
                  : payment.status === 'refunded'
                    ? colors.infoSoft
                    : colors.warningSoft,
          },
        ]}
      >
        <Ionicons
          name={payment.status === 'paid' ? 'checkmark-circle' : payment.status === 'failed' ? 'close-circle' : payment.status === 'refunded' ? 'arrow-undo-circle' : 'time'}
          size={22}
          color={payment.status === 'paid' ? colors.success : payment.status === 'failed' ? colors.danger : payment.status === 'refunded' ? colors.info : colors.warning}
        />
        <Text
          style={[
            styles.bannerText,
            { color: payment.status === 'paid' ? colors.success : payment.status === 'failed' ? colors.danger : payment.status === 'refunded' ? colors.info : colors.warning },
          ]}
        >
          {payment.status === 'paid' ? 'Paiement effectué' : payment.status === 'failed' ? 'Paiement échoué' : payment.status === 'refunded' ? 'Paiement remboursé' : 'Paiement en attente'}
        </Text>
      </View>

      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <Text style={styles.amount}>{fcfa(payment.amount)}</Text>
        <Text style={styles.label}>{payment.label}</Text>
        <Badge
          label={payment.status === 'paid' ? 'Payé' : payment.status === 'failed' ? 'Échoué' : payment.status === 'refunded' ? 'Remboursé' : 'En attente'}
          variant={payment.status === 'paid' ? 'success' : payment.status === 'failed' ? 'danger' : payment.status === 'refunded' ? 'info' : 'warning'}
          style={{ marginTop: spacing.m }}
        />
      </Card>

      <Card style={{ marginTop: spacing.s }}>
        <View style={styles.row}>
          <Text style={styles.key}>Référence</Text>
          <Text style={styles.value}>{payment.reference}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Type</Text>
          <Text style={styles.value}>{categoryLabels[payment.category]}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Date et heure</Text>
          <Text style={styles.value}>
            {fullDate(payment.date)} à {payment.time}
          </Text>
        </View>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={styles.key}>Moyen de paiement</Text>
          <Text style={styles.value}>{methodLabels[payment.method]}</Text>
        </View>
      </Card>

      {relatedAppointment && (
        <Button
          title="Voir le rendez-vous associé"
          icon="calendar"
          variant="soft"
          onPress={() => router.push(`/appointment/${relatedAppointment.id}`)}
          style={{ marginTop: spacing.s }}
          fullWidth
        />
      )}

      <View style={{ marginTop: spacing.s, gap: spacing.s }}>
        <Button
          title="Télécharger le reçu (PDF)"
          icon="download"
          onPress={() => show('Reçu téléchargé (simulation).')}
          fullWidth
          size="lg"
        />
        <Button title="Partager le reçu" icon="share-social" variant="outline" onPress={() => show('Reçu partagé (simulation).')} fullWidth />
        {payment.status === 'failed' && (
          <Button title="Réessayer le paiement" icon="refresh" variant="danger" onPress={() => show('Relancez le paiement depuis le rendez-vous.', 'info')} fullWidth />
        )}
      </View>

      <Text style={styles.help}>
        Une question sur ce paiement ? Contactez le support AuraHealth depuis « Profil › Aide et assistance ».
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.s,
  },
  bannerText: { fontSize: font.size.base, fontWeight: '800' },
  amount: { fontSize: 36, fontWeight: '800', color: colors.text },
  label: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 6, textAlign: 'center', paddingHorizontal: spacing.l, lineHeight: 19 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  key: { fontSize: font.size.sm, color: colors.textMuted },
  value: { fontSize: font.size.sm, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  help: { fontSize: font.size.xs, color: colors.textFaint, textAlign: 'center', marginTop: spacing.m, lineHeight: 16 },
});
