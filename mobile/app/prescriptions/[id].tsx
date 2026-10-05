import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, ErrorState, Screen, SectionHeader, useToast } from '@/components/ui';
import { ConfirmSheet } from '@/components/ui/BottomSheet';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { addMonths, dayLabel, fullDate } from '@/utils/format';
import { downloadPrescriptionPdf } from '@/utils/prescriptionPdf';
import { useState } from 'react';

export default function PrescriptionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { prescriptions, updatePrescription, addNotification } = useAppData();
  const { role } = useAuth();
  const { show } = useToast();
  const [renewVisible, setRenewVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const rx = prescriptions.find((p) => p.id === id);

  const download = async () => {
    if (!rx) return;
    setDownloading(true);
    try {
      await downloadPrescriptionPdf(rx);
    } catch {
      show('Téléchargement impossible pour le moment.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (!rx) {
    return (
      <Screen title="Ordonnance" onBack={() => router.back()}>
        <ErrorState message="Cette ordonnance n’existe pas ou a été supprimée." />
      </Screen>
    );
  }

  const isDoctor = role === 'doctor';

  const renew = () => {
    updatePrescription(rx.id, { expiryDate: addMonths(rx.expiryDate, 1), status: 'active' });
    addNotification({
      type: 'renewal',
      title: 'Ordonnance renouvelée',
      body: `L’ordonnance ${rx.code} de ${rx.patientName} a été renouvelée pour un mois.`,
      time: new Date().toTimeString().slice(0, 5),
      deepLink: `/prescriptions/${rx.id}`,
    });
    show('Ordonnance renouvelée d’un mois.');
  };

  return (
    <Screen title="Ordonnance" onBack={() => router.back()} right={<Badge label={rx.code} variant="neutral" size="sm" />}>
      <Card style={{ borderWidth: 1.5, borderColor: rx.source === 'imported' ? colors.warningSoft : colors.primarySoft }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
          <View style={[styles.icon, { backgroundColor: rx.source === 'imported' ? colors.warningSoft : colors.primarySoft }]}>
            <Ionicons name={rx.source === 'imported' ? 'cloud-download' : 'document-text'} size={22} color={rx.source === 'imported' ? colors.warning : colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.doctor}>{rx.doctorName}</Text>
            <Text style={styles.spec}>{rx.doctorSpecialty} • {rx.establishment}</Text>
          </View>
        </View>
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Patient</Text>
            <Text style={styles.metaValue}>{rx.patientName}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{fullDate(rx.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Validité</Text>
            <Text style={[styles.metaValue, { color: rx.status === 'active' ? colors.success : colors.textFaint }]}>
              {rx.status === 'active' ? `Jusqu'au ${dayLabel(rx.expiryDate)}` : 'Expirée'}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.s }}>
          <Badge
            label={rx.source === 'imported' ? 'Ordonnance importée' : 'Ordonnance délivrée sur AuraHealth'}
            variant={rx.source === 'imported' ? 'warning' : 'primary'}
            size="sm"
          />
        </View>
      </Card>

      <SectionHeader title={`Médicaments prescrits (${rx.lines.length})`} style={{ paddingHorizontal: 0 }} />
      <View style={{ gap: spacing.s }}>
        {rx.lines.map((line, i) => (
          <Card key={i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.lineNumber}>
                <Text style={styles.lineNumberText}>{i + 1}</Text>
              </View>
              <Text style={[styles.lineName, { flex: 1 }]}>
                {line.name}
              </Text>
              <Badge label={line.form} variant="neutral" size="sm" />
            </View>
            <View style={styles.lineGrid}>
              <View style={styles.lineField}>
                <Text style={styles.lineLabel}>Dosage</Text>
                <Text style={styles.lineValue}>{line.dosage}</Text>
              </View>
              <View style={styles.lineField}>
                <Text style={styles.lineLabel}>Quantité</Text>
                <Text style={styles.lineValue}>{line.quantity}</Text>
              </View>
              <View style={styles.lineField}>
                <Text style={styles.lineLabel}>Fréquence</Text>
                <Text style={styles.lineValue}>{line.frequency}</Text>
              </View>
              <View style={styles.lineField}>
                <Text style={styles.lineLabel}>Durée</Text>
                <Text style={styles.lineValue}>{line.duration}</Text>
              </View>
            </View>
            {line.instructions && (
              <View style={styles.lineInstructions}>
                <Ionicons name="information-circle" size={13} color={colors.info} />
                <Text style={styles.lineInstructionsText}>{line.instructions}</Text>
              </View>
            )}
          </Card>
        ))}
      </View>

      {rx.instructions && (
        <>
          <SectionHeader title="Consignes médicales" style={{ paddingHorizontal: 0 }} />
          <Card>
            <Text style={styles.bodyText}>{rx.instructions}</Text>
          </Card>
        </>
      )}

      <View style={{ marginTop: spacing.l, gap: spacing.s }}>
        {!isDoctor && (
          <>
            <Button title="Télécharger (PDF)" icon="download" variant="soft" loading={downloading} onPress={download} fullWidth />
            <Button title="Rechercher les médicaments" icon="medkit" onPress={() => router.push('/medications')} fullWidth size="lg" />
          </>
        )}
        {isDoctor && (
          <>
            <Button
              title="Modifier l’ordonnance"
              icon="create"
              onPress={() => router.push({ pathname: '/prescriptions/create', params: { editId: rx.id, patientId: rx.patientId } })}
              fullWidth
              size="lg"
            />
            <Button title="Renouveler l’ordonnance" icon="refresh" variant="soft" onPress={() => setRenewVisible(true)} fullWidth />
            <Button title="Historique des ordonnances" icon="time" variant="outline" onPress={() => router.push('/prescriptions')} fullWidth />
          </>
        )}
      </View>

      <ConfirmSheet
        visible={renewVisible}
        onClose={() => setRenewVisible(false)}
        onConfirm={renew}
        title="Renouveler cette ordonnance ?"
        message="La validité sera prolongée d’un mois à compter d’aujourd’hui. Le patient sera notifié."
        confirmLabel="Renouveler"
        confirmVariant="primary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 52, height: 52, borderRadius: radii.l, alignItems: 'center', justifyContent: 'center' },
  doctor: { fontSize: font.size.md, fontWeight: '800', color: colors.text },
  spec: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m, marginTop: spacing.m },
  metaItem: { minWidth: '30%', flexGrow: 1 },
  metaLabel: { fontSize: font.size.xs, color: colors.textFaint },
  metaValue: { fontSize: font.size.sm, color: colors.text, fontWeight: '600', marginTop: 2 },
  lineNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineNumberText: { fontSize: font.size.xs, fontWeight: '800', color: colors.primaryDark },
  lineName: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  lineGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.m, gap: spacing.m },
  lineField: { minWidth: '44%', flexGrow: 1 },
  lineLabel: { fontSize: font.size.xs, color: colors.textFaint },
  lineValue: { fontSize: font.size.sm, color: colors.text, fontWeight: '500', marginTop: 2 },
  lineInstructions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    backgroundColor: colors.infoSoft,
    borderRadius: radii.s,
    padding: 8,
    marginTop: spacing.m,
  },
  lineInstructionsText: { flex: 1, fontSize: font.size.xs, color: colors.info, lineHeight: 16 },
  bodyText: { fontSize: font.size.sm, color: colors.text, lineHeight: 21 },
});
