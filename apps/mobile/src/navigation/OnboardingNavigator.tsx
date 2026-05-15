import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { NameScreen } from '../screens/onboarding/NameScreen';
import { EmotionalBaselineScreen } from '../screens/onboarding/EmotionalBaselineScreen';
import { NotificationScreen } from '../screens/onboarding/NotificationScreen';
import { PaywallScreen } from '../screens/onboarding/PaywallScreen';

export type OnboardingParamList = {
  Welcome: undefined;
  Name: undefined;
  EmotionalBaseline: undefined;
  Notifications: undefined;
  Paywall: undefined;
};

const Stack = createNativeStackNavigator<OnboardingParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0A0A0F' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Name" component={NameScreen} />
      <Stack.Screen name="EmotionalBaseline" component={EmotionalBaselineScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
    </Stack.Navigator>
  );
}
