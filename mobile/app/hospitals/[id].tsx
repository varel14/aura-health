import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, ErrorState, Screen, SectionHeader } from '@/components/ui';
import { MapPlaceholder } from '@/components/domain';
import { DoctorRow } from '@/components/domain/Cards';
import { colors, font, radii, spacing } from '@/constants/theme';
import { hospitalService, doctorService } from '@/services';
import { useAsync } from '@/hooks/useAsync';

export default function HospitalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: hospital, loading, error, reload } = useAsync(() => hospitalService.get(id), [id]);
  const hospitalDoctors = useAsync(() => doctorService.list({ hospitalId: id }), [id]);

  if (loading) {
    return (
      <Screen onBack={() => router.back()}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 120 }} />
      </Screen>
    );
  }
  if (error || !hospital) {
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
          <Ionicons name="business" size={30} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{hospital.name}</Text>
          <Text style={styles.type}>{hospital.type} • {hospital.district}, {hospital.city}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Ionicons name="star" size={13} color={colors.accent} />
            <Text style={styles.rating}>{hospital.rating.toFixed(1)}</Text>
            {hospital.emergency && <Badge label="Urgences 24h/24" variant="danger" size="sm" style={{ marginLeft: 6 }} />}
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtn} onPress={() => Alert.alert('Appeler', `Appeler ${hospital.phone} ? (simulation)`)}>
          <Ionicons name="call" size={18} color={colors.primary} />
          <Text style={styles.actionText}>Appeler</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => Alert.alert('Itinéraire', 'Ouverture de l’itinéraire (simulation).')}>
          <Ionicons name="navigate" size={18} color={colors.primary} />
          <Text style={styles.actionText}>Itinéraire</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionPrimary]} onPress={() => router.push('/doctors')}>
          <Ionicons name="calendar" size={18} color={colors.white} />
          <Text style={[styles.actionText, { color: colors.white }]}>Rendez-vous</Text>
        </Pressable>
      </View>

      <SectionHeader title="À propos" style={{ paddingHorizontal: 0 }} />
      <Text style={styles.description}>{hospital.description}</Text>

      <SectionHeader title="Spécialités" style={{ paddingHorizontal: 0 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {hospital.specialties.map((s) => (
          <Badge key={s} label={s} variant="primary" />
        ))}
      </View>

      <SectionHeader title="Services" style={{ paddingHorizontal: 0 }} />
      <View style={styles.services}>
        {hospital.services.map((s) => (
          <View key={s} style={styles.serviceRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.serviceText}>{s}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Médecins" actionLabel="Tout voir" onAction={() => router.push('/doctors')} style={{ paddingHorizontal: 0 }} />
      {hospitalDoctors.loading ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.m }} />
      ) : (
        <View style={styles.doctorsCard}>
          {(hospitalDoctors.data ?? []).map((d) => (
            <DoctorRow key={d.id} doctor={d} onPress={() => router.push(`/doctors/${d.id}`)} />
          ))}
        </View>
      )}

      <SectionHeader title="Horaires & contact" style={{ paddingHorizontal: 0 }} />
      <Card>
        <View style={styles.contactRow}>
          <Ionicons name="time" size={16} color={colors.textMuted} />
          <Text style={[styles.contactText, { flex: 1 }]}>{hospital.hours}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="call" size={16} color={colors.textMuted} />
          <Text style={[styles.contactText, { flex: 1 }]}>{hospital.phone}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="mail" size={16} color={colors.textMuted} />
          <Text style={[styles.contactText, { flex: 1 }]}>{hospital.email}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="location" size={16} color={colors.textMuted} />
          <Text style={[styles.contactText, { flex: 1 }]}>{hospital.address}</Text>
        </View>
      </Card>

      <SectionHeader title="Localisation" style={{ paddingHorizontal: 0 }} />
      <MapPlaceholder address={hospital.address} label={hospital.name} />

      <View style={{ marginTop: spacing.l }}>
        <Button title="Voir les médecins de cet établissement" icon="people" onPress={() => router.push('/doctors')} fullWidth size="lg" />
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
    backgroundColor: colors.primarySoft,
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
  actionPrimary: { backgroundColor: colors.primary },
  actionText: { fontSize: font.size.sm, fontWeight: '700', color: colors.primary },
  description: { fontSize: font.size.sm, color: colors.textMuted, lineHeight: 21 },
  services: { backgroundColor: colors.card, borderRadius: radii.l, borderWidth: 1, borderColor: colors.border, padding: spacing.m, gap: 8 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceText: { fontSize: font.size.sm, color: colors.text, flex: 1 },
  doctorsCard: { backgroundColor: colors.card, borderRadius: radii.l, borderWidth: 1, borderColor: colors.border, paddingVertical: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  contactText: { fontSize: font.size.sm, color: colors.text, flexShrink: 1 },
});
