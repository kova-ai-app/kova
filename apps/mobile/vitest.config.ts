import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  resolve: {
    alias: {
      'react-native': resolve(__dirname, './__mocks__/react-native.js'),
      'react-native-fs': resolve(__dirname, './__mocks__/react-native-fs.js'),
      '@react-native-community/netinfo': resolve(__dirname, './__mocks__/react-native-community-netinfo.js'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    server: {
      deps: {
        inline: ['react-native-mmkv', '@react-native-community/netinfo'],
      },
    },
  },
})
