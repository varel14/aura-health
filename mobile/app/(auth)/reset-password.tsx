import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Screen, useToast } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { ApiError, api } from '@/services/api';

export default function ResetPassword() {
  const { phone: phoneParam } = useLocalSearchParams<{ phone?: string }>();
  const [phone, setPhone] = useState(phoneParam ?? '');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; code?: string; pin?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const submit = async () => {
    const errs: typeof errors = {};
    if (phone.replace(/\D/g, '').length < 9) errs.phone = 'Numéro de téléphone invalide.';
    if (!/^\d{6}$/.test(code.trim())) errs.code = 'Le code contient 6 chiffres.';
    if (pin.length < 4) errs.pin = 'Le code PIN doit contenir au moins 4 chiffres.';
    if (confirm !== pin) errs.confirm = 'Les codes PIN ne correspondent pas.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      // POST /api/auth/reset-password {phone, code, pin}.
      const res = await api<{ ok: boolean; message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: { phone: phone.trim(), code: code.trim(), pin },
        auth: false,
      });
      show(res.message || 'Code PIN réinitialisé. Connectez-vous avec votre nouveau code.');
      router.replace('/(auth)/login');
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Réinitialisation impossible — réessayez.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="Nouveau code PIN" onBack={() => router.back()}>
        <View style={{ marginTop: spacing.s }}>
          <Input
            label="Téléphone"
            placeholder="+237 6XX XX XX XX"
            keyboardType="phone-pad"
            leftIcon="call"
            value={phone}
            onChangeText={setPhone}
            error={errors.phone}
          />
          <Input
            label="Code reçu par SMS"
            placeholder="6 chiffres"
            keyboardType="number-pad"
            leftIcon="shield-checkmark"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            error={errors.code}
          />
          <Input
            label="Nouveau code PIN"
            placeholder="Au moins 4 chiffres"
            password
            keyboardType="number-pad"
            leftIcon="lock-closed"
            value={pin}
            onChangeText={setPin}
            error={errors.pin}
          />
          <Input
            label="Confirmer le code PIN"
            placeholder="Répétez le code PIN"
            password
            keyboardType="number-pad"
            leftIcon="lock-closed"
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
          />
          <Button title="Enregistrer" onPress={submit} loading={loading} fullWidth size="lg" />
        </View>
      </Screen>
    </SafeAreaView>
  );
}
