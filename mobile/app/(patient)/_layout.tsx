import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';
import { TabBarIcon } from '@/components/ui/Screen';

export default function PatientLayout() {
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
        options={{ title: 'Accueil', tabBarIcon: ({ color, focused }) => <TabBarIcon name="home" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="pharmacy"
        options={{ title: 'Pharmacie', tabBarIcon: ({ color, focused }) => <TabBarIcon name="medkit" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="appointments"
        options={{ title: 'Rendez-vous', tabBarIcon: ({ color, focused }) => <TabBarIcon name="calendar" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ color, focused }) => <TabBarIcon name="chatbubbles" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="records"
        options={{ title: 'Dossier', tabBarIcon: ({ color, focused }) => <TabBarIcon name="folder" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="patient-profile"
        options={{ title: 'Profil', tabBarIcon: ({ color, focused }) => <TabBarIcon name="person" color={color} focused={focused} /> }}
      />
    </Tabs>
  );
}
