import { StyleSheet, Text, View } from 'react-native';
import { avatarColor, font } from '@/constants/theme';
import { initialsOf } from '@/utils/format';

export function Avatar({
  name,
  size = 48,
  color,
  icon,
}: {
  name: string;
  size?: number;
  color?: string;
  icon?: boolean;
}) {
  const bg = color ?? avatarColor(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon ? (
        <Text style={{ color: '#FFFFFF', fontSize: size * 0.42 }}>🩺</Text>
      ) : (
        <Text style={{ color: '#FFFFFF', fontSize: size * 0.36, fontWeight: '700' }}>{initialsOf(name)}</Text>
      )}
    </View>
  );
}
