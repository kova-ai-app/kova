// Global setup for all mobile vitest tests
// Mocks native modules that can't load in Node environment

// react-native-mmkv built-in mock activates via VITEST_WORKER_ID env
// but we still need react-native itself to be mockable.
// The alias in vitest.config.ts handles react-native → stub.

// Suppress React Native CJS deprecation warnings
process.env.REACT_APP_ENV = 'test'
