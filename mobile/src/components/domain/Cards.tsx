import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Card';
import { colors, font, radii, shadow, spacing } from '@/constants/theme';
import { fcfa } from '@/utils/format';
import { Doctor } from '@/models/types';
import { useEffect, useState } from 'react';
import { hospitalService } from '@/services';
import { Hospital } from '@/models/types';

// One shared catalog request for every card needing the hospital name.
let hospitalsPromise: Promise<Hospital[]> | null = null;

function useHospitals(): Hospital[] {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  useEffect(() => {
    hospitalsPromise ??= hospitalService.list();
    hospitalsPromise.then(setHospitals).catch(() => {});
  }, []);
  return hospitals;
}

export function DoctorCard({ doctor, onPress }: { doctor: Doctor; onPress?: () => void }) {
  const hospitals = useHospitals();
  const hospital = hospitals.find((h) => h.id === doctor.hospitalId);
  const statusColor =
    doctor.status === 'disponible' ? colors.success : doctor.status === 'occupé' ? colors.warning : colors.textFaint;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={{ position: 'relative' }}>
        <Avatar name={`Dr ${doctor.firstName} ${doctor.lastName}`} size={56} />
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>Dr {doctor.firstName} {doctor.lastName}</Text>
        <Text style={styles.specialty}>{doctor.specialty}</Text>
        <Text style={styles.hospital} numberOfLines={1}>{hospital?.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={13} color={colors.accent} />
          <Text style={styles.rating}>{doctor.rating.toFixed(1)}</Text>
          <Text style={styles.reviews}>({doctor.reviewsCount})</Text>
          {doctor.videoAvailable && (
            <View style={styles.dotSep} />
          )}
          {doctor.videoAvailable && (
            <Ionicons name="videocam" size={13} color={colors.primary} style={{ marginRight: 3 }} />
          )}
          {doctor.chatAvailable && <Ionicons name="chatbubble-ellipses" size={13} color={colors.info} />}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.fee}>{fcfa(doctor.fee)}</Text>
        <Text style={styles.feeLabel}>/ consultation</Text>
      </View>
    </Pressable>
  );
}

export function DoctorRow({ doctor, onPress }: { doctor: Doctor; onPress?: () => void }) {
  const hospitals = useHospitals();
  const hospital = hospitals.find((h) => h.id === doctor.hospitalId);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <Avatar name={`Dr ${doctor.firstName} ${doctor.lastName}`} size={46} />
      <View style={{ flex: 1, marginLeft: spacing.m }}>
        <Text style={styles.rowName}>Dr {doctor.firstName} {doctor.lastName}</Text>
        <Text style={styles.rowSub}>{doctor.specialty} · {hospital?.name}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="star" size={12} color={colors.accent} />
          <Text style={styles.rowRating}>{doctor.rating.toFixed(1)}</Text>
        </View>
        <Text style={styles.rowFee}>{fcfa(doctor.fee)}</Text>
      </View>
    </Pressable>
  );
}

export function FacilityCard({
  name,
  subtitle,
  badges,
  rating,
  icon = 'business',
  onPress,
}: {
  name: string;
  subtitle: string;
  badges?: { label: string; variant: 'success' | 'warning' | 'info' | 'primary' | 'neutral' | 'danger' }[];
  rating?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.facilityIcon}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{name}</Text>
          {rating !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="star" size={12} color={colors.accent} />
              <Text style={styles.rating}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.hospital} numberOfLines={1}>{subtitle}</Text>
        {badges && badges.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {badges.map((b) => (
              <Badge key={b.label} label={b.label} variant={b.variant} size="sm" />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function MedicationCard({
  name,
  dosage,
  form,
  price,
  requiresPrescription,
  pharmacyCount,
  onPress,
}: {
  name: string;
  dosage: string;
  form: string;
  price: number;
  requiresPrescription: boolean;
  pharmacyCount?: number;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={[styles.medIcon, { backgroundColor: requiresPrescription ? colors.warningSoft : colors.successSoft }]}>
        <Ionicons
          name={requiresPrescription ? 'document-text' : 'medkit'}
          size={20}
          color={requiresPrescription ? colors.warning : colors.success}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.hospital}>{form} · {dosage}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          <Badge
            label={requiresPrescription ? 'Ordonnance obligatoire' : 'Disponible sans ordonnance'}
            variant={requiresPrescription ? 'warning' : 'success'}
            size="sm"
          />
          {pharmacyCount !== undefined && pharmacyCount > 0 && (
            <Badge label={`${pharmacyCount} pharmacies`} variant="neutral" size="sm" />
          )}
        </View>
      </View>
      <Text style={styles.fee}>{fcfa(price)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    ...shadow.card,
  },
  statusDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: colors.card,
  },
  name: {
    fontSize: font.size.md,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  specialty: {
    fontSize: font.size.sm,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  hospital: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  rating: {
    fontSize: font.size.xs,
    fontWeight: '700',
    color: colors.text,
  },
  reviews: {
    fontSize: font.size.xs,
    color: colors.textFaint,
  },
  dotSep: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  right: {
    alignItems: 'flex-end',
  },
  fee: {
    fontSize: font.size.base,
    fontWeight: '700',
    color: colors.text,
  },
  feeLabel: {
    fontSize: font.size.xs,
    color: colors.textFaint,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowName: {
    fontSize: font.size.base,
    fontWeight: '700',
    color: colors.text,
  },
  rowSub: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowRating: {
    fontSize: font.size.xs,
    fontWeight: '700',
    color: colors.text,
  },
  rowFee: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  facilityIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.l,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
