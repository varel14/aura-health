import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Badge } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { ActivationStatus, AdminDoctor } from '@/models/types';
import { Avatar } from '@/components/ui';

export const activationBadge: Record<ActivationStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  pending: { label: 'À valider', variant: 'warning' },
  active: { label: 'Actif', variant: 'success' },
  rejected: { label: 'Rejeté', variant: 'danger' },
};

/** Doctor profile card for the admin queue; taps through to the admin detail. */
export function AdminDoctorCard({ doctor }: { doctor: AdminDoctor }) {
  const badge = activationBadge[doctor.activationStatus];
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => router.push(`/(admin)/doctors/${doctor.id}`)}
    >
      <View style={styles.cardTop}>
        <Avatar name={`Dr ${doctor.firstName} ${doctor.lastName}`} size={44} />
        <View style={{ flex: 1, marginLeft: spacing.s }}>
          <Text style={styles.cardName} numberOfLines={1}>Dr {doctor.firstName} {doctor.lastName}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {doctor.specialty}{doctor.hospitalName ? ` • ${doctor.hospitalName}` : ''}
          </Text>
        </View>
        <Badge label={badge.label} variant={badge.variant} size="sm" />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardContact} numberOfLines={1}>
          {doctor.account.phone ?? '—'}{doctor.account.email ? ` • ${doctor.account.email}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {doctor.fee > 0 && <Text style={styles.cardFee}>{doctor.fee.toLocaleString('fr-FR')} F</Text>}
          <Text style={styles.cardMore}>{doctor.activationStatus === 'pending' ? 'Examiner' : 'Détails'}</Text>
        </View>
      </View>
      {doctor.activationStatus === 'pending' && <View style={styles.pendingStripe} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    gap: spacing.s,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
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
  cardContact: { flex: 1, fontSize: font.size.xs, color: colors.textMuted, marginRight: spacing.s },
  cardFee: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: '600' },
  cardMore: { fontSize: font.size.sm, color: colors.primary, fontWeight: '700' },
  pendingStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.warning,
  },
});
