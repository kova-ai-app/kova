import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

// ---------------------------------------------------------------------------
// Foreground notification behavior — show alert + badge + sound
// ---------------------------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// ---------------------------------------------------------------------------
// registerForPushNotifications
// Returns the Expo push token string, or null if permission denied / not supported.
// ---------------------------------------------------------------------------

export async function registerForPushNotifications(): Promise<string | null> {
  // Expo Go / Simulator: getExpoPushTokenAsync requires a physical device
  if (!Constants.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Push notification permissions denied')
    return null
  }

  // Android requires a notification channel for Expo SDK 55+
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    })
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
  if (!projectId) {
    console.warn('[Notifications] EAS projectId not configured in app.json extra.eas.projectId')
    return null
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
  return tokenData.data
}

// ---------------------------------------------------------------------------
// Notification data payload type — matches what the worker sends
// ---------------------------------------------------------------------------

export interface CallScoredNotificationData {
  callId: string
  screen: 'CallDetail'
}

// ---------------------------------------------------------------------------
// addCallScoredListener
// Call this in the root component to handle taps on scored-call notifications.
// The callback receives the callId so the app can navigate to CallDetailScreen.
// ---------------------------------------------------------------------------

export function addCallScoredListener(
  onCallScored: (callId: string) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Partial<CallScoredNotificationData>
    if (data?.screen === 'CallDetail' && data?.callId) {
      onCallScored(data.callId)
    }
  })
}
