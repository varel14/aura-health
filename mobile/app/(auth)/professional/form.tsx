import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Screen, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { ApiError, api } from '@/services/api';

export default function ProfessionalForm() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const isPharmacy = type === 'pharmacy';
  const { show } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [manager, setManager] = useState('');
  const [docs, setDocs] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const addDoc = () => {
    const options = isPharmacy
      ? ['Agrément pharmaceutique', 'Registre de commerce', 'Carte CNI du responsable']
      : ['Agrément ministériel', 'Registre de commerce', 'Carte CNI du responsable'];
    const next = options.find((o) => !docs.includes(o));
    if (next) {
      setDocs([...docs, next]);
      show('Document joint.');
    }
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Le nom de l’établissement est requis.';
    if (phone.replace(/\D/g, '').length < 9) errs.phone = 'Numéro invalide.';
    if (!email.includes('@')) errs.email = 'E-mail invalide.';
    if (!city.trim()) errs.city = 'La ville est requise.';
    if (!manager.trim()) errs.manager = 'Le nom du responsable est requis.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      // POST /api/professionals/apply — files the application for admin review.
      await api('/api/professionals/apply', {
        method: 'POST',
        body: { type, name: name.trim(), phone: phone.trim(), email: email.trim(), city: city.trim(), address: address.trim(), manager: manager.trim(), documents: docs },
        auth: false,
      });
      router.replace('/(auth)/professional/pending');
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Envoi impossible — réessayez.', 'error');
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen
        title={isPharmacy ? 'Inscription pharmacie' : 'Inscription établissement'}
        onBack={() => router.back()}
        subtitle="Renseignez les informations de votre établissement. Vérification sous 48h."
      >
        <Input label="Nom de l’établissement" placeholder={isPharmacy ? 'Pharmacie du Centre' : 'Centre Médical de Bastos'} value={name} onChangeText={setName} error={errors.name} />
        <Input label="Téléphone" placeholder="+237 6XX XX XX XX" keyboardType="phone-pad" leftIcon="call" value={phone} onChangeText={setPhone} error={errors.phone} />
        <Input label="E-mail professionnel" placeholder="contact@etablissement.cm" keyboardType="email-address" autoCapitalize="none" leftIcon="mail" value={email} onChangeText={setEmail} error={errors.email} />
        <Input label="Ville" placeholder="Yaoundé" leftIcon="location" value={city} onChangeText={setCity} error={errors.city} />
        <Input label="Adresse" placeholder="Quartier, rue, repère" value={address} onChangeText={setAddress} />
        <Input label="Nom du responsable" placeholder="Dr / M. / Mme" value={manager} onChangeText={setManager} error={errors.manager} />

        <Text style={styles.section}>Documents justificatifs</Text>
        {docs.map((d) => (
          <View key={d} style={styles.docRow}>
            <Ionicons name="document-attach" size={18} color={colors.success} />
            <Text style={[styles.docText, { flex: 1 }]}>{d}</Text>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          </View>
        ))}
        <Pressable onPress={addDoc} style={styles.addDoc}>
          <Ionicons name="cloud-upload" size={20} color={colors.primary} />
          <Text style={styles.addDocText}>Joindre un document (PDF, photo)</Text>
        </Pressable>

        <Button
          title={submitting ? 'Envoi en cours…' : 'Envoyer la demande'}
          onPress={submit}
          loading={submitting}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.m }}
        />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: font.size.base, fontWeight: '700', color: colors.text, marginTop: spacing.s, marginBottom: spacing.s },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.successSoft,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  docText: { fontSize: font.size.sm, color: colors.success, fontWeight: '600', flex: 1 },
  addDoc: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radii.m,
    paddingVertical: spacing.m,
    marginBottom: spacing.s,
  },
  addDocText: { color: colors.primary, fontSize: font.size.sm, fontWeight: '600' },
});
