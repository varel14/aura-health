import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radii, shadow, spacing } from '@/constants/theme';

type ToastType = 'success' | 'error' | 'info';

const ToastContext = createContext<{ show: (message: string, type?: ToastType) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType; key: number } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (message: string, type: ToastType = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, type, key: Date.now() });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, 2400);
    },
    [opacity],
  );

  const icon: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
    success: 'checkmark-circle',
    error: 'alert-circle',
    info: 'information-circle',
  };
  const tint: Record<ToastType, string> = {
    success: colors.success,
    error: colors.danger,
    info: colors.info,
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { bottom: insets.bottom + 24, opacity },
          ]}
        >
          <Ionicons name={icon[toast.type]} size={20} color={tint[toast.type]} />
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.l,
    right: spacing.l,
    backgroundColor: colors.dark,
    borderRadius: radii.m,
    paddingVertical: 12,
    paddingHorizontal: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    ...shadow.float,
  },
  text: {
    color: colors.white,
    fontSize: font.size.sm,
    fontWeight: '500',
    flex: 1,
  },
});
