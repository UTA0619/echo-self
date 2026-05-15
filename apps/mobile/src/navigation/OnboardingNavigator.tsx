import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Inline placeholder screens — will be replaced when EPIC-02 onboarding screens merge
function WelcomeScreen({ navigation }: any) {
  const React = require('react');
  const { View, Text, TouchableOpacity, StyleSheet } = require('react-native');
  const { useOnboardingStore } = require('../store/onboarding');
  const { complete } = useOnboardingStore();

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ECHO//SELF</Text>
      <Text style={styles.tagline}>Your AI identity journal</Text>
      <TouchableOpacity style={styles.cta} onPress={() => { complete(); }}>
        <Text style={styles.ctaText}>Begin →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center' as const, justifyContent: 'center' as const, padding: 32 },
  logo: { fontSize: 32, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: -1 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.5)', marginTop: 12, marginBottom: 48 },
  cta: { backgroundColor: '#4F46E5', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 999 },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' as const },
};

export type OnboardingParamList = {
  Welcome: undefined;
};

const Stack = createNativeStackNavigator<OnboardingParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#0A0A0F' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
    </Stack.Navigator>
  );
}
