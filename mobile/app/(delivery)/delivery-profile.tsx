import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActionRow, Avatar, Badge, Button, Card, ErrorState, SectionHeader } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth';
import { deliveryService } from '@/services/orders';
import { pharmacyService } from '@/services';

export default function DeliveryProfile() {
  const { signOut } = useAuth();

  const me = useAsync(() => authService.me(), []);
  const runs = useAsync(() => deliveryService.list(), []);
  const courier = me.data?.courier;
  const pharmacy = useAsync(
    () => (courier ? pharmacyService.get(courier.pharmacyId) : Promise.resolve(undefined)),
    [courier?.id],
  );

  const loading = me.loading || runs.loading;
  const error = me.error || runs.error;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error || !courier) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ErrorState onRetry={() => { me.reload(); runs.reload(); }} />
      </View>
    );
  }

  const runList = runs.data ?? [];
  const toPickup = runList.filter((o) => o.status === 'prête').length;
  const inTransit = runList.filter((o) => o.status === 'en livraison').length;
  const delivered = runList.filter((o) => o.status === 'livrée').length;
  const vehicleLabel = courier.vehicle === 'voiture' ? 'Voiture' : 'Moto';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.m, paddingBottom: 40 }}>
      <View style={styles.header}>
        <Avatar name={`${courier.firstName} ${courier.lastName}`} size={64} />
        <View style={{ flex: 1, marginLeft: spacing.m }}>
          <Text style={styles.name}>{courier.firstName} {courier.lastName}</Text>
          <Text style={styles.sub}>Livreur • {vehicleLabel} • {courier.city}</Text>
          <View style={{ flexDirection: 'row', marginTop: spacing.s }}>
            {courier.active ? <Badge label="Actif" variant="success" size="sm" /> : <Badge label="En pause" variant="neutral" size="sm" />}
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{toPickup}</Text>
          <Text style={styles.statLabel}>À récupérer</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.info }]}>{inTransit}</Text>
          <Text style={styles.statLabel}>En livraison</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{delivered}</Text>
          <Text style={styles.statLabel}>Livrées</Text>
        </View>
      </View>

      <SectionHeader title="Coordonnées" style={{ marginTop: spacing.l, marginBottom: spacing.s }} />
      <Card style={{ gap: spacing.s }}>
        <View style={styles.infoRow}>
          <Ionicons name="call" size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{courier.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{courier.city}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name={courier.vehicle === 'voiture' ? 'car' : 'bicycle'} size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>Véhicule : {vehicleLabel}</Text>
        </View>
      </Card>

      {pharmacy.data && (
        <>
          <SectionHeader title="Pharmacie de rattachement" style={{ marginTop: spacing.l, marginBottom: spacing.s }} />
          <Card style={{ gap: spacing.s }}>
            <Pressable style={styles.phRow} onPress={() => router.push(`/pharmacies/${pharmacy.data!.id}`)}>
              <View style={styles.phIcon}>
                <Ionicons name="medkit" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.phName}>{pharmacy.data.name}</Text>
                <Text style={styles.phSub}>{pharmacy.data.address} — {pharmacy.data.district}, {pharmacy.data.city}</Text>
                <Text style={styles.phSub}>{pharmacy.data.phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          </Card>
        </>
      )}

      <SectionHeader title="Mon activité" style={{ marginTop: spacing.l, marginBottom: spacing.s }} />
      <Card padded={false}>
        <ActionRow
          icon="bicycle"
          label="Mes livraisons"
          sublabel={`${toPickup} à récupérer • ${inTransit} en cours • ${delivered} livrée${delivered > 1 ? 's' : ''}`}
          onPress={() => router.push('/(delivery)')}
        />
      </Card>

      <Button title="Se déconnecter" variant="outline" icon="log-out" onPress={() => { signOut(); router.replace('/(auth)/login'); }} fullWidth style={{ marginTop: spacing.l }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.l },
  name: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.m },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.divider },
  statValue: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  infoText: { flex: 1, fontSize: font.size.sm, color: colors.text },
  phRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  phIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.s,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phName: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  phSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
});
