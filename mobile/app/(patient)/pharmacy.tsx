import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, EmptyState, ErrorState, SearchBar, useToast } from '@/components/ui';
import { ProductCard, ProductGridSkeleton } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { Medication } from '@/models/types';
import { useAppData } from '@/context/AppDataContext';
import { useAsync } from '@/hooks/useAsync';
import { medicationService } from '@/services';


export default function PharmacyMarketplace() {
  const insets = useSafeAreaInsets();
  const { cart, addToCart } = useAppData();
  const { show } = useToast();

  const [query, setQuery] = useState('');
  const [otcOnly, setOtcOnly] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsync(
    () => medicationService.list({ query, otcOnly, category: category ?? undefined }),
    [query, otcOnly, category],
  );

  const medications = data ?? [];
  const categories = useMemo(() => Array.from(new Set(medications.map((m) => m.category))), [medications]);

  const cartCount = useMemo(() => cart.reduce((sum, c) => sum + c.quantity, 0), [cart]);
  const inCartIds = useMemo(() => new Set(cart.map((c) => c.medicationId)), [cart]);

  const add = (id: string) => {
    const med = (data ?? []).find((m) => m.id === id);
    if (!med) return;
    addToCart({
      medicationId: med.id,
      name: med.name,
      category: med.category,
      form: med.form,
      dosage: med.dosage,
      unitPrice: med.unitPrice,
      requiresPrescription: med.requiresPrescription,
    });
    show(med.requiresPrescription
      ? `${med.name} ajouté — ordonnance requise à la commande`
      : `${med.name} ajouté au panier`);
  };

  const renderProduct = ({ item }: { item: Medication }) => (
    <ProductCard
      medication={item}
      inCart={inCartIds.has(item.id)}
      onPress={() => router.push(`/medications/${item.id}`)}
      onAdd={() => add(item.id)}
    />
  );

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pharmacie</Text>
          <Text style={styles.subtitle}>Commandez auprès des pharmacies partenaires</Text>
        </View>
        <Pressable style={styles.headerBtn} onPress={() => router.push('/orders')} hitSlop={6}>
          <Ionicons name="receipt-outline" size={21} color={colors.text} />
        </Pressable>
        <Pressable style={styles.headerBtn} onPress={() => router.push('/cart')} hitSlop={6}>
          <Ionicons name="cart-outline" size={21} color={colors.text} />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(m) => m.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        renderItem={renderProduct}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.m, paddingBottom: spacing.xl + spacing.l }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un médicament, une marque…"
              style={{ marginTop: spacing.s }}
            />
            <View style={{ marginTop: spacing.s - 2, marginBottom: spacing.s }}>
              <FlatList
                data={['Tous', 'Sans ordonnance', ...categories]}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: spacing.s, gap: 8 }}
                keyExtractor={(c) => c}
                renderItem={({ item: c }) => (
                  <Chip
                    label={c}
                    selected={c === 'Sans ordonnance' ? otcOnly : category === c}
                    onPress={() => {
                      if (c === 'Tous') { setCategory(null); setOtcOnly(false); }
                      else if (c === 'Sans ordonnance') setOtcOnly((v) => !v);
                      else setCategory(category === c ? null : c);
                    }}
                  />
                )}
              />
            </View>

            <Pressable style={styles.banner} onPress={() => router.push('/cart')}>
              <View style={styles.bannerIcon}>
                <Ionicons name="bicycle" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Livraison en 2 à 4 heures</Text>
                <Text style={styles.bannerSub}>
                  {cartCount > 0
                    ? `${cartCount} article${cartCount > 1 ? 's' : ''} dans votre panier — finalisez votre commande`
                    : 'Livraison à domicile 1 000 FCFA ou retrait gratuit en pharmacie'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{query ? 'Résultats' : category ?? 'Tous les produits'}</Text>
              <Text style={styles.sectionCount}>{data?.length ?? 0} produit{(data?.length ?? 0) > 1 ? 's' : ''}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ProductGridSkeleton />
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : (
            <EmptyState
              icon="medkit"
              title="Aucun médicament trouvé"
              message={`Aucun résultat pour « ${query} ». Vérifiez l’orthographe ou demandez conseil à votre pharmacien.`}
              actionLabel="Effacer la recherche"
              onAction={() => { setQuery(''); setCategory(null); setOtcOnly(false); }}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
  },
  title: { fontSize: font.size.title, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  cartBadgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: '#C6E6DF',
    padding: spacing.m,
  },
  bannerIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.m,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontSize: font.size.sm, fontWeight: '700', color: colors.primaryDark },
  bannerSub: { fontSize: font.size.xs, color: colors.primaryDark, marginTop: 2, opacity: 0.8 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  sectionTitle: { fontSize: font.size.lg, fontWeight: '700', color: colors.text },
  sectionCount: { fontSize: font.size.xs, color: colors.textFaint, fontWeight: '600' },
  column: { gap: spacing.s, marginBottom: spacing.s },
});
