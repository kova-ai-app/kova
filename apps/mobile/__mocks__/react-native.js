// Minimal React Native stub for vitest
// Prevents loading the Flow-typed react-native package in Node environment.
'use strict'

const Platform = {
  OS: 'ios',
  Version: 14,
  select: (obj) => obj['ios'] ?? obj['default'],
}

const Alert = {
  alert: () => {},
}

const PermissionsAndroid = {
  request: async () => 'granted',
  PERMISSIONS: { RECORD_AUDIO: 'android.permission.RECORD_AUDIO' },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
}

const AppState = {
  addEventListener: () => ({ remove: () => {} }),
}

const TurboModuleRegistry = {
  getEnforcing: () => null,
}

const NativeModules = {}

module.exports = {
  Platform,
  Alert,
  PermissionsAndroid,
  AppState,
  TurboModuleRegistry,
  NativeModules,
}
