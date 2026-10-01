import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Badge, Button, Card, ConfirmSheet, ErrorState, InfoRow, Input, Screen, SectionHeader, BottomSheet, useToast } from '@/components/ui';
import { activationBadge } from '@/components/domain';
import { colors, font, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { adminService } from '@/services/admin';
import { fullDate } from '@/utils/format';
import { ApiError } from '@/services/api';

export default function AdminDoctorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useToast();
  const detail = useAsync(() => adminService.doctor(String(id)), [id]);

  const [confirmActivate, setConfirmActivate] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const doctor = detail.data;

  const activate = async () => {
    if (!doctor) return;
    setBusy(true);
    try {
      await adminService.activate(doctor.id);
      show(`Dr ${doctor.lastName} est maintenant actif — visible par les patients.`, 'success');
      setConfirmActivate(false);
      detail.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Activation impossible.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!doctor) return;
    if (reason.trim().length < 3) {
      setReasonError('Indiquez un motif d’au moins 3 caractères.');
      return;
    }
    setBusy(true);
    try {
      await adminService.reject(doctor.id, reason.trim());
      show(`Dr ${doctor.lastName} a été rejeté — son accès est révoqué.`, 'success');
      setRejectOpen(false);
      setReason('');
      setReasonError(undefined);
      detail.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Rejet impossible.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (detail.loading && !doctor) {
    return (
      <Screen onBack={() => router.back()} scroll={false}>
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (detail.error || !doctor) {
    return (
      <Screen onBack={() => router.back()} scroll={false}>
        <ErrorState message={detail.error ?? 'Médecin introuvable.'} onRetry={detail.reload} />
      </Screen>
    );
  }

  const badge = activationBadge[doctor.activationStatus];

  return (
    <Screen onBack={() => router.back()} title="Dossier médecin" scroll={false}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Avatar name={`Dr ${doctor.firstName} ${doctor.lastName}`} size={64} />
          <View style={{ flex: 1, marginLeft: spacing.m }}>
            <Text style={styles.name}>Dr {doctor.firstName} {doctor.lastName}</Text>
            <Text style={styles.sub}>{doctor.specialty}{doctor.hospitalName ? ` • ${doctor.hospitalName}` : ''}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <Badge label={badge.label} variant={badge.variant} size="sm" />
              {doctor.rating > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="star" size={13} color={colors.accent} />
                  <Text style={styles.rating}>{doctor.rating.toFixed(1)} ({doctor.reviewsCount})</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.m }}>
          {doctor.activationStatus === 'rejected' && doctor.rejectionReason && (
            <Card style={[{ marginTop: spacing.m }, { borderLeftWidth: 4, borderLeftColor: colors.danger }]}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Ionicons name="warning" size={18} color={colors.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectTitle}>Profil rejeté</Text>
                  <Text style={styles.rejectText}>{doctor.rejectionReason}</Text>
                </View>
              </View>
            </Card>
          )}

          <SectionHeader title="Compte" style={{ marginBottom: spacing.s, marginTop: spacing.l }} />
          <Card>
            <InfoRow label="Téléphone" value={doctor.account.phone ?? '—'} />
            <InfoRow label="E-mail" value={doctor.account.email ?? '—'} />
            <InfoRow
              label="Inscrit le"
              value={doctor.account.createdAt ? fullDate(String(doctor.account.createdAt).slice(0, 10)) : '—'}
            />
            {doctor.activatedAt && (
              <InfoRow label="Activé le" value={fullDate(String(doctor.activatedAt).slice(0, 10))} />
            )}
          </Card>

          <SectionHeader title="Profil professionnel" style={{ marginBottom: spacing.s, marginTop: spacing.l }} />
          <Card>
            <InfoRow label="Spécialité" value={doctor.specialty} />
            <InfoRow label="Établissement" value={doctor.hospitalName ?? 'Cabinet personnel'} />
            <InfoRow label="Expérience" value={`${doctor.experienceYears} an${doctor.experienceYears > 1 ? 's' : ''}`} />
            <InfoRow label="Tarif consultation" value={doctor.fee > 0 ? `${doctor.fee.toLocaleString('fr-FR')} FCFA` : 'À définir'} />
          </Card>

          {doctor.bio ? (
            <>
              <SectionHeader title="Présentation" style={{ marginBottom: spacing.s, marginTop: spacing.l }} />
              <Card>
                <Text style={styles.bio}>{doctor.bio}</Text>
              </Card>
            </>
          ) : null}

          <Text style={styles.gatingHint}>
            {doctor.activationStatus === 'active'
              ? 'Ce profil est visible dans le catalogue et peut recevoir des rendez-vous.'
              : 'Ce profil est invisible pour les patients : hors catalogue, réservations et espace médecin verrouillés.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        {doctor.activationStatus !== 'active' && (
          <Button
            title={doctor.activationStatus === 'pending' ? 'Activer le profil' : 'Réactiver le profil'}
            icon="checkmark-circle"
            onPress={() => setConfirmActivate(true)}
            loading={busy}
            fullWidth
            size="lg"
          />
        )}
        {doctor.activationStatus !== 'rejected' && (
          <Button
            title={doctor.activationStatus === 'pending' ? 'Rejeter la demande' : 'Révoquer l’accès'}
            icon="close-circle"
            variant={doctor.activationStatus === 'pending' ? 'outline' : 'danger'}
            onPress={() => setRejectOpen(true)}
            disabled={busy}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.s }}
          />
        )}
      </View>

      <ConfirmSheet
        visible={confirmActivate}
        onClose={() => setConfirmActivate(false)}
        onConfirm={activate}
        title={`Activer Dr ${doctor.lastName} ?`}
        message="Le profil sera visible dans le catalogue et l’espace médecin sera débloqué."
        confirmLabel="Activer"
        confirmVariant="primary"
      />

      <BottomSheet visible={rejectOpen} onClose={() => setRejectOpen(false)} title="Motif du rejet">
        <Text style={styles.sheetText}>
          Le médecin perdra l’accès à son compte immédiatement. Expliquez la décision — le motif est conservé dans le dossier.
        </Text>
        <View style={{ marginTop: spacing.m }}>
          <Input
            label="Motif"
            placeholder="ex. Documents justificatifs non conformes"
            value={reason}
            onChangeText={(t) => { setReason(t); setReasonError(undefined); }}
            error={reasonError}
            multiline
            numberOfLines={3}
          />
        </View>
        <Button title="Confirmer le rejet" variant="danger" icon="close-circle" onPress={reject} loading={busy} fullWidth style={{ marginTop: spacing.m }} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    paddingTop: spacing.l,
  },
  name: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  rating: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: '600' },
  rejectTitle: { fontSize: font.size.sm, fontWeight: '800', color: colors.danger },
  rejectText: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2, lineHeight: 19 },
  bio: { fontSize: font.size.sm, color: colors.textMuted, lineHeight: 21 },
  gatingHint: {
    marginTop: spacing.l,
    fontSize: font.size.xs,
    color: colors.textFaint,
    lineHeight: 17,
  },
  actions: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.m,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetText: { fontSize: font.size.sm, color: colors.textMuted, lineHeight: 20, marginTop: spacing.s },
});
