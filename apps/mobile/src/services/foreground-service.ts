import { Platform } from 'react-native'
import notifee, { AndroidImportance, AndroidCategory } from '@notifee/react-native'

const CHANNEL_ID = 'kova-recording'
const NOTIFICATION_ID = 'kova-foreground-recording'

/**
 * Starts an Android foreground service with a persistent notification.
 * On iOS this is a no-op — the AVAudioSession background mode handles it.
 */
export async function startRecordingForegroundService(): Promise<void> {
  if (Platform.OS !== 'android') return
  try {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Recording Status',
      importance: AndroidImportance.LOW,
    })
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Kova — Recording Active',
      body: 'Tap to return to the app.',
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        category: AndroidCategory.SERVICE,
        ongoing: true,
        pressAction: { id: 'default' },
      },
    })
  } catch (e) {
    console.error('[ForegroundService] Failed to start foreground service:', e)
    throw e
  }
}

/**
 * Stops the Android foreground service and dismisses its notification.
 */
export async function stopRecordingForegroundService(): Promise<void> {
  if (Platform.OS !== 'android') return
  await notifee.stopForegroundService()
  await notifee.cancelNotification(NOTIFICATION_ID)
}
