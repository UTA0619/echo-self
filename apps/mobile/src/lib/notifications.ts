// ECHO//SELF — Push Notification Library (OneSignal)
// Handles permission requests, player-ID registration, and local scheduling.

import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from '../services/supabase'

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? ''

// Configure foreground notification handler once at app init
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
})

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('echo-reminders', {
      name: 'Echo Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// ─── OneSignal player-ID registration ────────────────────────────────────────

export async function registerPushToken(userId: string): Promise<void> {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    })

    // Persist to Supabase so the edge function can query it
    await supabase
      .from('notifications')
      .upsert({
        user_id:   userId,
        push_token: token.data,
        platform:  Platform.OS,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
  } catch (err) {
    console.error('[notifications] Failed to register push token:', err)
  }
}

// ─── Local streak reminder scheduling ────────────────────────────────────────

export async function scheduleStreakReminder(hour = 20, minute = 0): Promise<string | null> {
  // Cancel any existing streak reminders first
  await cancelStreakReminders()

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Echo is waiting ✦',
        body: 'Take 5 minutes to reflect. Your streak depends on it.',
        sound: false,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    })
    return id
  } catch (err) {
    console.error('[notifications] Schedule failed:', err)
    return null
  }
}

export async function cancelStreakReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const echoReminders = scheduled.filter(
    (n) => n.content.title?.includes('Echo') || n.content.body?.includes('streak'),
  )
  await Promise.all(echoReminders.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)))
}

// ─── Notification event listener ─────────────────────────────────────────────

type NotificationListener = (notification: Notifications.Notification) => void
type ResponseListener = (response: Notifications.NotificationResponse) => void

export function addNotificationListeners(
  onReceive: NotificationListener,
  onResponse: ResponseListener,
): () => void {
  const receive = Notifications.addNotificationReceivedListener(onReceive)
  const response = Notifications.addNotificationResponseReceivedListener(onResponse)
  return () => {
    receive.remove()
    response.remove()
  }
}
