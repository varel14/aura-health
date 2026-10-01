import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Badge, StatusBadge } from '../ui/Card';
import { colors, font, radii, shadow, spacing } from '@/constants/theme';
import { fcfa, dayLabel } from '@/utils/format';
import { Appointment, ConsultationType } from '@/models/types';

export const consultationTypeInfo: Record<
  ConsultationType,
  { label: string; icon: keyof typeof Ionicons.glyphMap; tint: string; soft: string }
> = {
  video: { label: 'Consultation vidéo', icon: 'videocam', tint: colors.primary, soft: colors.primarySoft },
  chat: { label: 'Consultation par chat', icon: 'chatbubble-ellipses', tint: colors.info, soft: colors.infoSoft },
  'in-person': { label: 'Consultation en présentiel', icon: 'people', tint: colors.warning, soft: colors.warningSoft },
};

export function AppointmentCard({
  appointment,
  doctorName,
  specialty,
  establishment,
  onPress,
}: {
  appointment: Appointment;
  doctorName: string;
  specialty: string;
  establishment?: string;
  onPress?: () => void;
}) {
  const t = consultationTypeInfo[appointment.type];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={[styles.typeIcon, { backgroundColor: t.soft }]}>
        <Ionicons name={t.icon} size={20} color={t.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.doctor, { flex: 1 }]} numberOfLines={1}>{doctorName}</Text>
          <StatusBadge status={appointment.status} size="sm" />
        </View>
        <Text style={styles.specialty}>{specialty}</Text>
        <Text style={styles.meta}>
          {dayLabel(appointment.date)} • {appointment.time} • {t.label}
        </Text>
        {!appointment.paid && appointment.status !== 'cancelled' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
            <Ionicons name="alert-circle" size={13} color={colors.warning} />
            <Text style={{ fontSize: font.size.xs, color: colors.warning, fontWeight: '600' }}>
              Paiement en attente — {fcfa(appointment.fee)}
            </Text>
          </View>
        )}
        {establishment && appointment.type === 'in-person' && (
          <Text style={styles.establishment} numberOfLines={1}>
            <Ionicons name="location" size={11} color={colors.textFaint} /> {establishment}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function PatientAppointmentRow({
  appointment,
  onPress,
}: {
  appointment: Pick<Appointment, 'id' | 'time' | 'type' | 'motif' | 'status' | 'patientName'>;
  onPress?: () => void;
}) {
  const t = consultationTypeInfo[appointment.type];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.timeBox}>
        <Text style={styles.time}>{appointment.time}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.doctor, { flex: 1 }]} numberOfLines={1}>{appointment.patientName}</Text>
          <StatusBadge status={appointment.status} size="sm" />
        </View>
        <Text style={styles.specialty} numberOfLines={1}>{appointment.motif}</Text>
        <View style={styles.metaRow}>
          <Ionicons name={t.icon} size={12} color={t.tint} />
          <Text style={[styles.meta, { marginTop: 0 }]}>{t.label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function CompactAppointmentBanner({
  doctorName,
  specialty,
  date,
  time,
  type,
  onPress,
  actionLabel,
}: {
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  type: ConsultationType;
  onPress?: () => void;
  actionLabel?: string;
}) {
  const t = consultationTypeInfo[type];
  return (
    <Pressable onPress={onPress} style={styles.banner}>
      <View style={styles.bannerLeft}>
        <Text style={styles.bannerLabel}>Prochain rendez-vous</Text>
        <Text style={styles.bannerDoctor}>{doctorName}</Text>
        <Text style={styles.bannerSpec}>{specialty}</Text>
        <View style={styles.bannerMeta}>
          <Ionicons name="calendar" size={13} color={colors.white} />
          <Text style={styles.bannerMetaText}>{date} • {time}</Text>
        </View>
        <View style={styles.bannerMeta}>
          <Ionicons name={t.icon} size={13} color={colors.white} />
          <Text style={styles.bannerMetaText}>{t.label}</Text>
        </View>
      </View>
      <View style={styles.bannerCta}>
        <Text style={styles.bannerCtaText}>{actionLabel ?? 'Détails'}</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primaryDark} />
      </View>
    </Pressable>
  );
}

