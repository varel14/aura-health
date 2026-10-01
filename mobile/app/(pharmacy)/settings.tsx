import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActionRow, Avatar, Badge, Button, Card, ErrorState, SectionHeader, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth';
import { pharmacyCatalogService } from '@/services/pharmacyCatalog';
import { pharmacyOrderService } from '@/services/orders';
import { CourierWithLoad } from '@/models/types';

export default function PharmacyProfile() {
  const { signOut } = useAuth();
  const { show } = useToast();
  const [busyCourier, setBusyCourier] = useState<string | null>(null);

  // Everything on this screen comes from the signed-in pharmacy's seed data:
  // the pharmacy record (/api/auth/me), its orders, its stocked medications
  // and its courier team.
  const profile = useAsync(() => authService.me(), []);
  const orders = useAsync(() => pharmacyOrderService.list(), []);
  const meds = useAsync(() => pharmacyCatalogService.list(), []);
  const team = useAsync(() => pharmacyOrderService.couriers(), []);

  const loading = profile.loading || orders.loading || meds.loading || team.loading;
  const error = profile.error || orders.error || meds.error || team.error;
  const reloadAll = () => {
    profile.reload();
    orders.reload();
    meds.reload();
    team.reload();
  };

  const pharmacy = profile.data?.pharmacy;
  const orderList = orders.data ?? [];
  const medList = meds.data ?? [];
  const couriers = team.data ?? [];

  const toValidate = orderList.filter((o) => o.status === 'en attente').length;
  const inProgress = orderList.filter((o) => ['confirmée', 'prête', 'en livraison'].includes(o.status)).length;
  const delivered = orderList.filter((o) => o.status === 'livrée').length;
  const outOfStock = medList.filter((m) => m.stock === 0).length;

  const toggleCourier = async (courier: CourierWithLoad) => {
    setBusyCourier(courier.id);
    try {
      await pharmacyOrderService.setCourierActive(courier.id, !courier.active);
      show(`${courier.firstName} ${courier.lastName} ${courier.active ? 'mis en pause' : 'réactivé'}`);
      team.reload();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Mise à jour impossible', 'error');
    } finally {
      setBusyCourier(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error || !pharmacy) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ErrorState onRetry={reloadAll} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.m, paddingBottom: 40 }}>
      <View style={styles.header}>
        <Avatar name={pharmacy.name} size={64} />
        <View style={{ flex: 1, marginLeft: spacing.m }}>
          <Text style={styles.name} numberOfLines={1}>{pharmacy.name}</Text>
          <Text style={styles.sub}>Pharmacie partenaire • {pharmacy.district}, {pharmacy.city}</Text>
          <View style={styles.headerBadges}>
            <Text style={styles.rating}>
              <Ionicons name="star" size={12} color={colors.accent} /> {Number(pharmacy.rating).toFixed(1)}
            </Text>
            {pharmacy.onDuty && <Badge label="De garde" variant="warning" size="sm" />}
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{toValidate}</Text>
          <Text style={styles.statLabel}>À valider</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.info }]}>{inProgress}</Text>
          <Text style={styles.statLabel}>En cours</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{delivered}</Text>
          <Text style={styles.statLabel}>Livrées</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{medList.length}</Text>
          <Text style={styles.statLabel}>Références</Text>
        </View>
      </View>

      {outOfStock > 0 && (
        <Pressable style={styles.stockAlert} onPress={() => router.push('/(pharmacy)/catalog')}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.stockAlertText}>
            {outOfStock} médicament{outOfStock > 1 ? 's' : ''} en rupture — <Text style={{ fontWeight: '700' }}>voir le catalogue</Text>
          </Text>
          <Ionicons name="chevron-forward" size={15} color={colors.danger} />
        </Pressable>
      )}

      <SectionHeader title="Informations" style={{ marginTop: spacing.l, marginBottom: spacing.s }} />
      <Card style={{ gap: spacing.s }}>
        <View style={styles.modeBadges}>
          {pharmacy.deliveryAvailable && <Badge label="Livraison à domicile" variant="info" size="sm" />}
          {pharmacy.pickupAvailable && <Badge label="Retrait sur place" variant="primary" size="sm" />}
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{pharmacy.address} — {pharmacy.district}, {pharmacy.city}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call" size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{pharmacy.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time" size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{pharmacy.hours}</Text>
        </View>
        {pharmacy.services.length > 0 && (
          <View style={styles.services}>
            {pharmacy.services.map((s) => (
              <View key={s} style={styles.serviceChip}>
                <Text style={styles.serviceText}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <SectionHeader title="Équipe de livraison" style={{ marginTop: spacing.l, marginBottom: spacing.s }} />
      <Card padded={false}>
        {couriers.length === 0 ? (
          <Text style={styles.teamEmpty}>Aucun livreur rattaché à la pharmacie.</Text>
        ) : (
          couriers.map((c, i) => (
            <View key={c.id} style={[styles.courierRow, i > 0 && styles.courierSep]}>
              <Avatar name={`${c.firstName} ${c.lastName}`} size={40} />
              <View style={{ flex: 1, marginLeft: spacing.s }}>
                <Text style={styles.courierName}>
                  {c.firstName} {c.lastName}
                  {!c.active && <Text style={styles.courierPaused}>  • en pause</Text>}
                </Text>
                <Text style={styles.courierSub}>
                  {c.vehicle === 'voiture' ? 'Voiture' : 'Moto'} • {c.phone} • {c.activeDeliveries} livraison{c.activeDeliveries > 1 ? 's' : ''} en cours
                </Text>
              </View>
              <Switch
                value={c.active}
                onValueChange={() => toggleCourier(c)}
                disabled={busyCourier === c.id}
                trackColor={{ false: colors.divider, true: colors.primarySoft }}
                thumbColor={c.active ? colors.primary : colors.textFaint}
              />
            </View>
          ))
        )}
      </Card>

      <SectionHeader title="Espace professionnel" style={{ marginTop: spacing.l, marginBottom: spacing.s }} />
      <Card padded={false}>
        <ActionRow
          icon="cube"
          label="File des commandes"
          sublabel={`${toValidate} à valider • ${inProgress} en cours`}
          onPress={() => router.push('/(pharmacy)')}
        />
        <ActionRow
          icon="beaker"
          label="Catalogue & stock"
          sublabel={`${medList.length} références • ${outOfStock} rupture${outOfStock > 1 ? 's' : ''}`}
          onPress={() => router.push('/(pharmacy)/catalog')}
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
  headerBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginTop: spacing.s },
  rating: { fontSize: font.size.sm, fontWeight: '800', color: colors.accent },
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
  stockAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.m,
  },
  stockAlertText: { flex: 1, fontSize: font.size.xs, color: colors.danger, lineHeight: 17 },
  modeBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  infoText: { flex: 1, fontSize: font.size.sm, color: colors.text, lineHeight: 19 },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginTop: spacing.xs },
  serviceChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  serviceText: { fontSize: font.size.xs, fontWeight: '600', color: colors.primaryDark },
  teamEmpty: { fontSize: font.size.sm, color: colors.textMuted, padding: spacing.m },
  courierRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.m },
  courierSep: { borderTopWidth: 1, borderTopColor: colors.divider },
  courierName: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  courierPaused: { fontSize: font.size.xs, fontWeight: '600', color: colors.textFaint },
  courierSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
});
