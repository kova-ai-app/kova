// Minimal react-native stub for vitest
// Replaces the Flow-typed react-native package which Vite can't parse.

export const Platform = {
  OS: 'ios' as 'ios' | 'android',
  Version: 14,
  select: (obj: Record<string, unknown>) => obj['ios'] ?? obj['default'],
}

export const Alert = {
  alert: (_title: string, _msg?: string, _buttons?: unknown[]) => {},
}

export const PermissionsAndroid = {
  request: async (_permission: string) => 'granted',
  PERMISSIONS: {
    RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
}

export const TurboModuleRegistry = {
  getEnforcing: (_name: string) => null,
}

export const NativeModules = {}
export const AppState = { addEventListener: () => ({ remove: () => {} }) }
export const Linking = {}
