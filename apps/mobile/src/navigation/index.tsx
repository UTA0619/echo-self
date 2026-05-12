import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useAuthStore } from '../store/auth'

const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={() => null} />
    </Stack.Navigator>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#0A0A0F' } }}>
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Echo' }} />
      <Tab.Screen name="Memory" component={() => null} options={{ title: 'Memory' }} />
      <Tab.Screen name="Future" component={() => null} options={{ title: 'Future' }} />
      <Tab.Screen name="Insights" component={() => null} options={{ title: 'Insights' }} />
    </Tab.Navigator>
  )
}

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return null

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Onboarding" component={() => null} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
