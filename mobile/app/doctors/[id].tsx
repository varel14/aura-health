import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Screen, SectionHeader } from '@/components/ui';
import { MapPlaceholder } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { doctorService } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { fcfa, shortDay, todayISO } from '@/utils/format';
import { consultationTypeInfo } from '@/components/domain/AppointmentCards';

export default function DoctorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: doctor, loading, error, reload } = useAsync(() => doctorService.get(id), [id]);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const dates = useMemo(() => Array.from({ length: 10 }, (_, i) => todayISO(i)), []);
  const slots = useAsync(() => (doctor ? doctorService.slots(doctor, selectedDate) : Promise.resolve([])), [doctor?.id, selectedDate]);

  if (loading) {
    return (
      <Screen onBack={() => router.back()}>
        <View style={{ alignItems: 'center', paddingTop: 120 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: spacing.m, color: colors.textMuted }}>Chargement du profil…</Text>
        </View>
      </Screen>
    );
  }
  if (error || !doctor) {
    return (
      <Screen onBack={() => router.back()}>
        <ErrorState onRetry={reload} />
      </Screen>
    );
  }

  // The detail endpoint embeds the doctor's hospital.
  const hospital = doctor.hospital ?? null;
  const consultTypes = [
    doctor.videoAvailable && { type: 'video' as const, fee: doctor.videoFee ?? doctor.fee },
    doctor.chatAvailable && { type: 'chat' as const, fee: doctor.chatFee ?? Math.round(doctor.fee * 0.7) },
    doctor.inPersonAvailable && { type: 'in-person' as const, fee: doctor.fee },
  ].filter(Boolean) as { type: 'video' | 'chat' | 'in-person'; fee: number }[];

  const availableSlots = (slots.data ?? []).filter((s) => s.available);

  return (
    <Screen onBack={() => router.back()}>
      <View style={styles.hero}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={`Dr ${doctor.firstName} ${doctor.lastName}`} size={72} />
          <View style={{ flex: 1, marginLeft: spacing.m }}>
            <Text style={styles.name}>Dr {doctor.firstName} {doctor.lastName}</Text>
            <Text style={styles.specialty}>{doctor.specialty}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="star" size={14} color={colors.accent} />
              <Text style={styles.ratingText}>{doctor.rating.toFixed(1)}</Text>
              <Text style={styles.reviewsText}>({doctor.reviewsCount} avis)</Text>
              <Badge
                label={doctor.status}
                variant={doctor.status === 'disponible' ? 'success' : doctor.status === 'occupé' ? 'warning' : 'neutral'}
                size="sm"
                style={{ marginLeft: 6 }}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{doctor.experienceYears} ans</Text>
          <Text style={styles.statLabel}>Expérience</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={styles.statValue}>{doctor.languages.length}</Text>
          <Text style={styles.statLabel}>Langues</Text>
        </View>
        <View style={[styles.stat, styles.statBorder]}>
          <Text style={styles.statValue}>{fcfa(doctor.fee)}</Text>
          <Text style={styles.statLabel}>Tarif cabinet</Text>
        </View>
      </View>

      <Card style={{ marginTop: spacing.m }}>
        <View style={styles.infoRow}>
          <Ionicons name="business" size={17} color={colors.primary} />
          <Text style={[styles.infoText, { flex: 1 }]}>
            {hospital?.name} — {hospital?.district}, {hospital?.city}
          </Text>
          <Pressable onPress={() => router.push(`/hospitals/${hospital?.id}`)}>
            <Text style={styles.link}>Voir</Text>
          </Pressable>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="language" size={17} color={colors.primary} />
          <Text style={[styles.infoText, { flex: 1 }]}>{doctor.languages.join(', ')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={17} color={colors.primary} />
          <Text style={[styles.infoText, { flex: 1 }]}>
            Consulte le {doctor.workingDays.map((d) => ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][d]).join(', ')}
          </Text>
        </View>
      </Card>

      <SectionHeader title="Présentation" style={{ paddingHorizontal: 0 }} />
      <Text style={styles.bio}>{doctor.bio}</Text>

      <SectionHeader title="Types de consultation" style={{ paddingHorizontal: 0 }} />
      <View style={{ gap: spacing.s }}>
        {consultTypes.map((t) => {
          const info = consultationTypeInfo[t.type];
          return (
            <View key={t.type} style={styles.typeRow}>
              <View style={[styles.typeIcon, { backgroundColor: info.soft }]}>
                <Ionicons name={info.icon} size={18} color={info.tint} />
              </View>
              <Text style={[styles.typeLabel, { flex: 1 }]}>{info.label}</Text>
              <Text style={styles.typeFee}>{fcfa(t.fee)}</Text>
            </View>
          );
        })}
      </View>

      <SectionHeader title="Créneaux disponibles" style={{ paddingHorizontal: 0 }} />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: spacing.m }}>
          <View style={{ flexDirection: 'row', gap: spacing.s }}>
            {dates.map((d) => {
              const s = shortDay(d);
              const active = d === selectedDate;
              return (
                <Pressable key={d} onPress={() => setSelectedDate(d)} style={[styles.dateChip, active && styles.dateChipActive]}>
                  <Text style={[styles.dateWeekday, active && { color: colors.white }]}>{s.weekday}</Text>
                  <Text style={[styles.dateDay, active && { color: colors.white }]}>{s.day}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        {slots.loading ? (
          <View style={styles.slotsLoading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : availableSlots.length === 0 ? (
          <EmptyState
            compact
            icon="calendar-outline"
            title="Aucun créneau ce jour"
            message="Le médecin ne consulte pas ce jour-là ou tous les créneaux sont réservés. Choisissez une autre date."
          />
        ) : (
          <View style={styles.slotGrid}>
            {availableSlots.map((s) => (
              <Pressable
                key={s.time}
                style={({ pressed }) => [styles.slot, pressed && { opacity: 0.7 }]}
                onPress={() =>
                  router.push({
                    pathname: '/appointment/book',
                    params: { doctorId: doctor.id, date: selectedDate, time: s.time },
                  })
                }
              >
                <Text style={styles.slotText}>{s.time}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {hospital && (
        <>
          <SectionHeader title="Établissement" style={{ paddingHorizontal: 0 }} />
          <MapPlaceholder address={hospital.address} label={hospital.name} height={130} />
        </>
      )}

      <View style={{ marginTop: spacing.l }}>
        <Button
          title="Prendre rendez-vous"
          icon="calendar"
          size="lg"
          fullWidth
          onPress={() => router.push({ pathname: '/appointment/book', params: { doctorId: doctor.id } })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    marginTop: spacing.s,
  },
  name: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  specialty: { fontSize: font.size.base, color: colors.primary, fontWeight: '700', marginTop: 2 },
  ratingText: { fontSize: font.size.sm, fontWeight: '800', color: colors.text },
  reviewsText: { fontSize: font.size.xs, color: colors.textFaint },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.s,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.m },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.divider },
  statValue: { fontSize: font.size.md, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  infoText: { fontSize: font.size.sm, color: colors.text, flexShrink: 1 },
  link: { fontSize: font.size.sm, color: colors.primary, fontWeight: '700' },
  bio: { fontSize: font.size.sm, color: colors.textMuted, lineHeight: 21 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.m,
  },
  typeIcon: { width: 38, height: 38, borderRadius: radii.s, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: font.size.sm, fontWeight: '600', color: colors.text },
  typeFee: { fontSize: font.size.sm, fontWeight: '800', color: colors.text },
  dateChip: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.m,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 56,
  },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateWeekday: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: '600' },
  dateDay: { fontSize: font.size.md, fontWeight: '800', color: colors.text, marginTop: 2 },
  slotsLoading: { paddingVertical: spacing.l, alignItems: 'center' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  slot: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.s,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  slotText: { color: colors.primaryDark, fontWeight: '700', fontSize: font.size.sm },
});
