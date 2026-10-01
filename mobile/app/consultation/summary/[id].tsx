import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, EmptyState, ErrorState, Screen, SectionHeader, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { dayLabel } from '@/utils/format';

export default function ConsultationSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { summaries, appointments, prescriptions, threads, refresh } = useAppData();
  const { show } = useToast();
  const [retrying, setRetrying] = useState(false);

  const appointment = appointments.find((a) => a.id === id);
  let summary = summaries.find((s) => s.appointmentId === id);

  const thread = threads.find((t) => t.appointmentId === id);
  const linkedRx = prescriptions.find((rx) => rx.consultationId === id) ?? (summary?.prescriptionId ? prescriptions.find((rx) => rx.id === summary!.prescriptionId) : undefined);

  // Le compte-rendu est généré par le serveur dès la clôture de la consultation
  // (raccrochage vidéo ou fin de fil) : il n'y a plus de génération manuelle à
  // proposer — la poussée temps réel livre le résultat, « Réessayer » relit
  // l'état serveur si elle a été manquée.
  const retry = async () => {
    setRetrying(true);
    try {
      await refresh();
    } catch {
      show('Actualisation impossible.', 'error');
    } finally {
      setRetrying(false);
    }
  };

  if (!summary) {
    const closed = appointment?.status === 'completed' || thread?.status === 'ended';
    if (!closed) {
      return (
        <Screen title="Résumé de consultation" onBack={() => router.back()}>
          <EmptyState icon="sparkles" title="Aucun résumé disponible" message="Ce résumé sera disponible après une consultation vidéo ou par chat." />
        </Screen>
      );
    }
    return (
      <Screen title="Résumé de consultation" onBack={() => router.back()}>
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl, marginTop: spacing.s }}>
          <View style={styles.aiBadge}>
            <ActivityIndicator color={colors.ai} />
          </View>
          <Text style={styles.genTitle}>Résumé en cours de génération</Text>
          <Text style={styles.genText}>
            La consultation est terminée : le compte-rendu est rédigé automatiquement à partir des informations échangées
            et s’affichera ici dans quelques instants.
          </Text>
          <Button
            title="Réessayer"
            icon="refresh"
            variant="outline"
            loading={retrying}
            onPress={retry}
            style={{ marginTop: spacing.l }}
          />
        </Card>
      </Screen>
    );
  }

  const s = summary;

  return (
    <Screen onBack={() => router.back()} right={<Badge label="Généré par IA" variant="purple" icon={<Ionicons name="sparkles" size={11} color={colors.ai} />} />}>
      <View style={styles.headerCard}>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={22} color={colors.ai} />
        </View>
        <Text style={styles.title}>Résumé de la consultation</Text>
        <Text style={styles.subtitle}>
          {s.doctorName} • {s.doctorSpecialty}
        </Text>
        <Text style={styles.meta}>
          {dayLabel(s.date)} • Résumé généré automatiquement à {s.generatedAt}
        </Text>
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={16} color={colors.ai} />
        <Text style={styles.disclaimerText}>
          Ce résumé est généré automatiquement pour vous aider à organiser les informations de la consultation. Il ne
          constitue pas un diagnostic médical et ne remplace pas l’avis de votre médecin.
        </Text>
      </View>

      <Section title="Motif">
        <Text style={styles.body}>{s.motif}</Text>
      </Section>

      <Section title="Symptômes évoqués">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {s.symptoms.map((sym) => (
            <View key={sym} style={styles.symptomChip}>
              <Text style={styles.symptomText}>{sym}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Informations importantes">
        {s.importantInfo.map((i) => (
          <Bullet key={i} icon="flag" text={i} />
        ))}
      </Section>

      <Section title="Observations du médecin">
        <Text style={styles.body}>{s.observations}</Text>
      </Section>

      {/* The API only attaches aiDiagnostic to doctor sessions — patients never
          receive the hypothesis/differentials block. */}
      {s.aiDiagnostic && (
        <Section title="Diagnostic (IA) — réservé au médecin">
          <View style={styles.diagBox}>
            <View style={styles.diagRow}>
              <Ionicons name="sparkles" size={14} color={colors.ai} />
              <Text style={styles.diagLabel}>Hypothèse principale</Text>
            </View>
            <Text style={styles.body}>{s.aiDiagnostic.hypothesis}</Text>
            {s.aiDiagnostic.differentials.length > 0 && (
              <>
                <View style={styles.diagRow}>
                  <Ionicons name="git-network" size={14} color={colors.ai} />
                  <Text style={styles.diagLabel}>Diagnostics différentiels</Text>
                </View>
                {s.aiDiagnostic.differentials.map((d) => (
                  <Bullet key={d} icon="list" text={d} />
                ))}
              </>
            )}
            <View style={{ flexDirection: 'row', gap: spacing.s, marginTop: 6 }}>
              {s.aiDiagnostic.severity ? (
                <View style={styles.diagNote}>
                  <Text style={styles.diagNoteLabel}>Sévérité</Text>
                  <Text style={styles.diagNoteText}>{s.aiDiagnostic.severity}</Text>
                </View>
              ) : null}
              {s.aiDiagnostic.followUp ? (
                <View style={styles.diagNote}>
                  <Text style={styles.diagNoteLabel}>Suivi</Text>
                  <Text style={styles.diagNoteText}>{s.aiDiagnostic.followUp}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Section>
      )}

      <Section title="Recommandations">
        {s.recommendations.map((r) => (
          <Bullet key={r} icon="checkmark-circle" text={r} />
        ))}
      </Section>

      {s.treatments.length > 0 && (
        <Section title="Traitement prescrit">
          {s.treatments.map((t, i) => (
            <View key={i} style={styles.treatmentRow}>
              <Ionicons name="medkit" size={16} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.treatmentName}>{t.name}</Text>
                <Text style={styles.treatmentSub}>
                  {t.dosage} • {t.frequency} • {t.duration}
                </Text>
              </View>
            </View>
          ))}
        </Section>
      )}

      {s.exams.length > 0 && (
        <Section title="Examens recommandés">
          {s.exams.map((e) => (
            <Bullet key={e} icon="flask" text={e} />
          ))}
        </Section>
      )}

      <Section title="Prochaines étapes">
        {s.nextSteps.map((n) => (
          <Bullet key={n} icon="arrow-forward-circle" text={n} />
        ))}
      </Section>

      {s.documents.length > 0 && (
        <Section title="Documents associés">
          {s.documents.map((d) => (
            <View key={d.name} style={styles.docRow}>
              <Ionicons name="document-text" size={16} color={colors.primary} />
              <Text style={[styles.docText, { flex: 1 }]}>{d.name}</Text>
              <Badge label={d.type} variant="primary" size="sm" />
            </View>
          ))}
        </Section>
      )}

      <View style={{ marginTop: spacing.l, gap: spacing.s }}>
        {linkedRx && (
          <Button
            title="Voir l’ordonnance du médecin"
            icon="document-text"
            onPress={() => router.push(`/prescriptions/${linkedRx.id}`)}
            size="lg"
            fullWidth
          />
        )}
        {thread && (
          <Button title="Retourner à la consultation" icon="chatbubbles" variant="soft" onPress={() => router.push(`/consultation/chat/${thread.id}`)} fullWidth />
        )}
        <Button title="Contacter le médecin" icon="chatbubble-ellipses" variant="outline" onPress={() => show('Votre message sera transmis au médecin (simulation).', 'info')} fullWidth />
        <Button title="Partager / télécharger le résumé" icon="share-social" variant="ghost" onPress={() => show('Résumé partagé (simulation).')} fullWidth />
      </View>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.l }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={{ marginTop: spacing.s }}>{children}</Card>
    </View>
  );
}

function Bullet({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.bullet}>
      <Ionicons name={icon} size={15} color={colors.primary} style={{ marginTop: 2 }} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: colors.aiSoft,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#DCD0F7',
    padding: spacing.l,
    alignItems: 'center',
    marginTop: spacing.s,
  },
  aiBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: font.size.xl, fontWeight: '800', color: '#3D2373', marginTop: spacing.m, textAlign: 'center' },
  subtitle: { fontSize: font.size.sm, color: '#7A5FB5', marginTop: 4, fontWeight: '600' },
  meta: { fontSize: font.size.xs, color: '#9B87C9', marginTop: 3 },
  disclaimer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#DCD0F7',
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.s,
  },
  disclaimerText: { flex: 1, fontSize: font.size.xs, color: colors.textMuted, lineHeight: 17 },
  sectionTitle: { fontSize: font.size.base, fontWeight: '800', color: colors.text },
  body: { fontSize: font.size.sm, color: colors.text, lineHeight: 21 },
  diagBox: { backgroundColor: colors.aiSoft, borderRadius: radii.m, borderWidth: 1, borderColor: '#DCD0F7', padding: spacing.m },
  diagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginTop: 6 },
  diagLabel: { fontSize: font.size.sm, fontWeight: '800', color: '#3D2373' },
  diagNote: { flex: 1, backgroundColor: colors.white, borderRadius: radii.m, borderWidth: 1, borderColor: '#DCD0F7', padding: spacing.s },
  diagNoteLabel: { fontSize: font.size.xs, fontWeight: '800', color: colors.ai, marginBottom: 2 },
  diagNoteText: { fontSize: font.size.xs, color: colors.text, lineHeight: 17 },
  bullet: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  bulletText: { flex: 1, fontSize: font.size.sm, color: colors.text, lineHeight: 20 },
  symptomChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  symptomText: { fontSize: font.size.xs, color: colors.primaryDark, fontWeight: '600' },
  treatmentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  treatmentName: { fontSize: font.size.sm, fontWeight: '700', color: colors.text },
  treatmentSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  docText: { fontSize: font.size.sm, color: colors.text, flex: 1 },
  genTitle: { fontSize: font.size.lg, fontWeight: '800', color: colors.text, marginTop: spacing.m, textAlign: 'center' },
  genText: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.s, lineHeight: 21, paddingHorizontal: spacing.xs },
});
