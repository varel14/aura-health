import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radii, shadow, spacing } from '@/constants/theme';
import { fcfa } from '@/utils/format';
import { Medication } from '@/models/types';

const categoryStyles: Record<string, { icon: keyof typeof Ionicons.glyphMap; tint: string; bg: string }> = {
  Antalgique: { icon: 'bandage', tint: colors.primary, bg: colors.primarySoft },
  'Anti-inflammatoire': { icon: 'pulse', tint: '#0F8B8D', bg: '#E0F2F3' },
  Antibiotique: { icon: 'shield-checkmark', tint: colors.info, bg: colors.infoSoft },
  Antipaludique: { icon: 'bug', tint: colors.warning, bg: colors.warningSoft },
  Antihypertenseur: { icon: 'heart', tint: colors.danger, bg: colors.dangerSoft },
  Antitussif: { icon: 'medkit', tint: '#B85C38', bg: '#F7EAE3' },
  Bronchodilatateur: { icon: 'leaf', tint: colors.success, bg: colors.successSoft },
  Réhydratation: { icon: 'water', tint: '#2E9BD6', bg: '#E3F1FB' },
  Vitamine: { icon: 'nutrition', tint: '#5B8C2A', bg: '#EAF3DF' },
  Supplément: { icon: 'nutrition', tint: '#8A4FBF', bg: '#F3EAF9' },
};

export function categoryStyle(category: string) {
  return categoryStyles[category] ?? { icon: 'medkit' as const, tint: colors.primary, bg: colors.primarySoft };
}

/** Pseudo-rating stable par médicament (donnée de démo, comme la dispo des créneaux). */
export function productRating(id: string): { rating: number; reviews: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return { rating: 3.9 + (h % 10) / 10, reviews: 24 + (h % 176) };
}

export function ProductCard({
  medication,
  inCart,
  onPress,
  onAdd,
}: {
  medication: Medication;
  inCart?: boolean;
  onPress?: () => void;
  onAdd?: () => void;
}) {
  const style = categoryStyle(medication.category);
  const { rating, reviews } = productRating(medication.id);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] }]}>
      <View style={[styles.visual, { backgroundColor: style.bg }]}>
        <Ionicons name={style.icon} size={34} color={style.tint} />
        {medication.requiresPrescription && (
          <View style={styles.rxBadge}>
            <Text style={styles.rxBadgeText}>Rx</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>{medication.name}</Text>
      <Text style={styles.sub} numberOfLines={1}>{medication.form} · {medication.dosage}</Text>
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={11} color={colors.accent} />
        <Text style={styles.rating}>{rating.toFixed(1)}</Text>
        <Text style={styles.reviews}>({reviews})</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.price} numberOfLines={1}>{fcfa(medication.unitPrice)}</Text>
        <Pressable onPress={onAdd} hitSlop={6} style={({ pressed }) => [styles.addBtn, inCart && styles.addBtnDone, pressed && { opacity: 0.8 }]}>
          <Ionicons name={inCart ? 'checkmark' : 'add'} size={18} color={colors.white} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={[styles.visual, { backgroundColor: colors.divider }]} />
          <View style={{ height: 13, borderRadius: 7, backgroundColor: colors.divider, marginTop: spacing.s }} />
          <View style={{ height: 11, width: '60%', borderRadius: 6, backgroundColor: colors.divider, marginTop: 6 }} />
          <View style={{ height: 15, width: '45%', borderRadius: 8, backgroundColor: colors.divider, marginTop: spacing.s }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  card: {
    width: '48.2%' as const,
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.s + 2,
    ...shadow.card,
  },
  visual: {
    height: 92,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
  },
  rxBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.white,
    borderRadius: radii.s,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.warningSoft,
  },
  rxBadgeText: { fontSize: 10, fontWeight: '800', color: colors.warning },
  name: { fontSize: font.size.sm, fontWeight: '700', color: colors.text, lineHeight: 17, minHeight: 34 },
  sub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  rating: { fontSize: font.size.xs, fontWeight: '700', color: colors.text },
  reviews: { fontSize: font.size.xs, color: colors.textFaint },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.s,
  },
  price: { fontSize: font.size.base, fontWeight: '800', color: colors.text, flexShrink: 1 },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDone: { backgroundColor: colors.success },
});
