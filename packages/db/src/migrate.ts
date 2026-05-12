import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import path from 'path'
import { fileURLToPath } from 'url'

// ---------------------------------------------------------------------------
// Drizzle migration runner
// Usage: tsx src/migrate.ts
// Uses DATABASE_URL_UNPOOLED (direct connection, not pooled)
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL_UNPOOLED (or DATABASE_URL) is required for migrations')
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.join(__dirname, 'migrations')

const sql = neon(connectionString)
const db = drizzle(sql)

console.log('Running migrations...')
await migrate(db, { migrationsFolder })
console.log('Migrations complete.')

process.exit(0)
