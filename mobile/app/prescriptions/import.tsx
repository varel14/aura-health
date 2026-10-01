import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, Input, Screen, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { todayISO } from '@/utils/format';
import { PrescriptionLine } from '@/models/types';

type Phase = 'source' | 'analyzing' | 'verify' | 'done';

export default function ImportPrescription() {
  const { addPrescription } = useAppData();
  const { show } = useToast();
  const [phase, setPhase] = useState<Phase>('source');
  const [source, setSource] = useState('');
  const [doctorName, setDoctorName] = useState('Dr Emmanuel Fouda');
  const [establishment, setEstablishment] = useState('Cabinet médical de Nlongkak');
  const [date, setDate] = useState(todayISO(-3));
  const [lines, setLines] = useState<PrescriptionLine[]>([
    {
      name: 'Ciprofloxacine',
      dosage: '500 mg',
      form: 'comprimé',
      quantity: '10 comprimés',
      frequency: '1 comprimé 2 fois par jour',
      duration: '5 jours',
    },
    {
      name: 'Paracétamol',
      dosage: '500 mg',
      form: 'comprimé',
      quantity: '9 comprimés',
      frequency: '1 comprimé 3 fois par jour si douleur',
      duration: '3 jours',
    },
  ]);
  const [instructions, setInstructions] = useState('À prendre pendant les repas. Boire abondamment.');
  const [savedId, setSavedId] = useState('');

  const startSource = (kind: string) => {
    setSource(kind);
    setPhase('analyzing');
    setTimeout(() => setPhase('verify'), 2400);
  };

  const updateLine = (i: number, patch: Partial<PrescriptionLine>) =>
    setLines((cur) => cur.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const removeLine = (i: number) => setLines((cur) => cur.filter((_, idx) => idx !== i));

  const addLine = () =>
    setLines((cur) => [
      ...cur,
      { name: '', dosage: '', form: 'comprimé', quantity: '', frequency: '', duration: '' },
    ]);

  const save = async () => {
    try {
      // The server issues the code/expiry, computes the status and files the
      // document + notification automatically.
      const created = await addPrescription({
        id: '',
        code: '',
        patientId: 'p1',
        patientName: '',
        doctorId: '',
        doctorName,
        doctorSpecialty: '',
        establishment,
        date,
        expiryDate: date,
        status: 'active',
        source: 'imported',
        lines: lines.filter((l) => l.name.trim()),
        instructions,
      });
      setSavedId(created.id);
      setPhase('done');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Import impossible.', 'error');
    }
  };

  if (phase === 'source') {
    return (
      <Screen title="Ajouter une ordonnance" onBack={() => router.back()} subtitle="Vous avez reçu une ordonnance en dehors d’AuraHealth ? Importez-la pour la conserver dans votre dossier et commander vos médicaments.">
        <Pressable style={styles.source} onPress={() => startSource('photo')}>
          <View style={[styles.sourceIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="camera" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sourceTitle}>Prendre une photo</Text>
            <Text style={styles.sourceSub}>Photographiez l’ordonnance en plein jour, bien à plat.</Text>
          </View>
        </Pressable>
        <Pressable style={styles.source} onPress={() => startSource('galerie')}>
          <View style={[styles.sourceIcon, { backgroundColor: colors.infoSoft }]}>
            <Ionicons name="images" size={24} color={colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sourceTitle}>Importer depuis la galerie</Text>
            <Text style={styles.sourceSub}>Choisissez une image déjà enregistrée.</Text>
          </View>
        </Pressable>
        <Pressable style={styles.source} onPress={() => startSource('document')}>
          <View style={[styles.sourceIcon, { backgroundColor: colors.warningSoft }]}>
            <Ionicons name="folder-open" size={24} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sourceTitle}>Importer un document</Text>
            <Text style={styles.sourceSub}>PDF ou image depuis vos fichiers.</Text>
          </View>
        </Pressable>
        <View style={styles.notice}>
          <Ionicons name="lock-closed" size={15} color={colors.primary} />
          <Text style={styles.noticeText}>Vos documents sont chiffrés et visibles uniquement par vous et vos médecins.</Text>
        </View>
      </Screen>
    );
  }

  if (phase === 'analyzing') {
    return (
      <Screen title="Analyse de votre ordonnance…">
        <View style={{ alignItems: 'center', paddingTop: 110 }}>
          <View style={styles.scanFrame}>
            <View style={styles.scanLine} />
            <Ionicons name="document-text" size={54} color={colors.primary} />
          </View>
          <Text style={styles.scanTitle}>Analyse de votre ordonnance…</Text>
          <Text style={styles.scanSub}>Extraction du médecin, des médicaments et des posologies ({source}).</Text>
          <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl, marginTop: spacing.xl, gap: spacing.m }}>
            {['Lecture du document', 'Détection du prescripteur', 'Extraction des médicaments'].map((s) => (
              <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sync" size={15} color={colors.primary} />
                <Text style={styles.scanStep}>{s}…</Text>
              </View>
            ))}
          </View>
        </View>
      </Screen>
    );
  }

  if (phase === 'done') {
    return (
      <Screen>
        <View style={{ alignItems: 'center', paddingTop: 110 }}>
          <View style={[styles.scanFrame, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
            <Ionicons name="checkmark" size={54} color={colors.success} />
          </View>
          <Text style={styles.scanTitle}>Ordonnance enregistrée</Text>
          <Text style={styles.scanSub}>
            Votre ordonnance importée a été ajoutée à votre dossier. Vous pouvez maintenant commander vos médicaments.
          </Text>
          <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.l, marginTop: spacing.xl, gap: spacing.s }}>
            <Button title="Voir l’ordonnance" onPress={() => router.replace(`/prescriptions/${savedId}`)} size="lg" fullWidth />
            <Button title="Commander les médicaments" icon="cart" variant="soft" onPress={() => router.replace('/medications')} fullWidth />
            <Button title="Retour à mes ordonnances" variant="ghost" onPress={() => router.replace('/prescriptions')} fullWidth />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Vérifier les informations" onBack={() => setPhase('source')} subtitle="Vérifiez et corrigez les informations détectées avant d’enregistrer.">
      <Card>
        <Input label="Médecin prescripteur" value={doctorName} onChangeText={setDoctorName} leftIcon="medkit" />
        <Input label="Établissement / cabinet" value={establishment} onChangeText={setEstablishment} leftIcon="business" />
        <Input label="Date de prescription (AAAA-MM-JJ)" value={date} onChangeText={setDate} leftIcon="calendar" keyboardType="numbers-and-punctuation" />
      </Card>

      <Text style={styles.linesTitle}>Médicaments détectés ({lines.length})</Text>
      {lines.map((line, i) => (
        <Card key={i} style={{ marginBottom: spacing.s }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.s }}>
            <Text style={styles.lineBadge}>Médicament {i + 1}</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => removeLine(i)} hitSlop={8}>
              <Ionicons name="trash" size={17} color={colors.danger} />
            </Pressable>
          </View>
          <Input label="Nom" value={line.name} onChangeText={(v) => updateLine(i, { name: v })} placeholder="Nom du médicament" />
          <View style={{ flexDirection: 'row', gap: spacing.s }}>
            <View style={{ flex: 1 }}>
              <Input label="Dosage" value={line.dosage} onChangeText={(v) => updateLine(i, { dosage: v })} placeholder="500 mg" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Forme" value={line.form} onChangeText={(v) => updateLine(i, { form: v })} placeholder="comprimé" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.s }}>
            <View style={{ flex: 1 }}>
              <Input label="Quantité" value={line.quantity} onChangeText={(v) => updateLine(i, { quantity: v })} placeholder="10 comprimés" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Durée" value={line.duration} onChangeText={(v) => updateLine(i, { duration: v })} placeholder="5 jours" />
            </View>
          </View>
          <Input label="Fréquence" value={line.frequency} onChangeText={(v) => updateLine(i, { frequency: v })} placeholder="1 comprimé 2 fois par jour" />
        </Card>
      ))}
      <Button title="+ Ajouter un médicament" variant="outline" onPress={addLine} fullWidth style={{ marginBottom: spacing.m }} />

      <Input label="Consignes médicales" value={instructions} onChangeText={setInstructions} multiline style={{ height: 70, textAlignVertical: 'top' }} />

      <Button
        title="Enregistrer l’ordonnance"
        icon="checkmark"
        size="lg"
        fullWidth
        style={{ marginTop: spacing.m }}
        onPress={save}
      />
      <Text style={styles.disclaimer}>
        Cette ordonnance sera marquée « Ordonnance importée » pour la distinguer de celles délivrées sur AuraHealth.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.l,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  sourceIcon: { width: 52, height: 52, borderRadius: radii.l, alignItems: 'center', justifyContent: 'center' },
  sourceTitle: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  sourceSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.m,
  },
  noticeText: { flex: 1, fontSize: font.size.xs, color: colors.primaryDark, lineHeight: 17 },
  scanFrame: {
    width: 150,
    height: 170,
    borderRadius: radii.l,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 40,
    height: 3,
    backgroundColor: colors.ai,
    opacity: 0.8,
  },
  scanTitle: { fontSize: font.size.xl, fontWeight: '800', color: colors.text, marginTop: spacing.l },
  scanSub: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: spacing.xl },
  scanStep: { fontSize: font.size.sm, color: colors.text, fontWeight: '500' },
  linesTitle: { fontSize: font.size.base, fontWeight: '800', color: colors.text, marginVertical: spacing.m },
  lineBadge: {
    fontSize: font.size.xs,
    fontWeight: '800',
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  disclaimer: { fontSize: font.size.xs, color: colors.textFaint, textAlign: 'center', marginTop: spacing.m, lineHeight: 16 },
});
