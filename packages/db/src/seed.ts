import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'
import { DEFAULT_PRICEBOOK_ITEMS } from '@kova/shared'

// ---------------------------------------------------------------------------
// Seed script — development / staging use only
// Inserts: 1 test company, 3 techs, 1 manager, 1 owner, pricebook defaults
// Usage: tsx src/seed.ts
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required')
}

const sql = neon(connectionString)
const db = drizzle(sql, { schema })

async function seed() {
  console.log('Seeding database...')

  // Company
  const [company] = await db
    .insert(schema.companies)
    .values({ name: 'Drain Right', plan: 'pilot', state: 'CA' })
    .returning()

  if (!company) throw new Error('Failed to insert company')
  console.log(`Created company: ${company.id}`)

  // Users
  const [owner] = await db
    .insert(schema.users)
    .values({
      companyId: company.id,
      clerkUserId: 'clerk_seed_owner_1',
      role: 'owner',
      name: 'Owner User',
      phone: '+15550001111',
      languagePref: 'en',
    })
    .returning()

  const [manager] = await db
    .insert(schema.users)
    .values({
      companyId: company.id,
      clerkUserId: 'clerk_seed_manager_1',
      role: 'manager',
      name: 'Field Manager',
      phone: '+15550002222',
      languagePref: 'en',
    })
    .returning()

  const techData = [
    { name: 'Tech One', phone: '+15550003333', languagePref: 'en' as const },
    { name: 'Tech Two', phone: '+15550004444', languagePref: 'es' as const },
    { name: 'Tech Three', phone: '+15550005555', languagePref: 'en' as const },
  ]

  for (let i = 0; i < techData.length; i++) {
    await db.insert(schema.users).values({
      companyId: company.id,
      clerkUserId: `clerk_seed_tech_${i + 1}`,
      role: 'technician',
      ...techData[i],
    })
  }

  console.log('Created users:', { owner: owner?.id, manager: manager?.id })

  // Default pricebook items
  await db.insert(schema.pricebookItems).values(
    DEFAULT_PRICEBOOK_ITEMS.map((item) => ({
      companyId: company.id,
      ...item,
      isDefault: true,
      active: true,
    })),
  )
  console.log(`Created ${DEFAULT_PRICEBOOK_ITEMS.length} pricebook items`)

  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
