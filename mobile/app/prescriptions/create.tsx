import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Badge, BottomSheet, Button, Card, Chip, Input, Screen, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { useAsync } from '@/hooks/useAsync';
import { doctorWorkspaceService } from '@/services';
import { nowTime } from '@/utils/format';
import { PrescriptionLine } from '@/models/types';

const forms = ['comprimé', 'gélule', 'sirop', 'injection', 'pommade', 'sachet', 'collyre'];
const frequencies = ['1 fois par jour', '2 fois par jour', '3 fois par jour', 'Toutes les 8 heures', 'Si douleur', 'Au besoin'];
const durations = ['3 jours', '5 jours', '7 jours', '10 jours', '1 mois', '3 mois'];

export default function CreatePrescription() {
  const { patientId, appointmentId, editId } = useLocalSearchParams<{
    patientId?: string;
    appointmentId?: string;
    editId?: string;
  }>();
  const { prescriptions, addPrescription, updatePrescription, threads, addMessage } = useAppData();
  const { show } = useToast();
  const { data: filesData } = useAsync(() => doctorWorkspaceService.patients(), []);

  const editing = editId ? prescriptions.find((p) => p.id === editId) : undefined;
  const files = filesData ?? [];
  const patient = files.find((p) => p.id === (editing?.patientId ?? patientId)) ?? files[0];

  const [lines, setLines] = useState<PrescriptionLine[]>(editing?.lines ?? []);
  const [instructions, setInstructions] = useState(editing?.instructions ?? '');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<PrescriptionLine>({
    name: '', dosage: '', form: 'comprimé', quantity: '', frequency: '1 fois par jour', duration: '5 jours', instructions: '',
  });

  const openNew = () => {
    setEditingIndex(null);
    setDraft({ name: '', dosage: '', form: 'comprimé', quantity: '', frequency: '1 fois par jour', duration: '5 jours', instructions: '' });
    setSheetVisible(true);
  };

  const openEdit = (i: number) => {
    setEditingIndex(i);
    setDraft(lines[i]);
    setSheetVisible(true);
  };

  const saveLine = () => {
    if (!draft.name.trim()) {
      show('Le nom du médicament est requis.', 'error');
      return;
    }
    if (editingIndex !== null) {
      setLines((cur) => cur.map((l, i) => (i === editingIndex ? draft : l)));
    } else {
      setLines((cur) => [...cur, draft]);
    }
    setSheetVisible(false);
  };

  const save = async () => {
    if (lines.length === 0) {
      show('Ajoutez au moins un médicament à l’ordonnance.', 'error');
      return;
    }
    if (editing) {
      await updatePrescription(editing.id, { lines, instructions });
      show('Ordonnance mise à jour.');
      router.back();
      return;
    }
    if (!patient) return;
    try {
      // The server issues the code, expiry and status; the returned
      // prescription carries the real id.
      const created = await addPrescription({
        id: '',
        code: '',
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorId: 'd1',
        doctorName: 'Dr Vanessa Mbarga',
        doctorSpecialty: 'Médecine générale',
        establishment: 'Centre Médical de Bastos',
        date: new Date().toISOString().slice(0, 10),
        expiryDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        source: 'aura',
        lines,
        instructions,
        consultationId: appointmentId,
      });
      const thread = threads.find((t) => t.appointmentId === appointmentId);
      if (thread) {
        await addMessage(thread.id, {
          sender: 'doctor',
          kind: 'text',
          text: 'J’ai ajouté votre ordonnance à votre dossier médical. Vous pouvez la retrouver dans « Mes ordonnances ».',
          time: nowTime(),
        });
      }
      show('Ordonnance créée et jointe au dossier du patient.');
      if (appointmentId) router.replace(`/appointment/${appointmentId}`);
      else router.back();
      void created;
    } catch (err) {
      show(err instanceof Error ? err.message : 'Création impossible.', 'error');
    }
  };

  return (
    <Screen
      title={editing ? 'Modifier l’ordonnance' : 'Créer une ordonnance'}
      onBack={() => router.back()}
      subtitle={patient ? `${patient.firstName} ${patient.lastName} • ${patient.age} ans • ${patient.bloodType}` : 'Chargement du dossier…'}
    >
      {!patient ? (
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <Text style={styles.emptyLines}>Dossier patient indisponible.</Text>
        </Card>
      ) : (
      <Card style={{ marginBottom: spacing.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
          <Avatar name={`${patient.firstName} ${patient.lastName}`} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{patient.firstName} {patient.lastName}</Text>
            <Text style={styles.patientSub}>{patient.city} • {patient.phone}</Text>
          </View>
          {patient.allergies.length > 0 && <Badge label="Allergies" variant="danger" size="sm" />}
        </View>
        {patient.allergies.length > 0 && (
          <View style={styles.allergyBanner}>
            <Ionicons name="warning" size={13} color={colors.danger} />
            <Text style={styles.allergyText}>Allergies : {patient.allergies.join(' · ')}</Text>
          </View>
        )}
      </Card>
      )}

      <Text style={styles.sectionTitle}>Médicaments ({lines.length})</Text>
      {lines.length === 0 && (
        <Card style={{ alignItems: 'center', paddingVertical: spacing.l }}>
          <Ionicons name="add-circle" size={30} color={colors.primary} />
          <Text style={styles.emptyLines}>Aucun médicament ajouté</Text>
          <Text style={styles.emptyLinesSub}>Ajoutez les médicaments prescrits avec leur posologie.</Text>
        </Card>
      )}
      {lines.map((line, i) => (
        <Pressable key={i} onPress={() => openEdit(i)} style={styles.lineRow}>
          <View style={styles.lineNum}>
            <Text style={styles.lineNumText}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lineName}>{line.name}</Text>
            <Text style={styles.lineSub}>
              {line.dosage} • {line.form} • {line.quantity}
            </Text>
            <Text style={styles.lineSub}>
              {line.frequency} • {line.duration}
            </Text>
          </View>
          <Ionicons name="pencil" size={15} color={colors.textFaint} />
        </Pressable>
      ))}

      <Button title="+ Ajouter un médicament" icon="add" variant="soft" onPress={openNew} fullWidth style={{ marginTop: spacing.s }} />

      <Text style={[styles.sectionTitle, { marginTop: spacing.l }]}>Consignes générales</Text>
      <Input
        placeholder="Recommandations au patient, contrôle, hygiène de vie…"
        value={instructions}
        onChangeText={setInstructions}
        multiline
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Button
        title={editing ? 'Enregistrer les modifications' : 'Délivrer l’ordonnance'}
        icon="checkmark"
        size="lg"
        fullWidth
        style={{ marginTop: spacing.m }}
        onPress={save}
      />
      <Text style={styles.hint}>
        {appointmentId ? 'L’ordonnance sera jointe à la consultation et au dossier médical du patient.' : 'L’ordonnance sera ajoutée au dossier médical du patient.'}
      </Text>

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title={editingIndex !== null ? 'Modifier le médicament' : 'Ajouter un médicament'} height="88%">
        <Input label="Nom du médicament *" placeholder="ex. Amoxicilline" value={draft.name} onChangeText={(v) => setDraft({ ...draft, name: v })} />
        <View style={{ flexDirection: 'row', gap: spacing.s }}>
          <View style={{ flex: 1 }}>
            <Input label="Dosage" placeholder="500 mg" value={draft.dosage} onChangeText={(v) => setDraft({ ...draft, dosage: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Quantité" placeholder="21 gélules" value={draft.quantity} onChangeText={(v) => setDraft({ ...draft, quantity: v })} />
          </View>
        </View>
        <Text style={styles.fieldLabel}>Forme</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.m }}>
          {forms.map((f) => (
            <Chip key={f} label={f} selected={draft.form === f} onPress={() => setDraft({ ...draft, form: f })} />
          ))}
        </View>
        <Text style={styles.fieldLabel}>Fréquence</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.m }}>
          {frequencies.map((f) => (
            <Chip key={f} label={f} selected={draft.frequency === f} onPress={() => setDraft({ ...draft, frequency: f })} />
          ))}
        </View>
        <Text style={styles.fieldLabel}>Durée</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.m }}>
          {durations.map((f) => (
            <Chip key={f} label={f} selected={draft.duration === f} onPress={() => setDraft({ ...draft, duration: f })} />
          ))}
        </View>
        <Input
          label="Instructions particulières"
          placeholder="ex. à prendre au cours du repas"
          value={draft.instructions ?? ''}
          onChangeText={(v) => setDraft({ ...draft, instructions: v })}
        />
        <Button title={editingIndex !== null ? 'Enregistrer' : 'Ajouter le médicament'} onPress={saveLine} fullWidth size="lg" style={{ marginTop: spacing.s }} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  patientName: { fontSize: font.size.base, fontWeight: '800', color: colors.text },
  patientSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  allergyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.s,
    padding: 9,
    marginTop: spacing.m,
  },
  allergyText: { flex: 1, fontSize: font.size.xs, color: colors.danger, fontWeight: '600' },
  sectionTitle: { fontSize: font.size.base, fontWeight: '800', color: colors.text, marginBottom: spacing.s },
  emptyLines: { fontSize: font.size.base, fontWeight: '700', color: colors.text, marginTop: spacing.s },
  emptyLinesSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 3 },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  lineNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineNumText: { fontSize: font.size.xs, fontWeight: '800', color: colors.primaryDark },
  lineName: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  lineSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
  fieldLabel: { fontSize: font.size.sm, fontWeight: '600', color: colors.text, marginBottom: 7 },
  hint: { fontSize: font.size.xs, color: colors.textFaint, textAlign: 'center', marginTop: spacing.s, lineHeight: 16 },
});
