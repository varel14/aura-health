import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Chip, Input, Screen, useToast } from '@/components/ui';
import { PaymentSheet } from '@/components/domain';
import { consultationTypeInfo } from '@/components/domain/AppointmentCards';
import { Avatar } from '@/components/ui/Avatar';
import { colors, font, radii, spacing } from '@/constants/theme';
import { doctorService } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useAppData } from '@/context/AppDataContext';
import { fcfa, fullDate, nowTime, shortDay, todayISO } from '@/utils/format';
import { Appointment, ConsultationType } from '@/models/types';

const commonSymptoms = ['Fièvre', 'Maux de tête', 'Toux', 'Fatigue', 'Douleurs abdominales', 'Nausées', 'Vertiges', 'Courbatures', 'Éruption cutanée', 'Douleur articulaire', 'Insomnie', 'Anxiété'];

const stepTitles = ['Type de consultation', 'Date et créneau', 'Motif de consultation', 'Vérification', 'Paiement'];

export default function BookAppointment() {
  const { doctorId, date: dateParam, time: timeParam } = useLocalSearchParams<{
    doctorId: string;
    date?: string;
    time?: string;
  }>();
  const { addAppointment, addNotification, updateAppointment } = useAppData();
  const { show } = useToast();

  const { data: doctor, loading } = useAsync(() => doctorService.get(doctorId), [doctorId]);
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ConsultationType | null>(null);
  const [date, setDate] = useState(dateParam ?? todayISO());
  const [time, setTime] = useState(timeParam ?? '');
  const [motif, setMotif] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [payVisible, setPayVisible] = useState(false);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [booking, setBooking] = useState(false);
  const bookedRef = useRef<Appointment | null>(null);

  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => todayISO(i)), []);
  const slots = useAsync(
    () => (doctor ? doctorService.slots(doctor, date) : Promise.resolve([])),
    [doctor?.id, date],
  );

  if (loading || !doctor) {
    return (
      <Screen onBack={() => router.back()}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 140 }} />
      </Screen>
    );
  }

  const fee =
    type === 'video' ? doctor.videoFee ?? doctor.fee : type === 'chat' ? doctor.chatFee ?? Math.round(doctor.fee * 0.7) : doctor.fee;
  const canNext =
    step === 0 ? type !== null : step === 1 ? time !== '' : step === 2 ? motif.trim().length >= 5 : true;

  const createAppointment = async (): Promise<Appointment | null> => {
    try {
      // The server computes the fee, the patient identity and slot availability;
      // the returned appointment carries the real id used for deep links.
      const appt = await addAppointment({
        id: '',
        doctorId: doctor.id,
        patientId: '',
        patientName: '',
        patientAge: 0,
        type: type!,
        status: 'confirmed',
        date,
        time,
        motif: motif.trim(),
        symptoms,
        fee,
        establishment: 'Cabinet du praticien',
        paid: false,
      });
      return appt;
    } catch (err) {
      show(err instanceof Error ? err.message : 'Réservation impossible.');
      return null;
    }
  };

  // The appointment is created (unpaid) before the payment step: the server
  // payment endpoint confirms an existing appointment by id.
  const ensureBooked = async (): Promise<Appointment | null> => {
    if (bookedRef.current) return bookedRef.current;
    setBooking(true);
    const appt = await createAppointment();
    setBooking(false);
    if (appt) {
      bookedRef.current = appt;
      setBooked(appt);
    }
    return appt;
  };

  const onPayNow = async () => {
    const appt = await ensureBooked();
    if (!appt) return;
    setPayVisible(true);
  };

  const onSkipPayment = async () => {
    const appt = await ensureBooked();
    if (!appt) return;
    addNotification({
      type: 'payment',
      title: 'Paiement en attente',
      body: `Finalisez le paiement de votre consultation (${fcfa(fee)}) pour confirmer définitivement le rendez-vous.`,
      time: nowTime(),
      deepLink: `/appointment/${appt.id}`,
    });
    setStep(5);
  };

  // The server marked the appointment paid while processing the charge.
  const onPaid = (payment: { id: string }) => {
    const appt = bookedRef.current;
    if (!appt) return;
    const paidAppointment = { ...appt, paid: true, paymentId: payment.id };
    bookedRef.current = paidAppointment;
    setBooked(paidAppointment);
    updateAppointment(appt.id, { paid: true, paymentId: payment.id });
    setStep(5);
  };

  const toggleSymptom = (s: string) =>
    setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const addCustom = () => {
    const v = customSymptom.trim();
    if (v && !symptoms.includes(v)) {
      setSymptoms([...symptoms, v]);
      setCustomSymptom('');
    }
  };

  const establishmentLabel = `Dr ${doctor.firstName} ${doctor.lastName} — ${doctor.specialty}`;

  return (
    <Screen onBack={() => (step > 0 && step < 5 ? setStep(step - 1) : router.back())}>
      {step < 5 ? (
        <>
          <View style={styles.progressRow}>
            {stepTitles.map((_, i) => (
              <View key={i} style={[styles.progressSeg, i <= step && styles.progressSegActive]} />
            ))}
          </View>
          <Text style={styles.stepLabel}>
            Étape {step + 1} sur 5 — {stepTitles[step]}
          </Text>

          <View style={[styles.doctorStrip, styles.cardBox]}>
            <Avatar name={`Dr ${doctor.firstName} ${doctor.lastName}`} size={44} />
            <View style={{ flex: 1, marginLeft: spacing.m }}>
              <Text style={styles.doctorStripName}>Dr {doctor.firstName} {doctor.lastName}</Text>
              <Text style={styles.doctorStripSub}>{doctor.specialty}</Text>
            </View>
          </View>

          {step === 0 && (
            <View style={{ gap: spacing.s }}>
              {(Object.keys(consultationTypeInfo) as ConsultationType[])
                .filter((t) => (t === 'video' ? doctor.videoAvailable : t === 'chat' ? doctor.chatAvailable : doctor.inPersonAvailable))
                .map((t) => {
                  const info = consultationTypeInfo[t];
                  const tFee = t === 'video' ? doctor.videoFee ?? doctor.fee : t === 'chat' ? doctor.chatFee ?? Math.round(doctor.fee * 0.7) : doctor.fee;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setType(t)}
                      style={[styles.typeCard, type === t && styles.typeCardActive]}
                    >
                      <View style={[styles.typeIcon, { backgroundColor: info.soft }]}>
                        <Ionicons name={info.icon} size={22} color={info.tint} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.typeTitle}>{info.label}</Text>
                        <Text style={styles.typeSub}>
                          {t === 'video' ? 'Face à face à distance en temps réel' : t === 'chat' ? 'Échange écrit asynchrone avec le médecin' : 'Consultation au cabinet ou à l’établissement'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.typeFee}>{fcfa(tFee)}</Text>
                        {type === t && <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginTop: 4 }} />}
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          )}

          {step === 1 && (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: spacing.m }}>
                <View style={{ flexDirection: 'row', gap: spacing.s }}>
                  {dates.map((d) => {
                    const s = shortDay(d);
                    const active = d === date;
                    return (
                      <Pressable key={d} onPress={() => { setDate(d); setTime(''); }} style={[styles.dateChip, active && styles.dateChipActive]}>
                        <Text style={[styles.dateWeekday, active && { color: colors.white }]}>{s.weekday}</Text>
                        <Text style={[styles.dateDay, active && { color: colors.white }]}>{s.day}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              {slots.loading ? (
                <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.l }} />
              ) : (
                <View style={styles.slotGrid}>
                  {(slots.data ?? []).map((s) => (
                    <Pressable
                      key={s.time}
                      disabled={!s.available}
                      onPress={() => setTime(s.time)}
                      style={[
                        styles.slot,
                        time === s.time && styles.slotActive,
                        !s.available && styles.slotDisabled,
                      ]}
                    >
                      <Text style={[styles.slotText, time === s.time && { color: colors.white }, !s.available && { color: colors.textFaint }]}>
                        {s.time}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {(slots.data ?? []).every((s) => !s.available) && !slots.loading && (
                <Text style={styles.noSlots}>Aucun créneau disponible ce jour — choisissez une autre date.</Text>
              )}
            </View>
          )}

          {step === 2 && (
            <View>
              <Input
                label="Motif de consultation"
                placeholder="Décrivez brièvement la raison de votre consultation…"
                value={motif}
                onChangeText={setMotif}
                multiline
                style={{ height: 90, textAlignVertical: 'top' }}
              />
              <Text style={styles.symptomLabel}>Symptômes ressentis (facultatif)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.m }}>
                {commonSymptoms.map((s) => (
                  <Chip key={s} label={s} selected={symptoms.includes(s)} onPress={() => toggleSymptom(s)} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.s, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Input label="Autre symptôme" placeholder="Ajouter un symptôme…" value={customSymptom} onChangeText={setCustomSymptom} />
                </View>
                <Button title="Ajouter" variant="soft" onPress={addCustom} style={{ marginBottom: 16 }} />
              </View>
              {symptoms.length > 0 && (
                <Text style={styles.symptomCount}>{symptoms.length} symptôme(s) sélectionné(s)</Text>
              )}
            </View>
          )}

          {step === 3 && (
            <Card>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Médecin</Text>
                <Text style={styles.recapValue}>Dr {doctor.firstName} {doctor.lastName}</Text>
              </View>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Spécialité</Text>
                <Text style={styles.recapValue}>{doctor.specialty}</Text>
              </View>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Type</Text>
                <Text style={styles.recapValue}>{type ? consultationTypeInfo[type].label : ''}</Text>
              </View>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Date</Text>
                <Text style={styles.recapValue}>{fullDate(date)}</Text>
              </View>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Heure</Text>
                <Text style={styles.recapValue}>{time}</Text>
              </View>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Motif</Text>
                <Text style={[styles.recapValue, { flex: 1, textAlign: 'right' }]}>{motif}</Text>
              </View>
              {symptoms.length > 0 && (
                <View style={styles.recapRow}>
                  <Text style={styles.recapLabel}>Symptômes</Text>
                  <Text style={[styles.recapValue, { flex: 1, textAlign: 'right' }]}>{symptoms.join(', ')}</Text>
                </View>
              )}
              <View style={[styles.recapRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.recapLabel}>Tarif</Text>
                <Text style={[styles.recapValue, { fontWeight: '800' }]}>{fcfa(fee)}</Text>
              </View>
              <Pressable style={styles.editRecap} onPress={() => setStep(0)}>
                <Ionicons name="create" size={14} color={colors.primary} />
                <Text style={styles.editRecapText}>Modifier les informations</Text>
              </Pressable>
            </Card>
          )}

          {step === 4 && (
            <View>
              <Card style={{ alignItems: 'center', paddingVertical: spacing.l }}>
                <Text style={styles.payLabel}>Montant de la consultation</Text>
                <Text style={styles.payAmount}>{fcfa(fee)}</Text>
                <Text style={styles.paySub}>{establishmentLabel}</Text>
                <Text style={styles.paySub}>{fullDate(date)} à {time}</Text>
              </Card>
              <Button
                loading={booking}
                title={`Payer maintenant — ${fcfa(fee)}`}
                icon="lock-closed"
                size="lg"
                fullWidth
                style={{ marginTop: spacing.m }}
                onPress={onPayNow}
              />
              <Button title="Payer plus tard" variant="ghost" onPress={onSkipPayment} fullWidth />
              <Text style={styles.payNote}>
                Le paiement confirme définitivement votre rendez-vous. Mobile Money (MTN / Orange) et carte bancaire acceptés.
              </Text>
            </View>
          )}

          {step < 4 && (
            <Button
              title={step === 3 ? 'Continuer vers le paiement' : 'Continuer'}
              disabled={!canNext}
              size="lg"
              fullWidth
              style={{ marginTop: spacing.l }}
              onPress={() => setStep(step + 1)}
            />
          )}
        </>
      ) : (
        booked && <ConfirmationStep appointment={booked} doctorName={`Dr ${doctor.firstName} ${doctor.lastName}`} specialty={doctor.specialty} />
      )}

      <PaymentSheet
        visible={payVisible}
        onClose={() => setPayVisible(false)}
        amount={fee}
        label={`Consultation — ${establishmentLabel}`}
        category="consultation"
        relatedId={booked?.id}
        onSuccess={onPaid}
      />
    </Screen>
  );
}

function ConfirmationStep({
  appointment,
  doctorName,
  specialty,
}: {
  appointment: Appointment;
  doctorName: string;
  specialty: string;
}) {
  const info = consultationTypeInfo[appointment.type];
  return (
    <View style={{ alignItems: 'center', paddingTop: spacing.l }}>
      <View style={styles.checkWrap}>
        <Ionicons name="checkmark" size={44} color={colors.white} />
      </View>
      <Text style={styles.doneTitle}>Rendez-vous confirmé !</Text>
      <Text style={styles.doneSub}>
        Votre rendez-vous a été enregistré{appointment.paid ? ' et le paiement a été reçu' : '. Le paiement reste à finaliser'}.
      </Text>
      <Card style={{ alignSelf: 'stretch', marginTop: spacing.l }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
          <View style={[styles.doneIcon, { backgroundColor: info.soft }]}>
            <Ionicons name={info.icon} size={20} color={info.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.doneDoctor}>{doctorName}</Text>
            <Text style={styles.doneMeta}>{specialty}</Text>
            <Text style={styles.doneMeta}>
              {fullDate(appointment.date)} • {appointment.time}
            </Text>
          </View>
        </View>
      </Card>
      <View style={{ alignSelf: 'stretch', marginTop: spacing.l, gap: spacing.s }}>
        <Button title="Voir le détail du rendez-vous" onPress={() => router.replace(`/appointment/${appointment.id}`)} size="lg" fullWidth />
        <Button
          title="Décrire mes symptômes avant la consultation"
          icon="sparkles"
          variant="soft"
          onPress={() => router.push('/symptoms')}
          fullWidth
        />
        <Button title="Retour à l’accueil" variant="outline" onPress={() => router.replace('/(patient)')} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', gap: 6, marginTop: spacing.s },
  progressSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.divider },
  progressSegActive: { backgroundColor: colors.primary },
  stepLabel: { fontSize: font.size.xs, color: colors.textMuted, marginTop: spacing.s, fontWeight: '600' },
  cardBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.m,
  },
  doctorStrip: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.m },
  doctorStripName: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  doctorStripSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.l,
    padding: spacing.m,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: '#F4FAF8' },
  typeIcon: { width: 46, height: 46, borderRadius: radii.m, alignItems: 'center', justifyContent: 'center' },
  typeTitle: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  typeSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
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
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  slot: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.s,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  slotActive: { backgroundColor: colors.primary },
  slotDisabled: { backgroundColor: colors.divider },
  slotText: { color: colors.primaryDark, fontWeight: '700', fontSize: font.size.sm },
  noSlots: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.m },
  symptomLabel: { fontSize: font.size.sm, fontWeight: '600', color: colors.text, marginBottom: 8 },
  symptomCount: { fontSize: font.size.xs, color: colors.primary, fontWeight: '600', marginTop: -6 },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  recapLabel: { fontSize: font.size.sm, color: colors.textMuted },
  recapValue: { fontSize: font.size.sm, color: colors.text, fontWeight: '600', maxWidth: '62%' },
  editRecap: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingTop: spacing.m },
  editRecapText: { fontSize: font.size.sm, color: colors.primary, fontWeight: '600' },
  payLabel: { fontSize: font.size.sm, color: colors.textMuted },
  payAmount: { fontSize: 34, fontWeight: '800', color: colors.primaryDark, marginTop: 6 },
  paySub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 3 },
  payNote: { fontSize: font.size.xs, color: colors.textFaint, textAlign: 'center', lineHeight: 16, marginTop: spacing.s },
  checkWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.success,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  doneTitle: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text, marginTop: spacing.l },
  doneSub: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: spacing.l },
  doneIcon: { width: 44, height: 44, borderRadius: radii.m, alignItems: 'center', justifyContent: 'center' },
  doneDoctor: { fontSize: font.size.base, fontWeight: '800', color: colors.text },
  doneMeta: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
});
