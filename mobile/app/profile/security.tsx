import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Screen, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { ApiError, api } from '@/services/api';

export default function Security() {
  const { show } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState(true);
  const [twoFa, setTwoFa] = useState(false);

  const updatePin = async () => {
    if (current.length < 4 || next.length < 4 || next !== confirm) {
      show('Vérifiez vos codes PIN (4 chiffres minimum, identiques).', 'error');
      return;
    }
    setSaving(true);
    try {
      // POST /api/auth/change-pin {currentPin, newPin}.
      const res = await api<{ ok: boolean; message: string }>('/api/auth/change-pin', {
        method: 'POST',
        body: { currentPin: current, newPin: next },
      });
      show(res.message || 'Code PIN mis à jour.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Mise à jour impossible.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="Sécurité" onBack={() => router.back()}>
        <Text style={styles.help}>Modifiez votre code PIN et gérez les options de sécurité de votre compte.</Text>
        <Input label="Code PIN actuel" password keyboardType="number-pad" value={current} onChangeText={setCurrent} leftIcon="lock-closed" />
        <Input label="Nouveau code PIN" password keyboardType="number-pad" value={next} onChangeText={setNext} leftIcon="lock-closed" hint="Au moins 4 chiffres." />
        <Input label="Confirmer le nouveau code PIN" password keyboardType="number-pad" value={confirm} onChangeText={setConfirm} leftIcon="lock-closed" />
        <Button title="Mettre à jour le code PIN" onPress={updatePin} loading={saving} fullWidth size="lg" />

        <Text style={styles.section}>Sécurité supplémentaire</Text>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Déverrouillage biométrique</Text>
            <Text style={styles.switchSub}>Utiliser l’empreinte ou le visage pour ouvrir l’application.</Text>
          </View>
          <Switch value={bio} onValueChange={setBio} trackColor={{ true: colors.primary }} />
        </View>
        <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Double authentification (SMS)</Text>
            <Text style={styles.switchSub}>Un code de vérification est exigé à chaque nouvelle connexion.</Text>
          </View>
          <Switch value={twoFa} onValueChange={setTwoFa} trackColor={{ true: colors.primary }} />
        </View>

        <View style={styles.sessionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="phone-portrait" size={16} color={colors.textMuted} />
            <Text style={[styles.sessionTitle, { flex: 1 }]}>Samsung A54 — Yaoundé</Text>
            <Text style={styles.sessionNow}>Cet appareil</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.m }}>
            <Ionicons name="desktop" size={16} color={colors.textMuted} />
            <Text style={[styles.sessionTitle, { flex: 1 }]}>Chrome — session web</Text>
            <Text style={styles.sessionOld}>Il y a 3 jours</Text>
          </View>
        </View>
        <Button title="Fermer les autres sessions" variant="outline" onPress={() => show('Autres sessions fermées.')} fullWidth />
      </Screen>
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';

const styles = StyleSheet.create({
  help: { fontSize: font.size.sm, color: colors.textMuted, lineHeight: 21, marginTop: spacing.s, marginBottom: spacing.m },
  section: {
    fontSize: font.size.sm,
    fontWeight: '800',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  switchTitle: { fontSize: font.size.base, fontWeight: '600', color: colors.text },
  switchSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  sessionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  sessionTitle: { fontSize: font.size.sm, fontWeight: '600', color: colors.text },
  sessionNow: { fontSize: font.size.xs, color: colors.success, fontWeight: '700' },
  sessionOld: { fontSize: font.size.xs, color: colors.textFaint },
});
