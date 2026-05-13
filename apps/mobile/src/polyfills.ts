import * as ExpoCrypto from 'expo-crypto'
import { Buffer } from 'buffer'

// Polyfill crypto.getRandomValues for uuid v11+ (requires Web Crypto API)
if (typeof (global as any).crypto === 'undefined') {
  ;(global as any).crypto = {}
}
if (typeof (global as any).crypto.getRandomValues === 'undefined') {
  ;(global as any).crypto.getRandomValues = ExpoCrypto.getRandomValues
}

// Make Buffer available globally in React Native
;(global as any).Buffer = Buffer
