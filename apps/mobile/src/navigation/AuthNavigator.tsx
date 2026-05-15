import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { AuthCallbackScreen } from '../screens/auth/AuthCallbackScreen';

export type AuthParamList = {
  Login: undefined;
  AuthCallback: undefined;
};

const Stack = createNativeStackNavigator<AuthParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#0A0A0F' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
    </Stack.Navigator>
  );
}
