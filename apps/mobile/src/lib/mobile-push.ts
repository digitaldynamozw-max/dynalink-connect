import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { mobilePost } from './mobile-api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    null
  )
}

function isIgnorablePushSetupError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  const normalized = message.toLowerCase()

  return (
    normalized.includes('default firebaseapp is not initialized') ||
    normalized.includes('fcm-credentials') ||
    normalized.includes('make sure to call firebaseapp.initializeapp')
  )
}

export async function registerMobilePushToken(authToken: string) {
  if (Platform.OS === 'web') {
    return null
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Orders and dispatch',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        lightColor: '#1c68f3',
      })
    }

    const existingPermissions = await Notifications.getPermissionsAsync()
    const finalPermissions = existingPermissions.granted
      ? existingPermissions
      : await Notifications.requestPermissionsAsync()

    if (!finalPermissions.granted) {
      return null
    }

    const projectId = getProjectId()
    if (!projectId) {
      return null
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
    await mobilePost('/api/mobile/push/register', {
      token,
      platform: Platform.OS,
    }, authToken)

    return token
  } catch (error) {
    if (isIgnorablePushSetupError(error)) {
      // Local/dev builds may not have Firebase wired for FCM; keep app usable without push.
      return null
    }

    throw error
  }
}
