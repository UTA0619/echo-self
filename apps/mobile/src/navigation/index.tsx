import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/auth';
import { useOnboardingStore } from '../store/onboarding';
import { OnboardingNavigator } from './OnboardingNavigator';

// Placeholder screens — replaced in EPIC-03+
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/tokens';

function PlaceholderMain() {
  const { user } = useAuthStore();
  const { name } = useOnboardingStore();
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>ECHO//SELF</Text>
      <Text style={styles.placeholderSub}>Welcome, {name || user?.displayName} ✦</Text>
      <Text style={styles.placeholderHint}>Daily Mirror — coming in EPIC-03</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  placeholderSub: {
    fontSize: 18,
    color: Colors.violet,
  },
  placeholderHint: {
    fontSize: 13,
    color: Colors.silver,
    opacity: 0.5,
    marginTop: 8,
  },
});

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isComplete } = useOnboardingStore();

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isComplete ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <RootStack.Screen name="Main" component={PlaceholderMain} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
