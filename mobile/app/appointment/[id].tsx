import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Chip, ConfirmSheet, ErrorState, Screen, SectionHeader, StatusBadge, useToast } from '@/components/ui';
import { PaymentSheet } from '@/components/domain';
import { consultationTypeInfo } from '@/components/domain/AppointmentCards';
import { Avatar } from '@/components/ui/Avatar';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { doctorService } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { dayLabel, fcfa, fullDate, shortDay, todayISO } from '@/utils/format';
import { AppointmentStatus, ConsultationType } from '@/models/types';

const cancelReasons = [
  'Je me sens mieux',
  'Empêchement personnel',
  'Je souhaite changer de médecin',
  'Rendez-vous en double',
  'Autre raison',
];

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appointments, updateAppointment, summaries, threads, symptomPreps } = useAppData();
  const { role } = useAuth();
  const { show } = useToast();
  const appointment = appointments.find((a) => a.id === id);
  const { data: doctor } = useAsync(
    () => doctorService.get(appointment?.doctorId ?? ''),
    [appointment?.doctorId],
  );
  const [payVisible, setPayVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(appointment?.date ?? todayISO());
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [completing, setCompleting] = useState(false);

  const dates = useMemo(() => Array.from({ length: 10 }, (_, i) => todayISO(i)), []);
  const thread = threads.find((t) => t.appointmentId === appointment?.id);
  const summary = summaries.find((s) => s.appointmentId === appointment?.id);
  const prep = symptomPreps[0];

  if (!appointment) {
    return (
      <Screen title="Rendez-vous" onBack={() => router.back()}>
        <ErrorState message="Ce rendez-vous n’existe pas ou a été supprimé." />
      </Screen>
    );
  }

  const info = consultationTypeInfo[appointment.type];
  const doctorName = doctor ? `Dr ${doctor.firstName} ${doctor.lastName}` : 'Médecin';
  const isDoctorView = role === 'doctor';
  const isFuture = appointment.date >= todayISO();

  const cancel = async () => {
    try {
      await updateAppointment(appointment.id, { status: 'cancelled' });
      show('Le rendez-vous a été annulé.', 'info');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Annulation impossible.', 'error');
    }
  };

  const reschedule = async () => {
    if (!rescheduleTime) return;
    try {
      await updateAppointment(appointment.id, { date: rescheduleDate, time: rescheduleTime, status: 'confirmed' });
      setRescheduleVisible(false);
      setRescheduleTime('');
      show('Rendez-vous reprogrammé avec succès.');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Reprogrammation impossible.', 'error');
    }
  };

  const complete = async () => {
    setCompleting(true);
    try {
      // POST /api/appointments/:id/complete (doctor-only) — also notifies the patient.
      await updateAppointment(appointment.id, { status: 'completed' });
      show('Consultation marquée comme terminée.');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Clôture impossible.', 'error');
    } finally {
      setCompleting(false);
    }
  };

  const startChat = () => {
    if (thread) router.push(`/consultation/chat/${thread.id}`);
    else show('La discussion sera disponible à l’heure du rendez-vous.', 'info');
  };

  return (
    <Screen title="Détail du rendez-vous" onBack={() => router.back()}>
      <View style={[styles.statusCard, { backgroundColor: info.soft }]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusIcon, { backgroundColor: colors.card }]}>
            <Ionicons name={info.icon} size={22} color={info.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusType}>{info.label}</Text>
            <Text style={styles.statusMeta}>
              {dayLabel(appointment.date)} • {appointment.time}
            </Text>
          </View>
          <StatusBadge status={appointment.status} />
        </View>
        <Text style={styles.statusFullDate}>{fullDate(appointment.date)}</Text>
      </View>

      {!isDoctorView && (
        <Card style={{ marginTop: spacing.s }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
            <Avatar name={doctorName} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>{doctorName}</Text>
              <Text style={styles.docSpec}>{doctor?.specialty}</Text>
              <Text style={styles.docEst}>{appointment.establishment}</Text>
            </View>
            {doctor && (
              <Pressable onPress={() => router.push(`/doctors/${doctor.id}`)}>
                <Text style={styles.link}>Profil</Text>
              </Pressable>
            )}
          </View>
        </Card>
      )}

      {isDoctorView && (
        <Card style={{ marginTop: spacing.s }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
            <Avatar name={appointment.patientName} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>{appointment.patientName}</Text>
              <Text style={styles.docSpec}>{appointment.patientAge} ans — Patient</Text>
            </View>
            <Pressable onPress={() => router.push(`/(doctor)/patients/${appointment.patientId}`)}>
              <Text style={styles.link}>Dossier patient</Text>
            </Pressable>
          </View>
        </Card>
      )}

      <SectionHeader title="Motif de consultation" style={{ paddingHorizontal: 0 }} />
      <Card>
        <Text style={styles.motif}>{appointment.motif}</Text>
        {appointment.symptoms.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.m }}>
            {appointment.symptoms.map((s) => (
              <Badge key={s} label={s} variant="neutral" size="sm" />
            ))}
          </View>
        )}
      </Card>

      {prep && appointment.symptoms.length > 0 && (
        <>
          <SectionHeader title="Préparation IA" style={{ paddingHorizontal: 0 }} />
          <Card style={{ borderWidth: 1.5, borderColor: '#DCD0F7', backgroundColor: colors.aiSoft }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles" size={16} color={colors.ai} />
              <Text style={styles.prepTitle}>Résumé des symptômes transmis</Text>
            </View>
            <Text style={styles.prepText}>
              {prep.symptoms.join(', ')} — {prep.duration}, intensité {prep.intensity}, évolution : {prep.evolution}.
            </Text>
          </Card>
        </>
      )}

      <SectionHeader title="Paiement" style={{ paddingHorizontal: 0 }} />
      <Card>
        <View style={styles.payRow}>
          <Text style={styles.payLabel}>Tarif de la consultation</Text>
          <Text style={styles.payValue}>{fcfa(appointment.fee)}</Text>
        </View>
        <View style={[styles.payRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.payLabel}>Statut</Text>
          {appointment.paid ? (
            <Badge label="Payé" variant="success" />
          ) : appointment.status === 'cancelled' ? (
            <Badge label="Non débité" variant="neutral" />
          ) : (
            <Badge label="En attente" variant="warning" />
          )}
        </View>
        {!appointment.paid && appointment.status !== 'cancelled' && !isDoctorView && (
          <Button
            title={`Payer maintenant — ${fcfa(appointment.fee)}`}
            icon="lock-closed"
            onPress={() => setPayVisible(true)}
            style={{ marginTop: spacing.s }}
            fullWidth
          />
        )}
      </Card>

      {summary && (
        <>
          <SectionHeader title="Résumé de consultation" style={{ paddingHorizontal: 0 }} />
          <Card style={{ borderWidth: 1.5, borderColor: '#DCD0F7', backgroundColor: colors.aiSoft }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles" size={18} color={colors.ai} />
              <Text style={[styles.prepTitle, { flex: 1 }]}>Résumé généré par IA disponible</Text>
            </View>
            <Button
              title="Consulter le résumé"
              size="sm"
              style={{ marginTop: spacing.m, alignSelf: 'flex-start' }}
              onPress={() => router.push(`/consultation/summary/${appointment.id}`)}
            />
          </Card>
        </>
      )}

      {/* Consultation clôturée : le compte-rendu est produit automatiquement à
          la clôture (aucune action à proposer), il s'affiche dès sa réception. */}
      {appointment.status === 'completed' && !summary && (
        <>
          <SectionHeader title="Résumé de consultation" style={{ paddingHorizontal: 0 }} />
          <Card style={{ borderWidth: 1.5, borderColor: '#DCD0F7', backgroundColor: colors.aiSoft }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.ai} />
              <Text style={[styles.prepTitle, { flex: 1 }]}>Résumé en cours de génération…</Text>
            </View>
            <Text style={styles.prepText}>
              La consultation est terminée : le compte-rendu rédigé automatiquement apparaîtra ici dès qu’il est prêt.
            </Text>
          </Card>
        </>
      )}

      <View style={{ marginTop: spacing.l, gap: spacing.s }}>
        {appointment.status === 'confirmed' && isFuture && !isDoctorView && (
          <>
            {appointment.type === 'video' && (
              <Button title="Rejoindre la consultation vidéo" icon="videocam" size="lg" onPress={() => router.push(`/consultation/video/${appointment.id}`)} fullWidth />
            )}
            {appointment.type === 'chat' && (
              <Button title="Ouvrir la discussion" icon="chatbubble-ellipses" size="lg" onPress={startChat} fullWidth />
            )}
            {appointment.type === 'in-person' && (
              <Button title="Voir l’itinéraire" icon="navigate" variant="soft" onPress={() => show('Ouverture de l’itinéraire (simulation).', 'info')} fullWidth />
            )}
            <Button title="Préparer mes symptômes (IA)" icon="sparkles" variant="outline" onPress={() => router.push('/symptoms')} fullWidth />
          </>
        )}

        {appointment.status === 'confirmed' && isFuture && isDoctorView && (
          <>
            {appointment.type === 'video' && (
              <Button title="Démarrer la consultation vidéo" icon="videocam" size="lg" onPress={() => router.push(`/consultation/video/${appointment.id}`)} fullWidth />
            )}
            {appointment.type === 'chat' && (
              <Button title="Démarrer la consultation par chat" icon="chatbubble-ellipses" size="lg" onPress={startChat} fullWidth />
            )}
            <Button title="Créer une ordonnance" icon="document-text" variant="soft" onPress={() => router.push(`/prescriptions/create?patientId=${appointment.patientId}&appointmentId=${appointment.id}`)} fullWidth />
            <Button title="Marquer comme terminée" icon="checkmark-circle" variant="outline" loading={completing} onPress={complete} fullWidth />
          </>
        )}

        {appointment.status === 'completed' && (
          <Button title="Créer / voir l’ordonnance" icon="document-text" variant="soft" onPress={() => router.push('/prescriptions')} fullWidth />
        )}

        {/* Une consultation passée ou clôturée ne peut plus être annulée ni
            reprogrammée : les actions disparaissent avec le créneau. */}
        {appointment.status === 'confirmed' && isFuture && !isDoctorView && (
          <View style={{ flexDirection: 'row', gap: spacing.s }}>
            <View style={{ flex: 1 }}>
              <Button title="Reprogrammer" icon="calendar" variant="outline" onPress={() => setRescheduleVisible(true)} fullWidth />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Annuler" icon="close" variant="danger" onPress={() => setCancelVisible(true)} fullWidth />
            </View>
          </View>
        )}
      </View>

      <PaymentSheet
        visible={payVisible}
        onClose={() => setPayVisible(false)}
        amount={appointment.fee}
        label={`Consultation — ${doctorName}`}
        category="consultation"
        relatedId={appointment.id}
        onSuccess={(payment) => updateAppointment(appointment.id, { paid: true, paymentId: payment.id })}
      />

      <ConfirmSheet
        visible={cancelVisible}
        onClose={() => setCancelVisible(false)}
        onConfirm={cancel}
        title="Annuler ce rendez-vous ?"
        message={`Votre créneau du ${dayLabel(appointment.date)} à ${appointment.time} avec ${doctorName} sera libéré.`}
        confirmLabel="Annuler le rendez-vous"
      >
        <View style={{ marginTop: spacing.m }}>
          <Text style={styles.reasonLabel}>Raison de l’annulation (facultatif)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cancelReasons.map((r) => (
              <Chip key={r} label={r} selected={cancelReason === r} onPress={() => setCancelReason(r)} />
            ))}
          </View>
        </View>
      </ConfirmSheet>

      <ConfirmSheet
        visible={rescheduleVisible}
        onClose={() => setRescheduleVisible(false)}
        onConfirm={reschedule}
        title="Reprogrammer le rendez-vous"
        confirmLabel="Confirmer la nouvelle date"
        confirmVariant="primary"
        message="Choisissez un nouveau créneau parmi les disponibilités."
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: spacing.m }}>
          <View style={{ flexDirection: 'row', gap: spacing.s }}>
            {dates.map((d) => (
              <Pressable
                key={d}
                onPress={() => { setRescheduleDate(d); setRescheduleTime(''); }}
                style={[styles.dateChip, rescheduleDate === d && styles.dateChipActive]}
              >
                <Text style={[styles.dateWeekday, rescheduleDate === d && { color: colors.white }]}>{shortDay(d).weekday}</Text>
                <Text style={[styles.dateDay, rescheduleDate === d && { color: colors.white }]}>{shortDay(d).day}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={styles.slotGrid}>
          {['08:00', '09:00', '10:00', '11:00', '15:00', '16:00', '17:00'].map((t) => (
            <Pressable
              key={t}
              onPress={() => setRescheduleTime(t)}
              style={[styles.slot, rescheduleTime === t && styles.slotActive]}
            >
              <Text style={[styles.slotText, rescheduleTime === t && { color: colors.white }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </ConfirmSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    borderRadius: radii.xl,
    padding: spacing.l,
    marginTop: spacing.s,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  statusIcon: { width: 48, height: 48, borderRadius: radii.m, alignItems: 'center', justifyContent: 'center' },
  statusType: { fontSize: font.size.base, fontWeight: '800', color: colors.text },
  statusMeta: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  statusFullDate: { fontSize: font.size.xs, color: colors.textMuted, marginTop: spacing.m },
  docName: { fontSize: font.size.md, fontWeight: '800', color: colors.text },
  docSpec: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  docEst: { fontSize: font.size.xs, color: colors.textFaint, marginTop: 2 },
  link: { fontSize: font.size.sm, color: colors.primary, fontWeight: '700' },
  motif: { fontSize: font.size.sm, color: colors.text, lineHeight: 21 },
  prepTitle: { fontSize: font.size.sm, fontWeight: '700', color: colors.ai },
  prepText: { fontSize: font.size.xs, color: '#7A5FB5', marginTop: 8, lineHeight: 17 },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  payLabel: { fontSize: font.size.sm, color: colors.textMuted },
  payValue: { fontSize: font.size.base, fontWeight: '800', color: colors.text },
  reasonLabel: { fontSize: font.size.sm, fontWeight: '600', color: colors.text, marginBottom: 8 },
  dateChip: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.m,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 54,
  },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateWeekday: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: '600' },
  dateDay: { fontSize: font.size.md, fontWeight: '800', color: colors.text },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginTop: spacing.m },
  slot: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.s,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  slotActive: { backgroundColor: colors.primary },
  slotText: { color: colors.primaryDark, fontWeight: '700', fontSize: font.size.sm },
});
