import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, useToast } from '@/components/ui';
import { colors, font, spacing } from '@/constants/theme';
import { DEMO_ACCOUNTS, DEMO_PIN, useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import { Role } from '@/models/types';

const WORKSPACE_ROUTE: Record<Role, string> = {
  patient: '/(patient)',
  doctor: '/(doctor)',
  pharmacist: '/(pharmacy)',
  delivery: '/(delivery)',
  admin: '/(admin)',
};

const LABELS: Record<Role, string> = {
  patient: 'Espace patient',
  doctor: 'Espace médecin',
  pharmacist: 'Espace pharmacie',
  delivery: 'Espace livreur',
  admin: 'Espace administration',
};

export default function Login() {
  const { login, signingIn } = useAuth();
  const { show } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; pin?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const errs: typeof errors = {};
    if (!identifier.trim()) errs.identifier = 'Veuillez saisir votre e-mail ou votre numéro de téléphone.';
    if (!pin.trim()) errs.pin = 'Veuillez saisir votre code PIN.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      // Real sign-in: POST /api/auth/login {phone, pin}.
      const session = await login(identifier, pin);
      router.replace(WORKSPACE_ROUTE[session.role]);
      show(`Connexion réussie. Bonjour ${session.name} 👋`);
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Connexion impossible — réessayez.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /** One-tap demo access: same endpoint, same body {phone, pin}. */
  const demoSignIn = async (role: Role) => {
    setIdentifier(DEMO_ACCOUNTS[role]);
    setPin(DEMO_PIN);
    setErrors({});
    setLoading(true);
    try {
      const session = await login(DEMO_ACCOUNTS[role], DEMO_PIN);
      router.replace(WORKSPACE_ROUTE[session.role]);
      show(`${LABELS[role]} — Bonjour ${session.name} 👋`);
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Connexion impossible — vérifiez que le serveur tourne.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const prefill = (role: Role) => {
    setIdentifier(DEMO_ACCOUNTS[role]);
    setPin(DEMO_PIN);
    setErrors({});
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.logo}>
            <Ionicons name="pulse" size={30} color={colors.white} />
          </View>
          <Text style={styles.title}>Bonjour 👋</Text>
          <Text style={styles.subtitle}>Connectez-vous pour accéder à votre espace santé AuraHealth.</Text>

          <View style={{ marginTop: spacing.xl }}>
            <Input
              label="E-mail ou téléphone"
              placeholder="ex. stephane@email.cm ou +237 6…"
              leftIcon="person"
              keyboardType="email-address"
              autoCapitalize="none"
              value={identifier}
              onChangeText={setIdentifier}
              error={errors.identifier}
            />
            <Input
              label="Code PIN"
              placeholder="Votre code PIN (démo : 1234)"
              leftIcon="lock-closed"
              password
              keyboardType="number-pad"
              value={pin}
              onChangeText={setPin}
              error={errors.pin}
            />
            <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}>
              <Text style={styles.forgotText}>Code PIN oublié ?</Text>
            </Pressable>
            <Button title="Se connecter" onPress={submit} loading={loading || signingIn} fullWidth size="lg" />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.divider} />
          </View>

          <Button
            title="Essayer l’espace patient (démo)"
            icon="person"
            variant="soft"
            onPress={() => demoSignIn('patient')}
            loading={loading}
            fullWidth
          />
          <Button title="Essayer l’espace médecin (démo)" icon="medkit" variant="outline" onPress={() => demoSignIn('doctor')} loading={loading} fullWidth style={{ marginTop: spacing.s }} />
          <Button
            title="Essayer l’espace pharmacie (démo)"
            icon="cube"
            variant="outline"
            onPress={() => demoSignIn('pharmacist')}
            loading={loading}
            fullWidth
            style={{ marginTop: spacing.s }}
          />
          <Button
            title="Essayer l’espace livreur (démo)"
            icon="bicycle"
            variant="ghost"
            onPress={() => demoSignIn('delivery')}
            loading={loading}
            fullWidth
            style={{ marginTop: spacing.s }}
          />
          <Button
            title="Essayer l’espace admin (démo)"
            icon="shield-half"
            variant="ghost"
            onPress={() => demoSignIn('admin')}
            loading={loading}
            fullWidth
            style={{ marginTop: spacing.s }}
          />

          <Pressable onPress={() => prefill('patient')} style={styles.demoCredsWrap}>
            <Text style={styles.demoCreds}>
              Comptes démo (PIN {DEMO_PIN}) — patient {DEMO_ACCOUNTS.patient} • médecin {DEMO_ACCOUNTS.doctor}
            </Text>
            <Text style={styles.demoCreds}>
              pharmacie {DEMO_ACCOUNTS.pharmacist} • livreur {DEMO_ACCOUNTS.delivery} • admin {DEMO_ACCOUNTS.admin}
            </Text>
            <Text style={styles.demoCredsHint}>Appuyez pour pré-remplir le formulaire, puis « Se connecter ».</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              Pas encore de compte ? <Text style={styles.registerStrong}>Créer un compte patient</Text>
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/professional')} style={styles.proLink}>
            <Ionicons name="business" size={14} color={colors.textMuted} />
            <Text style={styles.proText}>
              Vous représentez un hôpital ou une pharmacie ? Créer un compte professionnel
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.l, paddingTop: spacing.xl + spacing.l },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  title: { fontSize: font.size.title, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.size.base, color: colors.textMuted, marginTop: 6, lineHeight: 22 },
  forgot: { alignSelf: 'flex-end', marginBottom: spacing.m, marginTop: -6 },
  forgotText: { color: colors.primary, fontSize: font.size.sm, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.l },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: spacing.m, color: colors.textFaint, fontSize: font.size.sm },
  demoCredsWrap: { alignItems: 'center', marginTop: spacing.l, paddingHorizontal: spacing.m },
  demoCreds: { textAlign: 'center', fontSize: font.size.xs, color: colors.textFaint, lineHeight: 16 },
  demoCredsHint: { textAlign: 'center', fontSize: font.size.xs, color: colors.primary, marginTop: 4, fontWeight: '600' },
  registerLink: { alignItems: 'center', marginTop: spacing.xl },
  registerText: { fontSize: font.size.sm, color: colors.textMuted },
  registerStrong: { color: colors.primary, fontWeight: '700' },
  proLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.m,
    paddingHorizontal: spacing.l,
  },
  proText: { fontSize: font.size.xs, color: colors.textMuted, flexShrink: 1, textAlign: 'center', lineHeight: 17 },
});
