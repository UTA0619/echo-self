import React, { useEffect } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useOnboardingStore } from '../store/onboarding';
import { useAuthStore } from '../store/auth';
import { useIAPStore } from '../store/iap';
import { supabase } from '../services/supabase';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainStackNavigator } from './MainStackNavigator';
import { AuthNavigator } from './AuthNavigator';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

// Deep-link config for magic-link and OAuth callbacks
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['echoself://', 'https://echo-self.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          AuthCallback: 'auth/callback',
        },
      },
      Onboarding: 'onboarding',
      Main: 'app',
    },
  },
};

export function RootNavigator() {
  const { isComplete } = useOnboardingStore();
  const { isAuthenticated, loadProfile } = useAuthStore();
  const { configure: configureIAP } = useIAPStore();

  // Bootstrap: check for existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id);
        // Initialize RevenueCat with the authenticated userId
        configureIAP(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadProfile(session.user.id);
          configureIAP(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile, configureIAP]);

  return (
    <NavigationContainer linking={linking}>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : !isComplete ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <RootStack.Screen name="Main" component={MainStackNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
