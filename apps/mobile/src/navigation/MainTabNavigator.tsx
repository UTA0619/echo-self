import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
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

interface TabIconProps {
  emoji: string;
  label: string;
  focused: boolean;
}

function TabIcon({ emoji, label, focused }: TabIconProps) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: focused ? '700' : '400',
          color: focused ? Colors.indigo : Colors.silver,
          opacity: focused ? 1 : 0.6,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
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
      }}
    >
      <Tab.Screen
        name="Mirror"
        component={DailyMirrorScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🪞" label="Mirror" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Timeline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FutureSelf"
        component={FutureSelfScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔮" label="Future" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({});
