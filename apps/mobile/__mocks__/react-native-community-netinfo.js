'use strict'
// CJS stub — prevents Flow-syntax files from being loaded by Vite/Node
// The actual mock is provided per-test via vi.mock('@react-native-community/netinfo', factory)
module.exports = {
  default: {
    fetch: () => Promise.resolve({ isConnected: true }),
    addEventListener: () => () => {},
    configure: () => {},
  },
  fetch: () => Promise.resolve({ isConnected: true }),
  addEventListener: () => () => {},
  configure: () => {},
}
