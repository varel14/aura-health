import { ComponentProps, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radii, spacing } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  password?: boolean;
}

export function Input({ label, error, hint, leftIcon, password, style, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(!password);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  return (
    <View style={{ marginBottom: spacing.m }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.box, { borderColor }]}>
        {leftIcon && <Ionicons name={leftIcon} size={18} color={focused ? colors.primary : colors.textFaint} style={{ marginRight: 10 }} />}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textFaint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={!visible}
          {...rest}
        />
        {password && (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
            <Ionicons name={visible ? 'eye-off' : 'eye'} size={20} color={colors.textFaint} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  style,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  style?: object;
}) {
  return (
    <View style={[styles.search, style]}>
      <Ionicons name="search" size={18} color={colors.textFaint} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Rechercher…'}
        placeholderTextColor={colors.textFaint}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textFaint} />
        </Pressable>
      )}
    </View>
  );
}

type ChoiceProps = ComponentProps<typeof Pressable> & {};

export function ChoiceRow({
  icon,
  title,
  subtitle,
  selected,
  disabled,
  right,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  selected?: boolean;
  disabled?: boolean;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.choice, selected && styles.choiceSelected, disabled && { opacity: 0.5 }]}
    >
      {icon && (
        <View style={[styles.choiceIcon, selected && { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon} size={20} color={selected ? colors.primary : colors.textMuted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.choiceTitle}>{title}</Text>
        {subtitle && <Text style={styles.choiceSub}>{subtitle}</Text>}
      </View>
      {right ?? (selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : <View style={styles.radio} />)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: font.size.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 7,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radii.m,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.m,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: font.size.base,
    color: colors.text,
    paddingVertical: 13,
  },
  error: {
    color: colors.danger,
    fontSize: font.size.xs,
    marginTop: 6,
  },
  hint: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    marginTop: 6,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.m,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: font.size.base,
    color: colors.text,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.m,
    backgroundColor: colors.card,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F4FAF8',
  },
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.s,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: {
    fontSize: font.size.base,
    fontWeight: '600',
    color: colors.text,
  },
  choiceSub: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
});
