import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, SearchBar } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { pharmacyCatalogService } from '@/services/pharmacyCatalog';
import { WORKSPACE } from '@/services/orders';
import { PharmacyMedication } from '@/models/types';
import { fcfa } from '@/utils/format';

/** Stock state drives the badge: rupture (0), low (≤ threshold), else OK. */
function stockBadge(med: PharmacyMedication): { label: string; variant: 'success' | 'warning' | 'danger' } {
  if (med.stock === 0) return { label: 'Rupture', variant: 'danger' };
  if (med.lowStock) return { label: `Stock faible · ${med.stock}`, variant: 'warning' };
  return { label: `En stock · ${med.stock}`, variant: 'success' };
}

export default function PharmacyCatalog() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const catalog = useAsync(() => pharmacyCatalogService.list(), []);
  useFocusEffect(useCallback(() => catalog.reload(), []));

  const meds = catalog.data ?? [];
  const outOfStock = meds.filter((m) => m.stock === 0).length;
  const lowStock = meds.filter((m) => m.stock > 0 && m.lowStock).length;
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meds;
    return meds.filter((m) => `${m.name} ${m.category} ${m.dosage} ${m.lab}`.toLowerCase().includes(q));
  }, [meds, search]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={{ paddingTop: insets.top + spacing.s }} />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Médicaments</Text>
          <Text style={styles.greetingSub}>Catalogue et stock • {WORKSPACE.pharmacistName}</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push('/(pharmacy)/catalog/new')} hitSlop={6}>
          <Ionicons name="add" size={24} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{meds.length}</Text>
          <Text style={styles.statLabel}>Références</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{lowStock}</Text>
          <Text style={styles.statLabel}>Stock faible</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.danger }]}>{outOfStock}</Text>
          <Text style={styles.statLabel}>Ruptures</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.m, marginTop: spacing.m }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un médicament…" />
      </View>

      <View style={{ paddingHorizontal: spacing.m, gap: spacing.s, paddingBottom: 40, marginTop: spacing.m }}>
        {catalog.loading ? (
          [0, 1, 2].map((i) => <View key={i} style={[styles.skelRow, { opacity: 1 - i * 0.25 }]} />)
        ) : visible.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="beaker" size={28} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>{search ? 'Aucun résultat' : 'Catalogue vide'}</Text>
            <Text style={styles.emptyText}>
              {search ? 'Essayez un autre mot-clé.' : 'Ajoutez votre première référence avec le bouton +.'}
            </Text>
          </View>
        ) : (
          visible.map((med) => {
            const badge = stockBadge(med);
            return (
              <Pressable
                key={med.id}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                onPress={() => router.push(`/(pharmacy)/catalog/${med.id}`)}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="beaker" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardName} numberOfLines={1}>{med.name}</Text>
                    {med.requiresPrescription && <Badge label="Rx" variant="warning" size="sm" />}
                  </View>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {med.dosage} • {med.form}{med.category ? ` • ${med.category}` : ''}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Badge label={badge.label} variant={badge.variant} size="sm" />
                    <Text style={styles.price}>{fcfa(med.unitPrice)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
            );
          })
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
    gap: spacing.m,
  },
  greeting: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  greetingSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    gap: spacing.m,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.s,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: font.size.base, fontWeight: '700', color: colors.text, flexShrink: 1 },
  cardSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginTop: spacing.s },
  price: { fontSize: font.size.sm, fontWeight: '800', color: colors.primaryDark },
  skelRow: {
    height: 88,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: { alignItems: 'center', paddingVertical: spacing.xl + spacing.l, gap: 6 },
  emptyTitle: { fontSize: font.size.lg, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 19 },
});