export function PrescriptionCard({
  doctorName,
  date,
  establishment,
  medicationCount,
  expiryLabel,
  status,
  source,
  onPress,
}: {
  doctorName: string;
  date: string;
  establishment: string;
  medicationCount: number;
  expiryLabel?: string;
  status: string;
  source: 'aura' | 'imported';
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={[styles.typeIcon, { backgroundColor: source === 'imported' ? colors.warningSoft : colors.primarySoft }]}>
        <Ionicons
          name={source === 'imported' ? 'cloud-download' : 'document-text'}
          size={20}
          color={source === 'imported' ? colors.warning : colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.doctor, { flex: 1 }]} numberOfLines={1}>{doctorName}</Text>
          <StatusBadge status={status} size="sm" />
        </View>
        <Text style={styles.specialty}>{establishment}</Text>
        <Text style={styles.meta}>
          {date} • {medicationCount} médicament{medicationCount > 1 ? 's' : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Badge
            label={source === 'imported' ? 'Ordonnance importée' : 'Délivrée sur AuraHealth'}
            variant={source === 'imported' ? 'warning' : 'primary'}
            size="sm"
          />
          {expiryLabel && <Text style={styles.establishment}>{expiryLabel}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

export function TransactionCard({
  label,
  amount,
  status,
  method,
  date,
  reference,
  onPress,
}: {
  label: string;
  amount: number;
  status: string;
  method: 'mtn_momo' | 'orange_money' | 'card';
  date: string;
  reference: string;
  onPress?: () => void;
}) {
  const methodIcon = method === 'card' ? 'card' : 'phone-portrait';
  const methodLabel = method === 'mtn_momo' ? 'MTN MoMo' : method === 'orange_money' ? 'Orange Money' : 'Carte bancaire';
  const negative = status === 'failed';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={[styles.typeIcon, { backgroundColor: colors.divider }]}>
        <Ionicons name={methodIcon} size={20} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.doctor, { flex: 1 }]} numberOfLines={1}>{label}</Text>
        </View>
        <Text style={styles.specialty}>{date} • {methodLabel}</Text>
        <Text style={styles.establishment}>Réf. {reference}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <StatusBadge status={status} size="sm" />
        <Text style={[styles.fee, negative && { color: colors.danger }]}>{fcfa(amount)}</Text>
      </View>
    </Pressable>
  );
}

export function PersonRow({
  name,
  subtitle,
  badge,
  avatarSize = 46,
  onPress,
  right,
}: {
  name: string;
  subtitle: string;
  badge?: { label: string; variant: 'success' | 'warning' | 'info' | 'primary' | 'neutral' | 'danger' | 'purple' };
  avatarSize?: number;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <Avatar name={name} size={avatarSize} />
      <View style={{ flex: 1, marginLeft: spacing.m }}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text>
      </View>
      {badge && <StatusBadge status={badge.label} size="sm" />}
      {right}
      {onPress && !right && !badge && <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
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
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBox: {
    width: 56,
    height: 56,
    borderRadius: radii.m,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontSize: font.size.base,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  doctor: {
    fontSize: font.size.md,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  specialty: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  meta: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  establishment: {
    fontSize: font.size.xs,
    color: colors.textFaint,
    marginTop: 3,
  },
  fee: {
    fontSize: font.size.sm,
    fontWeight: '700',
    color: colors.text,
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
  banner: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.l,
    ...shadow.float,
  },
  bannerLeft: { flex: 1 },
  bannerLabel: {
    fontSize: font.size.xs,
    fontWeight: '700',
    color: colors.primarySoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerDoctor: {
    fontSize: font.size.xl,
    fontWeight: '800',
    color: colors.white,
    marginTop: 6,
  },
  bannerSpec: {
    fontSize: font.size.sm,
    color: colors.primarySoft,
    marginTop: 2,
  },
  bannerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
  },
  bannerMetaText: {
    fontSize: font.size.sm,
    color: colors.white,
    fontWeight: '500',
  },
  bannerCta: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerCtaText: {
    fontSize: font.size.sm,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
