import { neon } from '@neondatabase/serverless'

// ---------------------------------------------------------------------------
// One-off script: wipe calls and all cascade-linked rows
// Affected: calls, transcripts, scores, opportunities, feedback, processing_costs
// jobs.call_id is nulled first (no cascade defined on that FK)
// Usage: tsx src/wipe-calls.ts
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL_UNPOOLED (or DATABASE_URL) is required')
}

const sql = neon(connectionString)

console.log('Nulling jobs.call_id...')
await sql`UPDATE jobs SET call_id = NULL WHERE call_id IS NOT NULL`

console.log('Deleting all calls (cascades to transcripts, scores, opportunities, feedback, processing_costs)...')
await sql`DELETE FROM calls`

console.log('Done.')
process.exit(0)
