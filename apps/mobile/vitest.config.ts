import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    alias: {
      'react-native': resolve(__dirname, './__mocks__/react-native.js'),
    },
    server: {
      deps: {
        inline: ['react-native-mmkv'],
      },
    },
  },
})
