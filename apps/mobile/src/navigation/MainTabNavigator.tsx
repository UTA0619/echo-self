import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { DailyMirrorScreen } from '../screens/mirror/DailyMirrorScreen';
import { TimelineScreen } from '../screens/timeline/TimelineScreen';
import { FutureSelfScreen } from '../screens/future/FutureSelfScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { Colors } from '../theme/tokens';

export type MainTabParamList = {
  Mirror: undefined;
  Timeline: undefined;
  FutureSelf: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconConfig {
  active: IoniconsName;
  inactive: IoniconsName;
  label: string;
}

const TAB_ICONS: Record<keyof MainTabParamList, TabIconConfig> = {
  Mirror: { active: 'moon', inactive: 'moon-outline', label: 'Mirror' },
  Timeline: { active: 'time', inactive: 'time-outline', label: 'Timeline' },
  FutureSelf: { active: 'telescope', inactive: 'telescope-outline', label: 'Future' },
  Profile: { active: 'person', inactive: 'person-outline', label: 'Profile' },
};

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_ICONS[route.name as keyof MainTabParamList];
        return {
          headerShown: false,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginBottom: 4,
          },
          tabBarActiveTintColor: Colors.indigo,
          tabBarInactiveTintColor: Colors.silver,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            height: 80,
          },
          tabBarBackground: () => (
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFillObject}
            />
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? config.active : config.inactive}
              size={size ?? 22}
              color={color}
              accessibilityLabel={config.label}
            />
          ),
          tabBarAccessibilityLabel: config?.label,
        };
      }}
    >
      <Tab.Screen name="Mirror" component={DailyMirrorScreen} options={{ title: 'Mirror' }} />
      <Tab.Screen name="Timeline" component={TimelineScreen} options={{ title: 'Timeline' }} />
      <Tab.Screen name="FutureSelf" component={FutureSelfScreen} options={{ title: 'Future' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
