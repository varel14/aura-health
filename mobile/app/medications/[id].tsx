import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, ErrorState, Screen, SectionHeader, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { medicationService, pharmacyService } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useLocation } from '@/hooks/useLocation';
import { useAppData } from '@/context/AppDataContext';
import { fcfa } from '@/utils/format';
import { formatDistance, haversineKm } from '@/utils/geo';

export default function MedicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart } = useAppData();
  const { show } = useToast();
  const [quantity, setQuantity] = useState(1);
  const { data: med, loading, error, reload } = useAsync(() => medicationService.get(id), [id]);
  const pharmacies = useAsync(() => pharmacyService.list({ medicationId: id }), [id]);
  const { coords, status: locationStatus, retry: retryLocation } = useLocation();

  // Single proposal: the pharmacy stocking the medication closest to the
  // patient (rating-ordered first when the position is unknown).
  const nearest = useMemo(() => {
    const list = pharmacies.data ?? [];
    if (list.length === 0) return null;
    if (!coords) return list[0];
    return [...list].sort((a, b) => haversineKm(coords, a) - haversineKm(coords, b))[0];
  }, [pharmacies.data, coords]);
  const nearestDistanceKm = nearest && coords ? haversineKm(coords, nearest) : null;

  if (loading) {
    return (
      <Screen onBack={() => router.back()}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 120 }} />
      </Screen>
    );
  }
  if (error || !med) {
    return (
      <Screen onBack={() => router.back()}>
        <ErrorState onRetry={reload} />
      </Screen>
    );
  }

  const pushToCart = (checkout: boolean) => {
    addToCart(
      {
        medicationId: med.id,
        name: med.name,
        category: med.category,
        form: med.form,
        dosage: med.dosage,
        unitPrice: med.unitPrice,
        requiresPrescription: med.requiresPrescription,
      },
      quantity,
    );
    if (checkout) {
      router.push('/checkout');
    } else {
      show(`${med.name} × ${quantity} ajouté au panier`);
    }
  };

  return (
    <Screen onBack={() => router.back()}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: med.requiresPrescription ? colors.warningSoft : colors.successSoft }]}>
          <Ionicons name="medkit" size={28} color={med.requiresPrescription ? colors.warning : colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{med.name}</Text>
          <Text style={styles.sub}>{med.form} • {med.dosage}</Text>
          <Text style={styles.lab}>{med.lab} • {med.category}</Text>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <Badge
          label={med.requiresPrescription ? 'Ordonnance obligatoire' : 'Disponible sans ordonnance'}
          variant={med.requiresPrescription ? 'warning' : 'success'}
        />
        <Text style={styles.price}>{fcfa(med.unitPrice)}</Text>
      </View>

      <SectionHeader title="Description" style={{ paddingHorizontal: 0 }} />
      <Text style={styles.description}>{med.description}</Text>

      {med.requiresPrescription && (
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={18} color={colors.info} />
          <Text style={styles.noticeText}>
            Ce médicament nécessite une ordonnance médicale valide. Vous devrez sélectionner une ordonnance de votre
            dossier ou en importer une au moment de la commande.
          </Text>
        </View>
      )}

      <SectionHeader title="Pharmacie la plus proche" style={{ paddingHorizontal: 0 }} />
      {pharmacies.loading ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.m }} />
      ) : nearest ? (
        <>
          <Pressable onPress={() => router.push(`/pharmacies/${nearest.id}`)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
              <View style={styles.phIcon}>
                <Ionicons name="medkit" size={18} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.phName}>{nearest.name}</Text>
                <Text style={styles.phSub}>
                  {nearest.district}, {nearest.city}
                  {nearestDistanceKm !== null ? ` — à ${formatDistance(nearestDistanceKm)}` : ''}
                </Text>
              </View>
              {nearest.onDuty && <Badge label="De garde" variant="success" size="sm" />}
              <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
            </Card>
          </Pressable>
          {locationStatus === 'denied' || locationStatus === 'unavailable' ? (
            <Pressable onPress={retryLocation} style={styles.locHint}>
              <Ionicons name="location-outline" size={13} color={colors.textFaint} />
              <Text style={styles.locHintText}>Activer la localisation pour afficher la distance.</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Text style={styles.noPharmacy}>Aucune pharmacie ne propose ce médicament pour le moment.</Text>
      )}

      <View style={{ marginTop: spacing.l }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.qtyLabel}>Quantité</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
            <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={styles.qtyBtn}>
              <Ionicons name="remove" size={18} color={colors.primary} />
            </Pressable>
            <Text style={styles.qty}>{quantity}</Text>
            <Pressable onPress={() => setQuantity((q) => Math.min(10, q + 1))} style={styles.qtyBtn}>
              <Ionicons name="add" size={18} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.qtyTotal}>{fcfa(med.unitPrice * quantity)}</Text>
        </Card>
        <Button
          title="Acheter maintenant"
          icon="flash"
          size="lg"
          fullWidth
          style={{ marginTop: spacing.s }}
          onPress={() => pushToCart(true)}
        />
        <Button
          title="Ajouter au panier"
          icon="cart"
          variant="soft"
          size="lg"
          fullWidth
          style={{ marginTop: spacing.s }}
          onPress={() => pushToCart(false)}
        />
        <Text style={styles.disclaimer}>
          AuraHealth ne fournit pas de recommandation de traitement. Consultez votre médecin ou votre pharmacien.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    marginTop: spacing.s,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  sub: { fontSize: font.size.base, color: colors.textMuted, marginTop: 2 },
  lab: { fontSize: font.size.sm, color: colors.textFaint, marginTop: 3 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.s,
  },
  price: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  description: { fontSize: font.size.sm, color: colors.textMuted, lineHeight: 21 },
  notice: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.infoSoft,
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.m,
  },
  noticeText: { flex: 1, fontSize: font.size.xs, color: colors.info, lineHeight: 17 },
  phIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.s,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phName: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  phSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  locHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.s },
  locHintText: { fontSize: font.size.xs, color: colors.textFaint },
  noPharmacy: { fontSize: font.size.sm, color: colors.textMuted },
  qtyLabel: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { fontSize: font.size.lg, fontWeight: '800', color: colors.text, minWidth: 28, textAlign: 'center' },
  qtyTotal: { fontSize: font.size.base, fontWeight: '800', color: colors.primaryDark },
  disclaimer: {
    fontSize: font.size.xs,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.m,
    lineHeight: 16,
  },
});
