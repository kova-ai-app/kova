'use strict'
// CJS stub — prevents Flow-syntax FS.common.js from being loaded by Vite
// The actual mock is provided per-test via vi.mock('react-native-fs', factory)
module.exports = {
  default: {},
  DocumentDirectoryPath: '/tmp',
  CachesDirectoryPath: '/tmp',
  TemporaryDirectoryPath: '/tmp',
  getFSInfo: () => Promise.resolve({ freeSpace: 500 * 1024 * 1024 }),
  readFile: () => Promise.resolve(''),
  writeFile: () => Promise.resolve(),
  unlink: () => Promise.resolve(),
  stat: () => Promise.resolve({ size: 0 }),
  exists: () => Promise.resolve(false),
}
