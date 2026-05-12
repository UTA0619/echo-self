import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { DailyMirrorScreen } from '../screens/mirror/DailyMirrorScreen';
import { Colors } from '../theme/tokens';

// Placeholder screens for EPIC-04+
function TimelineScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.ph}>📊</Text>
      <Text style={styles.phText}>Timeline</Text>
      <Text style={styles.phSub}>Coming in EPIC-04</Text>
    </View>
  );
}

function FutureSelfScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.ph}>🔮</Text>
      <Text style={styles.phText}>Future Self</Text>
      <Text style={styles.phSub}>Coming in EPIC-05</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.ph}>👤</Text>
      <Text style={styles.phText}>Profile</Text>
      <Text style={styles.phSub}>Coming in EPIC-06</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ph: { fontSize: 48 },
  phText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  phSub: { fontSize: 13, color: Colors.silver, opacity: 0.5 },
});

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
