import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Screen, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { ApiError, api } from '@/services/api';

type ForgotResponse = { ok: boolean; message: string; code?: string };

export default function ForgotPassword() {
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [demoCode, setDemoCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const submit = async () => {
    if (phone.replace(/\D/g, '').length < 9) {
      setError('Veuillez saisir le numéro de téléphone associé à votre compte.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // POST /api/auth/forgot-password {phone} — always 200 (no account
      // enumeration); the demo code is returned in place of the SMS.
      const res = await api<ForgotResponse>('/api/auth/forgot-password', {
        method: 'POST',
        body: { phone: phone.trim() },
        auth: false,
      });
      setDemoCode(res.code ?? '');
      setSent(true);
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Envoi impossible — réessayez.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Screen title="Code envoyé" onBack={() => router.back()}>
          <View style={styles.sentWrap}>
            <View style={styles.sentIcon}>
              <Ionicons name="mail" size={36} color={colors.primary} />
            </View>
            <Text style={styles.sentTitle}>Vérifiez vos messages</Text>
            <Text style={styles.sentText}>
              Nous venons d’envoyer un code de réinitialisation au {phone}. Ce code est valable pendant 10 minutes.
            </Text>
            {demoCode ? (
              <Text style={styles.demoCode}>Astuce démo : le code est {demoCode}.</Text>
            ) : null}
            <View style={{ alignSelf: 'stretch', marginTop: spacing.l, gap: spacing.s }}>
              <Button
                title="Saisir le code reçu"
                onPress={() => router.push({ pathname: '/(auth)/reset-password', params: { phone } })}
                fullWidth
                size="lg"
              />
              <Button title="Renvoyer le code" variant="outline" loading={loading} onPress={submit} fullWidth />
            </View>
          </View>
        </Screen>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="Code PIN oublié" onBack={() => router.back()}>
        <Text style={styles.help}>
          Saisissez le numéro de téléphone associé à votre compte. Nous vous enverrons un code de réinitialisation.
        </Text>
        <Input
          label="Téléphone"
          placeholder="+237 6XX XX XX XX"
          leftIcon="call"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          error={error}
        />
        <Button title="Envoyer le code" onPress={submit} loading={loading} fullWidth size="lg" />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  help: {
    fontSize: font.size.base,
    color: colors.textMuted,
    lineHeight: 22,
    marginTop: spacing.s,
    marginBottom: spacing.l,
  },
  sentWrap: { alignItems: 'center', paddingTop: spacing.xl },
  sentIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentTitle: { fontSize: font.size.xl, fontWeight: '800', color: colors.text, marginTop: spacing.l },
  sentText: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.s,
    lineHeight: 21,
    paddingHorizontal: spacing.m,
  },
  demoCode: { fontSize: font.size.sm, color: colors.primary, fontWeight: '700', marginTop: spacing.m },
});
