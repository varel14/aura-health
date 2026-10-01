import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radii, spacing } from '@/constants/theme';

/**
 * 6-digit handover-code entry. The customer reads it from their order;
 * the pharmacist/courier types it to confirm a handover.
 */
export function CodeInput({
  value,
  onChangeText,
  length = 6,
  error,
  label = 'Code de remise du client',
}: {
  value: string;
  onChangeText: (v: string) => void;
  length?: number;
  error?: string | null;
  label?: string;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={length}
        style={[styles.input, error ? styles.inputError : null]}
        placeholder={`${'•'.repeat(length)}`}
        placeholderTextColor={colors.textFaint}
      />
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <Text style={styles.hint}>
          Le client le trouve dans « Mes commandes » — ne le demandez qu’au moment de la remise.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.size.sm, fontWeight: '700', color: colors.text, marginBottom: spacing.s },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.m,
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 14,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.s },
  errorText: { fontSize: font.size.xs, color: colors.danger, flex: 1 },
  hint: { fontSize: font.size.xs, color: colors.textFaint, marginTop: spacing.s, lineHeight: 15 },
});
