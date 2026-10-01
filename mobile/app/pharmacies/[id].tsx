import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, EmptyState, ErrorState, Screen, SectionHeader } from '@/components/ui';
import { MapPlaceholder, MedicationCard } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { pharmacyService, medicationService } from '@/services';
import { useAsync } from '@/hooks/useAsync';

export default function PharmacyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pharmacy, loading, error, reload } = useAsync(() => pharmacyService.get(id), [id]);
  const meds = useAsync(() => medicationService.list({ pharmacyId: id }), [id]);

  if (loading) {
    return (
      <Screen onBack={() => router.back()}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 120 }} />
      </Screen>
    );
  }
  if (error || !pharmacy) {
    return (
      <Screen onBack={() => router.back()}>
        <ErrorState onRetry={reload} />
      </Screen>
    );
  }

  return (
    <Screen onBack={() => router.back()}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="medkit" size={30} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{pharmacy.name}</Text>
          <Text style={styles.type}>{pharmacy.district}, {pharmacy.city}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Ionicons name="star" size={13} color={colors.accent} />
            <Text style={styles.rating}>{pharmacy.rating.toFixed(1)}</Text>
            {pharmacy.onDuty && <Badge label="De garde" variant="success" size="sm" style={{ marginLeft: 6 }} />}
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtn} onPress={() => Alert.alert('Appeler', `Appeler ${pharmacy.phone} ? (simulation)`)}>
          <Ionicons name="call" size={18} color={colors.primary} />
          <Text style={styles.actionText}>Appeler</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => Alert.alert('Itinéraire', 'Ouverture de l’itinéraire (simulation).')}>
          <Ionicons name="navigate" size={18} color={colors.primary} />
          <Text style={styles.actionText}>Itinéraire</Text>
        </Pressable>
      </View>

      <SectionHeader title="Services" style={{ paddingHorizontal: 0 }} />
      <View style={styles.services}>
        {[
          ...(pharmacy.deliveryAvailable ? [{ icon: 'bicycle' as const, label: 'Livraison à domicile', sub: 'Livraison en ville sous 2 à 4 heures' }] : []),
          ...(pharmacy.pickupAvailable ? [{ icon: 'bag-handle' as const, label: 'Retrait en pharmacie', sub: 'Commande préparée et conservée 48h' }] : []),
          ...pharmacy.services.slice(2).map((s) => ({ icon: 'checkmark-circle' as const, label: s, sub: '' })),
        ].map((s) => (
          <View key={s.label} style={styles.serviceRow}>
            <View style={styles.serviceIcon}>
              <Ionicons name={s.icon} size={17} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceLabel}>{s.label}</Text>
              {s.sub ? <Text style={styles.serviceSub}>{s.sub}</Text> : null}
            </View>
          </View>
        ))}
      </View>

      <SectionHeader title="Horaires & contact" style={{ paddingHorizontal: 0 }} />
      <Card>
        <View style={styles.contactRow}>
          <Ionicons name="time" size={16} color={colors.textMuted} />
          <Text style={[styles.contactText, { flex: 1 }]}>{pharmacy.hours}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="call" size={16} color={colors.textMuted} />
          <Text style={[styles.contactText, { flex: 1 }]}>{pharmacy.phone}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="location" size={16} color={colors.textMuted} />
          <Text style={[styles.contactText, { flex: 1 }]}>{pharmacy.address}</Text>
        </View>
      </Card>

      <SectionHeader title="Localisation" style={{ paddingHorizontal: 0 }} />
      <MapPlaceholder address={pharmacy.address} label={pharmacy.name} />

      <SectionHeader title="Médicaments disponibles" actionLabel="Tout voir" onAction={() => router.push('/medications')} style={{ paddingHorizontal: 0 }} />
      {meds.loading ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.m }} />
      ) : (meds.data ?? []).length === 0 ? (
        <EmptyState compact icon="medkit" title="Aucun médicament référencé" message="Cette pharmacie n’a pas encore de médicaments référencés dans le catalogue." />
      ) : (
        <View style={{ gap: spacing.s }}>
          {(meds.data ?? []).slice(0, 5).map((m) => (
            <MedicationCard
              key={m.id}
              name={m.name}
              dosage={m.dosage}
              form={m.form}
              price={m.unitPrice}
              requiresPrescription={m.requiresPrescription}
              onPress={() => router.push(`/medications/${m.id}`)}
            />
          ))}
        </View>
      )}

      <View style={{ marginTop: spacing.l }}>
        <Button title="Rechercher un médicament dans cette pharmacie" icon="search" onPress={() => router.push({ pathname: '/medications', params: { pharmacyId: id } })} fullWidth size="lg" />
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
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: font.size.xl, fontWeight: '800', color: colors.text, flexShrink: 1 },
  type: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  rating: { fontSize: font.size.sm, fontWeight: '800', color: colors.text },
  actionRow: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.s },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.m,
    paddingVertical: 12,
  },
  actionText: { fontSize: font.size.sm, fontWeight: '700', color: colors.primary },
  services: { backgroundColor: colors.card, borderRadius: radii.l, borderWidth: 1, borderColor: colors.border, padding: spacing.m, gap: spacing.m },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  serviceIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.s,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceLabel: { fontSize: font.size.sm, fontWeight: '700', color: colors.text },
  serviceSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  contactText: { fontSize: font.size.sm, color: colors.text, flexShrink: 1 },
});
