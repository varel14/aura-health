import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, BottomSheet, Button, Card, ChoiceRow, ConfirmSheet, ErrorState, Input, Screen, SectionHeader, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { pharmacyCatalogService } from '@/services/pharmacyCatalog';
import { Medication, MedicationDraft } from '@/models/types';

const FORMS: Medication['form'][] = ['comprimé', 'comprimé effervescent', 'gélule', 'sirop', 'injection', 'pommade', 'sachet', 'solution'];

const emptyDraft: MedicationDraft = {
  name: '',
  form: 'comprimé',
  dosage: '',
  lab: '',
  category: '',
  description: '',
  requiresPrescription: false,
  unitPrice: 0,
  stock: 0,
};

export default function MedicationFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { show } = useToast();

  // Edit mode loads the pharmacy catalog and picks the reference from it.
  const existing = useAsync(
    () => (isNew ? Promise.resolve(null) : pharmacyCatalogService.list().then((list) => list.find((m) => m.id === id) ?? null)),
    [id, isNew],
  );
  const med = existing.data;

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState<Medication['form']>('comprimé');
  const [lab, setLab] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [price, setPrice] = useState('0');
  const [stock, setStock] = useState(0);

  const [formSheet, setFormSheet] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!med) return;
    setName(med.name);
    setDosage(med.dosage);
    setForm(med.form);
    setLab(med.lab);
    setCategory(med.category);
    setDescription(med.description);
    setRequiresPrescription(med.requiresPrescription);
    setPrice(String(med.unitPrice));
    setStock(med.stock);
  }, [med]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Le nom est requis (2 caractères min.)';
    if (!dosage.trim()) next.dosage = 'Le dosage est requis';
    const unitPrice = Number(price.replace(',', '.'));
    if (!Number.isFinite(unitPrice) || unitPrice < 0) next.price = 'Prix invalide';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const draft = useMemo<Omit<MedicationDraft, 'unitPrice'> & { unitPrice: number }>(
    () => ({
      name: name.trim(),
      form,
      dosage: dosage.trim(),
      lab: lab.trim(),
      category: category.trim(),
      description: description.trim(),
      requiresPrescription,
      unitPrice: Math.max(0, Math.round(Number(price.replace(',', '.')) || 0)),
      stock: Math.max(0, stock),
    }),
    [name, form, dosage, lab, category, description, requiresPrescription, price, stock],
  );

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      if (isNew) {
        await pharmacyCatalogService.create(draft);
        show('Médicament ajouté au catalogue');
      } else {
        await pharmacyCatalogService.update(id, draft);
        show('Médicament mis à jour');
      }
      router.replace('/(pharmacy)/catalog');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Enregistrement impossible', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await pharmacyCatalogService.remove(id);
      show('Médicament retiré du catalogue');
      router.replace('/(pharmacy)/catalog');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Suppression impossible', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={isNew ? 'Nouveau médicament' : 'Fiche médicament'} onBack={() => router.back()}>
      {existing.loading ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
      ) : existing.error || (!isNew && !med) ? (
        <ErrorState onRetry={existing.reload} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Card style={{ gap: spacing.s }}>
            <Input label="Nom du médicament *" placeholder="Ex. Paracétamol" value={name} onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })); }} error={errors.name || undefined} />
            <Input label="Dosage *" placeholder="Ex. 500 mg" value={dosage} onChangeText={(t) => { setDosage(t); setErrors((e) => ({ ...e, dosage: '' })); }} error={errors.dosage || undefined} />
            <Pressable onPress={() => setFormSheet(true)} style={styles.formPicker}>
              <Text style={styles.formPickerLabel}>Forme</Text>
              <View style={styles.formPickerValue}>
                <Text style={styles.formPickerText}>{form}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </View>
            </Pressable>
            <Input label="Laboratoire" placeholder="Ex. Pharmaco SA" value={lab} onChangeText={setLab} />
            <Input label="Catégorie" placeholder="Ex. Antalgique" value={category} onChangeText={setCategory} />
          </Card>

          <SectionHeader title="Prix & prescription" style={{ marginTop: spacing.m, marginBottom: spacing.s }} />
          <Card style={{ gap: spacing.s }}>
            <Input
              label="Prix unitaire (FCFA) *"
              placeholder="Ex. 500"
              value={price}
              onChangeText={(t) => { setPrice(t); setErrors((e) => ({ ...e, price: '' })); }}
              error={errors.price || undefined}
              keyboardType="numeric"
            />
            <Pressable style={styles.rxToggle} onPress={() => setRequiresPrescription((v) => !v)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rxToggleTitle}>Sur ordonnance</Text>
                <Text style={styles.rxToggleSub}>Une ordonnance valide sera exigée à la commande</Text>
              </View>
              <Ionicons name={requiresPrescription ? 'checkbox' : 'square-outline'} size={24} color={requiresPrescription ? colors.primary : colors.textFaint} />
            </Pressable>
          </Card>

          <SectionHeader title="Stock disponible" style={{ marginTop: spacing.m, marginBottom: spacing.s }} />
          <Card style={{ gap: spacing.s }}>
            <View style={styles.stepperRow}>
              <Pressable style={styles.stepButton} onPress={() => setStock((s) => Math.max(0, s - 10))}>
                <Text style={styles.stepText}>−10</Text>
              </Pressable>
              <Pressable style={styles.stepButton} onPress={() => setStock((s) => Math.max(0, s - 1))}>
                <Ionicons name="remove" size={20} color={colors.text} />
              </Pressable>
              <TextInput
                style={styles.stockInput}
                value={String(stock)}
                onChangeText={(t) => setStock(Math.max(0, Math.round(Number(t.replace(/\D/g, '')) || 0)))}
                keyboardType="numeric"
              />
              <Pressable style={styles.stepButton} onPress={() => setStock((s) => s + 1)}>
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
              <Pressable style={styles.stepButton} onPress={() => setStock((s) => s + 10)}>
                <Text style={styles.stepText}>+10</Text>
              </Pressable>
            </View>
            <View style={styles.stockHints}>
              {stock === 0 ? (
                <Badge label="Rupture de stock" variant="danger" size="sm" />
              ) : stock <= (med?.lowStockThreshold ?? 5) ? (
                <Badge label="Sous le seuil d’alerte" variant="warning" size="sm" />
              ) : (
                <Badge label="Stock confortable" variant="success" size="sm" />
              )}
              <Text style={styles.stockHint}>Alerte sous {(med?.lowStockThreshold ?? 5)} unités</Text>
            </View>
            {med ? (
              <Text style={styles.stockMeta}>Dernière mise à jour du stock à chaque remise client (retrait ou livraison).</Text>
            ) : null}
          </Card>

          <SectionHeader title="Description" style={{ marginTop: spacing.m, marginBottom: spacing.s }} />
          <Card>
            <Input
              label="Indications"
              placeholder="À quoi sert ce médicament ?"
              value={description}
              onChangeText={setDescription}
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </Card>

          <View style={{ marginTop: spacing.l, gap: spacing.s }}>
            <Button title={isNew ? 'Ajouter au catalogue' : 'Enregistrer les modifications'} icon="checkmark" size="lg" loading={busy} onPress={save} fullWidth />
            {!isNew && (
              <Button title="Retirer du catalogue" variant="outline" icon="trash-outline" disabled={busy} onPress={() => setConfirmRemove(true)} fullWidth />
            )}
          </View>
        </ScrollView>
      )}

      <BottomSheet visible={formSheet} onClose={() => setFormSheet(false)} title="Forme galénique">
        <ScrollView style={{ maxHeight: 380 }}>
          {FORMS.map((f) => (
            <ChoiceRow
              key={f}
              title={f}
              selected={form === f}
              onPress={() => {
                setForm(f);
                setFormSheet(false);
              }}
            />
          ))}
        </ScrollView>
      </BottomSheet>

      <ConfirmSheet
        visible={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={remove}
        title="Retirer ce médicament ?"
        message={`${name} ne sera plus disponible à la vente dans votre pharmacie. Les commandes en cours ne sont pas affectées.`}
        confirmLabel="Retirer"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  formPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: radii.m,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.m,
    marginBottom: spacing.m,
  },
  formPickerLabel: { fontSize: font.size.base, color: colors.text },
  formPickerValue: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  formPickerText: { fontSize: font.size.base, color: colors.textMuted },
  rxToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.xs },
  rxToggleTitle: { fontSize: font.size.base, fontWeight: '600', color: colors.text },
  rxToggleSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  stepButton: {
    width: 46,
    height: 46,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: font.size.sm, fontWeight: '700', color: colors.text },
  stockInput: {
    flex: 1,
    height: 46,
    textAlign: 'center',
    fontSize: font.size.xl,
    fontWeight: '800',
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.m,
    backgroundColor: colors.card,
  },
  stockHints: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s },
  stockHint: { fontSize: font.size.xs, color: colors.textMuted },
  stockMeta: { fontSize: font.size.xs, color: colors.textFaint, lineHeight: 16 },
});
