/**
 * MainStackNavigator
 *
 * Wraps the bottom tab navigator with a modal stack so that the
 * MorningReportScreen can be presented as a full-screen card modal
 * from anywhere inside the main app (primarily from the Mirror tab).
 */
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { MainTabNavigator } from './MainTabNavigator'
import { MorningReportScreen } from '../screens/mirror/MorningReportScreen'
import { VoiceConversationScreen } from '../screens/mirror/VoiceConversationScreen'
import { MemorySearchScreen } from '../screens/timeline/MemorySearchScreen'

export type MainStackParamList = {
  Tabs:              undefined
  MorningReport:     undefined
  VoiceConversation: undefined
  MemorySearch:      undefined
}

const Stack = createNativeStackNavigator<MainStackParamList>()

export function MainStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={MainTabNavigator}
      />
      <Stack.Screen
        name="MorningReport"
        component={MorningReportScreen}
        options={{
          presentation:       'modal',
          animation:          'slide_from_bottom',
          contentStyle:       { backgroundColor: '#0A0A0F' },
        }}
      />
      <Stack.Screen
        name="VoiceConversation"
        component={VoiceConversationScreen}
        options={{
          presentation:       'fullScreenModal',
          animation:          'fade',
          contentStyle:       { backgroundColor: '#0A0A0F' },
        }}
      />
      <Stack.Screen
        name="MemorySearch"
        component={MemorySearchScreen}
        options={{
          presentation:       'modal',
          animation:          'slide_from_bottom',
          contentStyle:       { backgroundColor: '#0A0A0F' },
        }}
      />
    </Stack.Navigator>
  )
}
