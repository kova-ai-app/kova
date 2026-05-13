import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
  },
  // Packages that need to be transpiled for server components
  serverExternalPackages: ['@neondatabase/serverless'],
  webpack: (config) => {
    // Allow webpack to resolve .js imports as .ts/.tsx (TypeScript ESM convention)
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    }
    return config
  },
}

export default withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Suppresses source map upload logs
  silent: !process.env.CI,
  // Only upload source maps in production builds with auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Automatically tree-shake Sentry logger statements
  disableLogger: true,
  // Disable automatic release creation during dev
  autoInstrumentServerFunctions: true,
})
