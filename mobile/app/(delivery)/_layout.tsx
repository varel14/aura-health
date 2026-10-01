import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';
import { TabBarIcon } from '@/components/ui/Screen';

export default function DeliveryLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Livraisons', tabBarIcon: ({ color, focused }) => <TabBarIcon name="bicycle" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="delivery-profile"
        options={{ title: 'Profil', tabBarIcon: ({ color, focused }) => <TabBarIcon name="person" color={color} focused={focused} /> }}
      />
      {/* Detail route lives outside the tab bar. */}
      <Tabs.Screen name="order/[id]" options={{ href: null }} />
    </Tabs>
  );
}
