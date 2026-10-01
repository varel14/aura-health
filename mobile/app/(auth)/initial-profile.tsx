import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Input, Screen, useToast } from '@/components/ui';
import { colors, font, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';

const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export default function InitialProfile() {
  const { updatePatient, patient } = useAppData();
  const { show } = useToast();
  const [city, setCity] = useState('Yaoundé');
  const [bloodType, setBloodType] = useState<string | null>(null);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // The account was created (and its session opened) by the register screen —
  // this step only completes the medical profile via PATCH /api/patient/me.
  const finish = async () => {
    setSaving(true);
    try {
      await updatePatient({
        city: city.trim() || 'Yaoundé',
        bloodType: bloodType ?? undefined,
        emergencyContact: emergencyName
          ? { name: emergencyName, phone: emergencyPhone, relation: 'Contact d’urgence' }
          : undefined,
      });
      router.replace('/(patient)');
      show(`Bienvenue sur AuraHealth, ${patient.firstName} 👋`);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Enregistrement impossible.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="Profil initial" onBack={() => router.back()} large subtitle="Ces informations aident les médecins à mieux vous prendre en charge. Vous pourrez les compléter à tout moment.">
        <Input label="Ville" placeholder="Yaoundé, Douala…" leftIcon="location" value={city} onChangeText={setCity} />
        <Text style={styles.label}>Groupe sanguin (facultatif)</Text>
        <View style={styles.chipsRow}>
          {bloodTypes.map((bt) => (
            <Chip key={bt} label={bt} selected={bloodType === bt} onPress={() => setBloodType(bt)} />
          ))}
        </View>
        <Text style={styles.sectionLabel}>Contact d’urgence (facultatif)</Text>
        <Input label="Nom du contact" placeholder="Nom et prénom" value={emergencyName} onChangeText={setEmergencyName} />
        <Input label="Téléphone du contact" placeholder="+237 6XX XX XX XX" keyboardType="phone-pad" leftIcon="call" value={emergencyPhone} onChangeText={setEmergencyPhone} />
        <Button title="Terminer l’inscription" onPress={finish} loading={saving} fullWidth size="lg" style={{ marginTop: spacing.s }} />
        <Text style={styles.skipHint}>Vous pourrez compléter votre dossier médical plus tard.</Text>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.size.sm, fontWeight: '600', color: colors.text, marginBottom: 7 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginBottom: spacing.m },
  sectionLabel: { fontSize: font.size.base, fontWeight: '700', color: colors.text, marginTop: spacing.m, marginBottom: spacing.s },
  skipHint: { fontSize: font.size.xs, color: colors.textFaint, textAlign: 'center', marginTop: spacing.m },
});
