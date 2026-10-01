import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';
import { TabBarIcon } from '@/components/ui/Screen';

export default function AdminLayout() {
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
        options={{ title: 'Accueil', tabBarIcon: ({ color, focused }) => <TabBarIcon name="speedometer" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="doctors"
        options={{ title: 'Médecins', tabBarIcon: ({ color, focused }) => <TabBarIcon name="pulse" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="establishments"
        options={{ title: 'Établissements', tabBarIcon: ({ color, focused }) => <TabBarIcon name="business" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="applications"
        options={{ title: 'Candidatures', tabBarIcon: ({ color, focused }) => <TabBarIcon name="document-text" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Admin', tabBarIcon: ({ color, focused }) => <TabBarIcon name="shield-half" color={color} focused={focused} /> }}
      />
      {/* Detail routes live outside the tab bar. */}
      <Tabs.Screen name="doctors/[id]" options={{ href: null }} />
    </Tabs>
  );
}
