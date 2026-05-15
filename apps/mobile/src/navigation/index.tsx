import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useOnboardingStore } from '../store/onboarding';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isComplete } = useOnboardingStore();

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isComplete ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
