import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Input, useToast } from '@/components/ui';
import { colors, font, spacing } from '@/constants/theme';
import { Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';

export default function Register() {
  const { registerPatient, signingIn } = useAuth();
  const { show } = useToast();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [sex, setSex] = useState<'M' | 'F' | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!lastName.trim()) errs.lastName = 'Le nom est requis.';
    if (!firstName.trim()) errs.firstName = 'Le prénom est requis.';
    if (phone.replace(/\D/g, '').length < 9) errs.phone = 'Numéro de téléphone invalide.';
    if (!email.includes('@')) errs.email = 'Adresse e-mail invalide.';
    if (pin.length < 4) errs.pin = 'Le code PIN doit contenir au moins 4 chiffres.';
    if (!sex) errs.sex = 'Veuillez sélectionner votre sexe.';
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birthDate)) errs.birthDate = 'Format attendu : JJ/MM/AAAA.';
    setErrors(errs);
    if (Object.keys(errs).length || !sex) return;

    setLoading(true);
    try {
      // POST /api/auth/register — creates the account AND its session.
      // The « [id] » placeholder screen completes the medical profile.
      await registerPatient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        sex,
        birthDate: `${birthDate.slice(6, 10)}-${birthDate.slice(3, 5)}-${birthDate.slice(0, 2)}`,
        pin,
      });
      router.replace('/(auth)/initial-profile');
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Inscription impossible — réessayez.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="Créer un compte" onBack={() => router.back()} large subtitle="Quelques informations pour commencer. Vos données médicales seront complétées plus tard.">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flexDirection: 'row', gap: spacing.s }}>
            <View style={{ flex: 1 }}>
              <Input label="Nom" placeholder="Nkodo" value={lastName} onChangeText={setLastName} error={errors.lastName} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Prénom" placeholder="Stéphane" value={firstName} onChangeText={setFirstName} error={errors.firstName} />
            </View>
          </View>
          <Input label="Téléphone" placeholder="+237 6XX XX XX XX" keyboardType="phone-pad" leftIcon="call" value={phone} onChangeText={setPhone} error={errors.phone} />
          <Input label="E-mail" placeholder="vous@email.cm" keyboardType="email-address" autoCapitalize="none" leftIcon="mail" value={email} onChangeText={setEmail} error={errors.email} />
          <Input label="Code PIN" placeholder="Au moins 4 chiffres" password keyboardType="number-pad" leftIcon="lock-closed" value={pin} onChangeText={setPin} error={errors.pin} hint="Ce code vous sert à vous connecter." />

          <Text style={styles.label}>Sexe</Text>
          <View style={{ flexDirection: 'row', gap: spacing.s, marginBottom: spacing.m }}>
            <Chip label="Masculin" selected={sex === 'M'} onPress={() => setSex('M')} />
            <Chip label="Féminin" selected={sex === 'F'} onPress={() => setSex('F')} />
          </View>
          {errors.sex && <Text style={styles.errorText}>{errors.sex}</Text>}

          <Input
            label="Date de naissance"
            placeholder="JJ/MM/AAAA"
            keyboardType="number-pad"
            leftIcon="calendar"
            value={birthDate}
            onChangeText={setBirthDate}
            error={errors.birthDate}
          />

          <Button title="Créer mon compte" onPress={submit} loading={loading || signingIn} fullWidth size="lg" style={{ marginTop: spacing.s }} />
          <Text style={styles.terms}>
            En continuant, vous acceptez les Conditions d’utilisation et la Politique de confidentialité d’AuraHealth.
          </Text>
        </KeyboardAvoidingView>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.size.sm, fontWeight: '600', color: colors.text, marginBottom: 7 },
  errorText: { color: colors.danger, fontSize: font.size.xs, marginTop: -8, marginBottom: spacing.m },
  terms: { fontSize: font.size.xs, color: colors.textFaint, textAlign: 'center', lineHeight: 17, marginTop: spacing.m },
});
