import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';
import { TabBarIcon } from '@/components/ui/Screen';

export default function DoctorLayout() {
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
        options={{ title: 'Accueil', tabBarIcon: ({ color, focused }) => <TabBarIcon name="medkit" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ title: 'Agenda', tabBarIcon: ({ color, focused }) => <TabBarIcon name="calendar" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="patients"
        options={{ title: 'Patients', tabBarIcon: ({ color, focused }) => <TabBarIcon name="people" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ color, focused }) => <TabBarIcon name="chatbubbles" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="doctor-profile"
        options={{ title: 'Profil', tabBarIcon: ({ color, focused }) => <TabBarIcon name="person" color={color} focused={focused} /> }}
      />
      {/* Detail routes live outside the tab bar. */}
      <Tabs.Screen name="patients/[id]" options={{ href: null }} />
    </Tabs>
  );
}
