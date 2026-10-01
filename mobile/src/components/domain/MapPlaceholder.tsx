import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radii, spacing } from '@/constants/theme';

export function MapPlaceholder({
  address,
  label,
  height = 150,
}: {
  address?: string;
  label?: string;
  height?: number;
}) {
  return (
    <View style={[styles.map, { height }]}>
      <View style={[styles.roadH, { top: height * 0.3 }]} />
      <View style={[styles.roadH, { top: height * 0.72 }]} />
      <View style={[styles.roadV, { left: '28%' }]} />
      <View style={[styles.roadV, { left: '66%' }]} />
      <View style={[styles.park, { top: height * 0.08, left: '72%' }]} />
      <View style={styles.pinWrap}>
        <View style={styles.pinPulse} />
        <Ionicons name="location" size={34} color={colors.danger} />
      </View>
      {address && (
        <View style={styles.addressPill}>
          <Ionicons name="location" size={12} color={colors.primary} />
          <Text style={styles.addressText} numberOfLines={1}>
            {label ? `${label} — ` : ''}
            {address}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: '#E8F0EA',
    borderRadius: radii.l,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#FFFFFF',
  },
  roadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: '#FFFFFF',
  },
  park: {
    position: 'absolute',
    width: 70,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#CFE6CE',
  },
  pinWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinPulse: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(214, 69, 69, 0.18)',
  },
  addressPill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addressText: {
    flex: 1,
    fontSize: font.size.xs,
    color: colors.text,
    fontWeight: '500',
  },
});
