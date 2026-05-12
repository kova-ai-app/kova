import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema.js'

// ---------------------------------------------------------------------------
// Database connection
// Uses neon() HTTP driver for serverless environments (Vercel)
// Uses direct connection URL (DATABASE_URL_UNPOOLED) for migrations
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const sql = neon(connectionString)

export const db = drizzle(sql, { schema })

export type Database = typeof db

// Re-export schema for convenience
export * from './schema.js'
