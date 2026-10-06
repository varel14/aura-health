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
          borderTopWidth: 0,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#0A2E20',
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -4 },
          elevation: 10,
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
      {/* Detail routes live outside the tab bar. Must stay off the public
          /doctors/[id] URL — same-shaped routes would make the router pick
          one arbitrarily for deep links. */}
      <Tabs.Screen name="doctors/review/[id]" options={{ href: null }} />
    </Tabs>
  );
}
