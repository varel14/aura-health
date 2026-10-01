import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Screen, SectionHeader } from '@/components/ui';
import { PrescriptionCard } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { useAsync } from '@/hooks/useAsync';
import { doctorWorkspaceService } from '@/services';
import { dayLabel } from '@/utils/format';
import { SymptomPrep } from '@/models/types';

export default function DoctorPatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { prescriptions } = useAppData();
  const { data: patient, loading, error, reload } = useAsync(() => doctorWorkspaceService.getPatient(id), [id]);
  const patientRx = prescriptions.filter((p) => p.patientId === id);

  if (loading) {
    return (
      <Screen title="Dossier patient" onBack={() => router.back()}>
        <ErrorState message="Chargement…" />
      </Screen>
    );
  }
  if (error || !patient) {
    return (
      <Screen title="Dossier patient" onBack={() => router.back()}>
        <ErrorState onRetry={reload} message="Patient introuvable." />
      </Screen>
    );
  }

  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <Screen title="Dossier patient" onBack={() => router.back()}>
      <View style={styles.hero}>
        <Avatar name={fullName} size={64} />
        <View style={{ flex: 1, marginLeft: spacing.m }}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.meta}>
            {patient.age} ans • {patient.sex === 'M' ? 'Homme' : 'Femme'} • {patient.city}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            <Badge label={`Groupe ${patient.bloodType}`} variant="danger" size="sm" />
            <Badge label={`${patient.heightCm} cm`} variant="neutral" size="sm" />
            <Badge label={`${patient.weightKg} kg`} variant="neutral" size="sm" />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.s, marginTop: spacing.s }}>
        <View style={{ flex: 1 }}>
          <Button title="Consultation vidéo" icon="videocam" size="sm" onPress={() => router.push('/consultation/video/appt1')} fullWidth />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Consulter par chat" icon="chatbubble-ellipses" variant="soft" size="sm" onPress={() => router.push('/consultation/chat/th1')} fullWidth />
        </View>
      </View>
      <Button
        title="Créer une ordonnance"
        icon="document-text"
        variant="outline"
        onPress={() => router.push({ pathname: '/prescriptions/create', params: { patientId: patient.id } })}
        fullWidth
        style={{ marginTop: spacing.s }}
      />

      {patient.allergies.length > 0 && (
        <>
          <SectionHeader title="Allergies" style={{ paddingHorizontal: 0 }} />
          <Card style={{ backgroundColor: colors.dangerSoft, borderColor: '#F3C1C1' }}>
            {patient.allergies.map((a) => (
              <View key={a} style={styles.allergyRow}>
                <Ionicons name="warning" size={14} color={colors.danger} />
                <Text style={styles.allergyText}>{a}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionHeader title="Antécédents" style={{ paddingHorizontal: 0 }} />
      <Card>
        {patient.conditions.map((c) => (
          <View key={c} style={styles.listRow}>
            <Ionicons name="pulse" size={15} color={colors.primary} />
            <Text style={[styles.listText, { flex: 1 }]}>{c}</Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="Traitements en cours" style={{ paddingHorizontal: 0 }} />
      <Card>
        {patient.treatments.map((t) => (
          <View key={t} style={styles.listRow}>
            <Ionicons name="medkit" size={15} color={colors.info} />
            <Text style={[styles.listText, { flex: 1 }]}>{t}</Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="Analyse IA des symptômes" style={{ paddingHorizontal: 0 }} />
      <SymptomAiSection patientId={patient.id} />

      <SectionHeader title="Ordonnances du patient" style={{ paddingHorizontal: 0 }} />
      {patientRx.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Aucune ordonnance dans le dossier de ce patient.</Text>
        </Card>
      ) : (
        <View style={{ gap: spacing.s }}>
          {patientRx.map((rx) => (
            <PrescriptionCard
              key={rx.id}
              doctorName={rx.doctorName}
              date={dayLabel(rx.date)}
              establishment={rx.establishment}
              medicationCount={rx.lines.length}
              status={rx.status}
              source={rx.source}
              onPress={() => router.push(`/prescriptions/${rx.id}`)}
            />
          ))}
        </View>
      )}

      <SectionHeader title="Dernière visite" style={{ paddingHorizontal: 0 }} />
      <Card>
        <Text style={styles.lastVisit}>{dayLabel(patient.lastVisit)}</Text>
        <Text style={styles.lastMotif}>{patient.lastMotif}</Text>
      </Card>

      <View style={{ height: 30 }} />
    </Screen>
  );
}

/**
 * Physician-only view of the Groq symptom analyses. The API only includes the
 * AI diagnostic in doctor sessions — this section renders it when present and
 * degrades gracefully when the analysis ran on the local rule engine.
 */
function SymptomAiSection({ patientId }: { patientId: string }) {
  const { data: preps, loading } = useAsync(() => doctorWorkspaceService.patientSymptomPreps(patientId), [patientId]);

  if (loading) {
    return (
      <Card>
        <Text style={styles.emptyText}>Chargement des analyses…</Text>
      </Card>
    );
  }
  if (!preps || preps.length === 0) {
    return (
      <Card>
        <Text style={styles.emptyText}>Aucune analyse de symptômes transmise par ce patient.</Text>
      </Card>
    );
  }

  return (
    <View style={{ gap: spacing.s }}>
      {preps.slice(0, 3).map((prep) => (
        <PrepDiagnosticCard key={prep.id} prep={prep} />
      ))}
    </View>
  );
}

const priorityColor = (p: SymptomPrep['priority']) => (p === 'élevée' ? colors.danger : p === 'modérée' ? colors.warning : colors.success);
const likelihoodVariant = (l: string) => (l === 'élevée' ? 'danger' : l === 'moyenne' ? 'warning' : 'neutral') as 'danger' | 'warning' | 'neutral';

function PrepDiagnosticCard({ prep }: { prep: SymptomPrep }) {
  const d = prep.aiDiagnostic;
  return (
    <Card style={{ borderWidth: 1.5, borderColor: '#DCD0F7', backgroundColor: colors.aiSoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="sparkles" size={16} color={colors.ai} />
        <Text style={styles.aiSectionLabel}>Analyse IA du {dayLabel(prep.createdAt)}</Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor(prep.priority) }]}>
          <Text style={styles.priorityText}>{prep.priority}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.s }}>
        {prep.symptoms.map((s) => (
          <View key={s} style={styles.symptomChip}>
            <Text style={styles.symptomChipText}>{s}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.metaLine}>
        {prep.duration} • Intensité {prep.intensity.toLowerCase()} • {prep.evolution}
        {prep.details ? ` • « ${prep.details} »` : ''}
      </Text>

      {d ? (
        <>
          <Text style={styles.diagTitle}>Synthèse clinique</Text>
          <Text style={styles.diagBody}>{d.summary}</Text>

          {d.possibleConditions.length > 0 && (
            <>
              <Text style={styles.diagTitle}>Hypothèses diagnostiques</Text>
              {d.possibleConditions.map((c) => (
                <View key={c.name} style={styles.condRow}>
                  <Text style={[styles.diagBody, { flex: 1 }]}>{c.name}</Text>
                  <Badge label={c.likelihood} variant={likelihoodVariant(c.likelihood)} size="sm" />
                </View>
              ))}
            </>
          )}

          {d.redFlags.length > 0 && (
            <>
              <Text style={styles.diagTitle}>Signes d’alerte à rechercher</Text>
              {d.redFlags.map((f) => (
                <View key={f} style={styles.flagRow}>
                  <Ionicons name="warning" size={13} color={colors.danger} />
                  <Text style={[styles.diagBody, { flex: 1 }]}>{f}</Text>
                </View>
              ))}
            </>
          )}

          {d.questions.length > 0 && (
            <>
              <Text style={styles.diagTitle}>Questions d’anamnèse suggérées</Text>
              {d.questions.map((q) => (
                <View key={q} style={styles.flagRow}>
                  <Ionicons name="help-circle" size={13} color={colors.ai} />
                  <Text style={[styles.diagBody, { flex: 1 }]}>{q}</Text>
                </View>
              ))}
            </>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.s, marginTop: spacing.s }}>
            {d.recommendedSpecialty ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>Spécialité suggérée</Text>
                <Text style={styles.noteText}>{d.recommendedSpecialty}</Text>
              </View>
            ) : null}
            {d.urgencyNote ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>Conduite à tenir</Text>
                <Text style={styles.noteText}>{d.urgencyNote}</Text>
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <Text style={styles.metaLine}>
          Analyse produite par le moteur local (IA Groq indisponible) — aucune hypothèse diagnostique générée.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  aiSectionLabel: { fontSize: font.size.sm, fontWeight: '800', color: colors.ai, flex: 1 },
  priorityBadge: { borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 4 },
  priorityText: { color: colors.white, fontSize: font.size.xs, fontWeight: '800', textTransform: 'uppercase' },
  symptomChip: { backgroundColor: colors.white, borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#DCD0F7' },
  symptomChipText: { fontSize: font.size.xs, color: '#3D2373', fontWeight: '600' },
  metaLine: { fontSize: font.size.xs, color: '#7A5FB5', marginTop: 6, lineHeight: 17 },
  diagTitle: { fontSize: font.size.sm, fontWeight: '800', color: '#3D2373', marginTop: spacing.m, marginBottom: 4 },
  diagBody: { fontSize: font.size.sm, color: colors.text, lineHeight: 20 },
  condRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  flagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 3 },
  noteBox: { flex: 1, backgroundColor: colors.white, borderRadius: radii.m, borderWidth: 1, borderColor: '#DCD0F7', padding: spacing.s },
  noteLabel: { fontSize: font.size.xs, fontWeight: '800', color: colors.ai, marginBottom: 2 },
  noteText: { fontSize: font.size.xs, color: colors.text, lineHeight: 17 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    marginTop: spacing.s,
  },
  name: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  meta: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  allergyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  allergyText: { fontSize: font.size.sm, color: colors.danger, fontWeight: '600', flex: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  listText: { fontSize: font.size.sm, color: colors.text },
  emptyText: { fontSize: font.size.sm, color: colors.textMuted },
  lastVisit: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  lastMotif: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 3 },
});
