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
        name="doctor-profile"
        options={{ title: 'Profil', tabBarIcon: ({ color, focused }) => <TabBarIcon name="person" color={color} focused={focused} /> }}
      />
      {/* Detail routes live outside the tab bar. */}
      <Tabs.Screen name="patients/[id]" options={{ href: null }} />
    </Tabs>
  );
}
