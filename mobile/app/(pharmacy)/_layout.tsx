import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';
import { TabBarIcon } from '@/components/ui/Screen';

export default function PharmacyLayout() {
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
        options={{ title: 'Commandes', tabBarIcon: ({ color, focused }) => <TabBarIcon name="cube" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="catalog"
        options={{ title: 'Médicaments', tabBarIcon: ({ color, focused }) => <TabBarIcon name="beaker" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Pharmacie', tabBarIcon: ({ color, focused }) => <TabBarIcon name="medkit" color={color} focused={focused} /> }}
      />
      {/* Detail routes live outside the tab bar. */}
      <Tabs.Screen name="catalog/[id]" options={{ href: null }} />
      <Tabs.Screen name="order/[id]" options={{ href: null }} />
    </Tabs>
  );
}
