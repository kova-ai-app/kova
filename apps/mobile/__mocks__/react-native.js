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

const createComponent = (name) => name

const View = createComponent('View')
const Text = createComponent('Text')
const FlatList = createComponent('FlatList')
const TouchableOpacity = createComponent('TouchableOpacity')
const ActivityIndicator = createComponent('ActivityIndicator')

const StyleSheet = {
  create: (styles) => styles,
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
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  PermissionsAndroid,
  AppState,
  TurboModuleRegistry,
  NativeModules,
}
