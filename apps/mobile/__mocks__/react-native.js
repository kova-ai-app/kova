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
const TextInput = createComponent('TextInput')
const ScrollView = createComponent('ScrollView')
const SafeAreaView = createComponent('SafeAreaView')
const Modal = createComponent('Modal')

const Animated = {
  Value: function Value(initial) {
    this.value = initial
    this.setValue = () => {}
    this.stopAnimation = () => {}
  },
  View: createComponent('Animated.View'),
  loop: () => ({ start: () => {} }),
  sequence: (steps) => steps,
  timing: () => ({}),
}

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
  get: () => null,
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
  TextInput,
  ScrollView,
  SafeAreaView,
  Modal,
  Animated,
  StyleSheet,
  PermissionsAndroid,
  AppState,
  TurboModuleRegistry,
  NativeModules,
}
