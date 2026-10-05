import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, Chip, Input, Screen, SectionHeader, useToast } from '@/components/ui';
import { DoctorRow } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { useAsync } from '@/hooks/useAsync';
import { doctorService } from '@/services';

const symptomOptions = [
  'Fièvre', 'Maux de tête', 'Toux', 'Mal de gorge', 'Douleurs abdominales', 'Nausées / vomissements',
  'Diarrhée', 'Vertiges', 'Fatigue', 'Courbatures', 'Essoufflement', 'Douleur thoracique',
  'Éruption cutanée', 'Douleurs articulaires', 'Insomnie', 'Anxiété', 'Perte d’appétit', 'Brûlures urinaires',
];
const durations = ["Depuis aujourd’hui", '2 à 3 jours', 'Environ une semaine', 'Plus de deux semaines', 'Plus d’un mois'];
const intensities = ['Légère', 'Modérée', 'Intense', 'Très intense'];
const evolutions = ['Cela s’améliore', 'Cela reste stable', 'Cela s’aggrave'];

type Phase = 'guide' | 'processing' | 'result';

export default function SymptomsGuide() {
  const { addSymptomPrep } = useAppData();
  const { show } = useToast();
  const [phase, setPhase] = useState<Phase>('guide');
  const [step, setStep] = useState(0);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('');
  const [evolution, setEvolution] = useState('');
  const [details, setDetails] = useState('');
  const [photoAttached, setPhotoAttached] = useState(false);
  const [result, setResult] = useState<{
    orientation: string;
    priority: 'faible' | 'modérée' | 'élevée';
    suggestedSpecialty?: string;
  } | null>(null);

  const guideSteps = ['Symptômes', 'Durée', 'Intensité', 'Évolution', 'Compléments'];
  const canContinue =
    step === 0 ? symptoms.length > 0 : step === 1 ? duration !== '' : step === 2 ? intensity !== '' : step === 3 ? evolution !== '' : true;

  const addCustom = () => {
    const v = custom.trim();
    if (v && !symptoms.includes(v)) setSymptoms([...symptoms, v]);
    setCustom('');
  };

  const submit = async () => {
    setPhase('processing');
    try {
      // The server runs the Groq analysis and returns the patient-safe result
      // (orientation + priority + specialty — the AI diagnostic is physician-only).
      const prep = await addSymptomPrep({
        symptoms,
        duration,
        intensity,
        evolution,
        details: details.trim() || undefined,
      });
      setResult({ orientation: prep.orientation, priority: prep.priority, suggestedSpecialty: prep.suggestedSpecialty });
      setPhase('result');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Analyse impossible pour le moment.', 'error');
      setPhase('guide');
    }
  };

  // Doctors of the AI-suggested specialty, offered for booking directly on
  // the result page. Idle (empty list) until an analysis has come back.
  const specialtyDoctors = useAsync(
    () => (result?.suggestedSpecialty ? doctorService.list({ specialty: result.suggestedSpecialty }) : Promise.resolve([])),
    [result?.suggestedSpecialty],
  );
  const suggestedDoctorsList = (specialtyDoctors.data ?? []).slice(0, 3);

  if (phase === 'processing') {
    return (
      <Screen>
        <View style={{ alignItems: 'center', paddingTop: 120 }}>
          <View style={styles.processIcon}>
            <Ionicons name="sparkles" size={34} color={colors.ai} />
          </View>
          <Text style={styles.processTitle}>Analyse de vos informations…</Text>
          <Text style={styles.processSub}>Structuration des symptômes et estimation de l’orientation.</Text>
          <View style={styles.processSteps}>
            {['Analyse des symptômes', 'Organisation des informations', 'Évaluation de l’orientation'].map((s, i) => (
              <View key={s} style={styles.processStep}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.processStepText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </Screen>
    );
  }

  if (phase === 'result' && result) {
    return (
      <Screen title="Synthèse de vos symptômes" onBack={() => router.back()}>
        <Card style={{ borderWidth: 1.5, borderColor: '#DCD0F7', backgroundColor: colors.aiSoft }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="sparkles" size={18} color={colors.ai} />
            <Text style={styles.resultLabel}>Orientation estimée par l’assistant</Text>
          </View>
          <Text style={styles.resultText}>{result.orientation}</Text>
          {result.suggestedSpecialty && (
            <View style={styles.specialtyRow}>
              <Ionicons name="medical" size={15} color={colors.ai} />
              <Text style={styles.specialtyText}>Spécialité conseillée : {result.suggestedSpecialty}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.m }}>
            <View style={[styles.priorityBadge, { backgroundColor: result.priority === 'élevée' ? colors.danger : result.priority === 'modérée' ? colors.warning : colors.success }]}>
              <Text style={styles.priorityText}>Priorité {result.priority}</Text>
            </View>
          </View>
        </Card>

        <Card style={{ marginTop: spacing.s }}>
          <Text style={styles.recapTitle}>Informations transmises</Text>
          <Text style={styles.recapLine}>Symptômes : {symptoms.join(', ')}</Text>
          <Text style={styles.recapLine}>Durée : {duration}</Text>
          <Text style={styles.recapLine}>Intensité : {intensity}</Text>
          <Text style={styles.recapLine}>Évolution : {evolution}</Text>
          {details ? <Text style={styles.recapLine}>Compléments : {details}</Text> : null}
          {photoAttached ? <Text style={styles.recapLine}>Photo jointe : 1</Text> : null}
        </Card>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={16} color={colors.ai} />
          <Text style={styles.disclaimerText}>
            Cette synthèse n’est pas un diagnostic médical. Elle aide simplement votre médecin à recevoir des
            informations structurées avant la consultation.
          </Text>
        </View>

        {result.suggestedSpecialty ? (
          <>
            <SectionHeader
              title={`Médecins — ${result.suggestedSpecialty}`}
              actionLabel="Tout voir"
              onAction={() =>
                router.push({ pathname: '/doctors', params: { specialty: result.suggestedSpecialty! } })
              }
              style={{ marginTop: spacing.l, marginBottom: spacing.s }}
            />
            {specialtyDoctors.loading ? (
              <ActivityIndicator color={colors.ai} style={{ paddingVertical: spacing.m }} />
            ) : suggestedDoctorsList.length > 0 ? (
              <View style={{ gap: spacing.s }}>
                {suggestedDoctorsList.map((d) => (
                  <DoctorRow
                    key={d.id}
                    doctor={d}
                    onPress={() => router.push(`/appointment/book?doctorId=${d.id}`)}
                  />
                ))}
              </View>
            ) : (
              <Button title="Prendre rendez-vous" icon="calendar" size="lg" onPress={() => router.push('/doctors')} fullWidth />
            )}
          </>
        ) : (
          <View style={{ marginTop: spacing.l }}>
            <Button title="Trouver un médecin" icon="search" size="lg" onPress={() => router.push('/doctors')} fullWidth />
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen title="Décrire mes symptômes" onBack={() => router.back()} subtitle="Cette information aide votre médecin à se préparer. Aucun diagnostic n’est fourni.">
      <View style={styles.progressRow}>
        {guideSteps.map((_, i) => (
          <View key={i} style={[styles.progressSeg, i <= step && styles.progressSegActive]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Étape {step + 1} sur {guideSteps.length} — {guideSteps[step]}
      </Text>

      {step === 0 && (
        <View>
          <Text style={styles.question}>Quels symptômes ressentez-vous ?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {symptomOptions.map((s) => (
              <Chip key={s} label={s} selected={symptoms.includes(s)} onPress={() => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.s, alignItems: 'flex-end', marginTop: spacing.m }}>
            <View style={{ flex: 1 }}>
              <Input label="Autre symptôme" placeholder="Préciser un symptôme…" value={custom} onChangeText={setCustom} />
            </View>
            <Button title="Ajouter" variant="soft" onPress={addCustom} style={{ marginBottom: 16 }} />
          </View>
        </View>
      )}

      {step === 1 && (
        <View>
          <Text style={styles.question}>Depuis combien de temps ressentez-vous ces symptômes ?</Text>
          {durations.map((d) => (
            <Pressable key={d} onPress={() => setDuration(d)} style={[styles.option, duration === d && styles.optionActive]}>
              <Ionicons name="time" size={17} color={duration === d ? colors.primary : colors.textMuted} />
              <Text style={[styles.optionText, duration === d && styles.optionTextActive, { flex: 1 }]}>{d}</Text>
              {duration === d && <Ionicons name="checkmark" size={17} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.question}>Comment évaluez-vous l’intensité de la gêne ?</Text>
          {intensities.map((d) => (
            <Pressable key={d} onPress={() => setIntensity(d)} style={[styles.option, intensity === d && styles.optionActive]}>
              <Ionicons name="pulse" size={17} color={intensity === d ? colors.primary : colors.textMuted} />
              <Text style={[styles.optionText, intensity === d && styles.optionTextActive, { flex: 1 }]}>{d}</Text>
              {intensity === d && <Ionicons name="checkmark" size={17} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.question}>Comment évolue votre état ?</Text>
          {evolutions.map((d) => (
            <Pressable key={d} onPress={() => setEvolution(d)} style={[styles.option, evolution === d && styles.optionActive]}>
              <Ionicons name="trending-up" size={17} color={evolution === d ? colors.primary : colors.textMuted} />
              <Text style={[styles.optionText, evolution === d && styles.optionTextActive, { flex: 1 }]}>{d}</Text>
              {evolution === d && <Ionicons name="checkmark" size={17} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      )}

      {step === 4 && (
        <View>
          <Text style={styles.question}>Informations complémentaires (facultatif)</Text>
          <Input
            placeholder="Traitements en cours, événements récents, questions…"
            value={details}
            onChangeText={setDetails}
            multiline
            style={{ height: 90, textAlignVertical: 'top' }}
          />
          <Pressable style={styles.photoAttach} onPress={() => setPhotoAttached((v) => !v)}>
            <Ionicons name={photoAttached ? 'checkmark-circle' : 'camera'} size={20} color={photoAttached ? colors.success : colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.s }}>
              <Text style={styles.photoTitle}>{photoAttached ? 'Photo jointe (simulation)' : 'Joindre une photo'}</Text>
              <Text style={styles.photoSub}>Éruption, plaie, résultat d’analyse…</Text>
            </View>
          </Pressable>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.s, marginTop: spacing.l }}>
        {step > 0 && (
          <View style={{ flex: 1 }}>
            <Button title="Retour" variant="outline" onPress={() => setStep(step - 1)} fullWidth />
          </View>
        )}
        <View style={{ flex: 2 }}>
          <Button
            title={step < guideSteps.length - 1 ? 'Continuer' : 'Envoyer pour analyse'}
            disabled={!canContinue}
            onPress={() => (step < guideSteps.length - 1 ? setStep(step + 1) : submit())}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', gap: 6, marginTop: spacing.s },
  progressSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.divider },
  progressSegActive: { backgroundColor: colors.ai },
  stepLabel: { fontSize: font.size.xs, color: colors.textMuted, marginTop: spacing.s, fontWeight: '600' },
  question: { fontSize: font.size.lg, fontWeight: '800', color: colors.text, marginVertical: spacing.m },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: '#F4FAF8' },
  optionText: { fontSize: font.size.base, color: colors.text, fontWeight: '500' },
  optionTextActive: { color: colors.primary, fontWeight: '700' },
  photoAttach: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.s,
  },
  photoTitle: { fontSize: font.size.sm, fontWeight: '700', color: colors.text },
  photoSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  processIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.aiSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processTitle: { fontSize: font.size.xl, fontWeight: '800', color: colors.text, marginTop: spacing.l },
  processSub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 6, textAlign: 'center', paddingHorizontal: spacing.xl },
  processSteps: { alignSelf: 'stretch', marginTop: spacing.xl, gap: spacing.m, paddingHorizontal: spacing.xl },
  processStep: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  processStepText: { fontSize: font.size.sm, color: colors.text, fontWeight: '500' },
  resultLabel: { fontSize: font.size.sm, fontWeight: '800', color: colors.ai },
  resultText: { fontSize: font.size.base, color: '#3D2373', fontWeight: '600', marginTop: spacing.s, lineHeight: 23 },
  specialtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.m },
  specialtyText: { fontSize: font.size.sm, fontWeight: '800', color: '#4C2889' },
  priorityBadge: { borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 7 },
  priorityText: { color: colors.white, fontSize: font.size.xs, fontWeight: '800', textTransform: 'uppercase' },
  recapTitle: { fontSize: font.size.base, fontWeight: '800', color: colors.text, marginBottom: 8 },
  recapLine: { fontSize: font.size.sm, color: colors.textMuted, lineHeight: 22 },
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
});
