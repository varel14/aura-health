import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radii, spacing } from '@/constants/theme';

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  height,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: number | `${number}%`;
}) {
  const translateY = useRef(new Animated.Value(600)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      translateY.setValue(600);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          height ? { height } : null,
          { paddingBottom: insets.bottom + spacing.m, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.handle} />
        {title && (
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
        {children}
      </Animated.View>
    </Modal>
  );
}

export function ConfirmSheet({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  confirmVariant = 'danger',
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  children?: ReactNode;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View>
        <View style={styles.confirmIcon}>
          <Ionicons
            name={confirmVariant === 'danger' ? 'warning' : 'help-circle'}
            size={30}
            color={confirmVariant === 'danger' ? colors.danger : colors.primary}
          />
        </View>
        <Text style={styles.confirmTitle}>{title}</Text>
        {message && <Text style={styles.confirmMessage}>{message}</Text>}
        {children}
        <View style={{ flexDirection: 'row', gap: spacing.s, marginTop: spacing.l }}>
          <View style={{ flex: 1 }}>
            <Button title="Annuler" variant="outline" onPress={onClose} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={confirmLabel}
              variant={confirmVariant}
              onPress={() => {
                onClose();
                onConfirm();
              }}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

import { Button } from './Button';

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 25, 22, 0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.s,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  title: {
    fontSize: font.size.lg,
    fontWeight: '700',
    color: colors.text,
  },
  confirmIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.s,
  },
  confirmTitle: {
    fontSize: font.size.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.m,
  },
  confirmMessage: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
