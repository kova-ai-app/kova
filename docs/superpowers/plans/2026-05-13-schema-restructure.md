# Schema Restructure: Customers, Sales Role, Feedback, Sold Tracking

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the database to add a proper customers table, sales role, rename coaching_points to feedback, and add sold tracking to opportunities.

**Architecture:** Incremental schema evolution using Drizzle ORM migrations. Each task generates a migration, updates shared types, and modifies API/frontend code. LLM customer extraction is added to the existing scoring pipeline.

**Tech Stack:** Drizzle ORM, PostgreSQL (Neon), Next.js API routes, React Native, Zod, AI SDK (OpenAI/Anthropic)

---

### Task 1: Add `customers` table & migrate FK references

**Files:**
- Modify: `packages/db/src/schema.ts` (add table, update calls + jobs, update relations)
- Modify: `packages/shared/src/types.ts` (add Customer interface, update Call/Job/CallSummary)
- Modify: `packages/shared/src/schemas.ts` (add CustomerInputSchema, update UploadCompleteRequestSchema)
- Generate: migration via `pnpm db:generate`

- [ ] **Step 1: Add customers table to schema.ts**

Add after the `users` table definition (after line 43):

```ts
// ---- customers --------------------------------------------------------------

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  notes: text('notes'),
  tags: jsonb('tags').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  companyIdx: index('customers_company').on(table.companyId),
  phoneIdx: index('customers_phone').on(table.phone),
}))
```

- [ ] **Step 2: Update calls table — replace customerName with customerId**

In the `calls` table definition, replace:
```ts
customerName: text('customer_name'),
```
with:
```ts
customerId: uuid('customer_id').references(() => customers.id),
```

- [ ] **Step 3: Update jobs table — replace customerName with customerId**

In the `jobs` table definition, replace:
```ts
customerName: text('customer_name'),
```
with:
```ts
customerId: uuid('customer_id').references(() => customers.id),
```

- [ ] **Step 4: Add customer relations**

Add after existing relations:
```ts
export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, { fields: [customers.companyId], references: [companies.id] }),
}))
```

Update `callsRelations` to add:
```ts
customer: one(customers, { fields: [calls.customerId], references: [customers.id] }),
```

Update `companiesRelations` to add:
```ts
customers: many(customers),
```

- [ ] **Step 5: Update shared types**

In `packages/shared/src/types.ts`:

Add `Customer` interface:
```ts
export interface Customer {
  id: string
  companyId: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  tags: string[]
}
```

Update `Call` interface: replace `customerName?: string` with `customerId?: string`
Update `CallSummary` interface: replace `customerName?: string` with `customerId?: string` and add `customerName?: string` (for joined display)
Update `Job` interface: replace `customerName?: string` with `customerId?: string`
Update `UploadCompleteRequest.jobMetadata`: replace `customerName?: string` with `customerId?: string`

- [ ] **Step 6: Update shared schemas**

In `packages/shared/src/schemas.ts`:

Add:
```ts
export const CustomerInputSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
})
```

Update `UploadCompleteRequestSchema` jobMetadata: replace `customerName` with `customerId`:
```ts
customerId: z.string().uuid().optional(),
```

Update `TagCallRequestSchema`: replace `customerName` with `customerId`:
```ts
customerId: z.string().uuid().optional(),
```

- [ ] **Step 7: Generate and run migration**

```bash
cd packages/db && pnpm db:generate
```

- [ ] **Step 8: Verify typecheck**

```bash
pnpm typecheck
```

---

### Task 2: Add `sales` role to users

**Files:**
- Modify: `packages/db/src/schema.ts:38` (add 'sales' to role enum)
- Modify: `packages/shared/src/types.ts:5` (add 'sales' to UserRole)
- Modify: `packages/shared/src/schemas.ts:6` (add 'sales' to UserRoleSchema)
- Modify: `apps/web/src/lib/auth.ts` (add Clerk role mapping for sales)
- Generate: migration via `pnpm db:generate`

- [ ] **Step 1: Update role enum in schema.ts**

Change line 38 from:
```ts
role: text('role', { enum: ['owner', 'manager', 'technician'] }).notNull().default('technician'),
```
to:
```ts
role: text('role', { enum: ['owner', 'manager', 'technician', 'sales'] }).notNull().default('technician'),
```

- [ ] **Step 2: Update UserRole type**

Change `types.ts` line 5 from:
```ts
export type UserRole = 'owner' | 'manager' | 'technician'
```
to:
```ts
export type UserRole = 'owner' | 'manager' | 'technician' | 'sales'
```

- [ ] **Step 3: Update UserRoleSchema**

Change `schemas.ts` line 6 from:
```ts
export const UserRoleSchema = z.enum(['owner', 'manager', 'technician'])
```
to:
```ts
export const UserRoleSchema = z.enum(['owner', 'manager', 'technician', 'sales'])
```

- [ ] **Step 4: Update Clerk role mapping in auth.ts**

Add to CLERK_ROLE_MAP:
```ts
'org:sales': 'sales' as const,
```

- [ ] **Step 5: Generate migration**

```bash
cd packages/db && pnpm db:generate
```

- [ ] **Step 6: Verify typecheck**

```bash
pnpm typecheck
```

---

### Task 3: Rename `coaching_points` to `feedback`

**Files:**
- Modify: `packages/db/src/schema.ts` (rename table export from coachingPoints to feedback)
- Modify: `packages/db/src/schema.ts` (update relation references)
- Modify: `packages/shared/src/types.ts` (rename CoachingPoint to Feedback)
- Modify: `packages/shared/src/schemas.ts` (rename CoachingNoteRequestSchema to FeedbackRequestSchema)
- Modify: `apps/web/src/app/api/calls/[id]/coaching/route.ts` (update imports)
- Modify: `apps/web/src/app/api/coaching/[id]/route.ts` (update imports)
- Modify: `apps/web/src/app/api/calls/[id]/route.ts` (update imports)
- Modify: `apps/web/src/app/dashboard/calls/[callId]/page.tsx` (update references)
- Modify: `apps/mobile/src/screens/CallDetailScreen.tsx` (update references)
- Modify: `apps/mobile/src/services/api.ts` (update references)
- Modify: `worker/src/workers/scoring.ts` (update imports and references)
- Modify all test files referencing coachingPoints/CoachingPoint
- Generate: migration (table rename)

- [ ] **Step 1: Rename table in schema.ts**

Change:
```ts
export const coachingPoints = pgTable('coaching_points', {
```
to:
```ts
export const feedback = pgTable('feedback', {
```

Keep all columns the same.

- [ ] **Step 2: Update relations in schema.ts**

In `callsRelations`, change `coachingPoints: many(coachingPoints)` to `feedback: many(feedback)`.

- [ ] **Step 3: Rename type in types.ts**

Rename `CoachingPoint` interface to `Feedback`.

- [ ] **Step 4: Rename schema in schemas.ts**

Rename `CoachingNoteRequestSchema` to `FeedbackRequestSchema`.

- [ ] **Step 5: Update all API route imports**

In every API route file that imports `coachingPoints` from `@kova/db`, change to `feedback`.
Files: `apps/web/src/app/api/calls/[id]/coaching/route.ts`, `apps/web/src/app/api/coaching/[id]/route.ts`, `apps/web/src/app/api/calls/[id]/route.ts`

- [ ] **Step 6: Update frontend components**

Update `apps/web/src/app/dashboard/calls/[callId]/page.tsx` — change all `coachingPoints` references to `feedback`.
Update `apps/mobile/src/screens/CallDetailScreen.tsx` — change references.
Update `apps/mobile/src/services/api.ts` — change references.

- [ ] **Step 7: Update worker**

In `worker/src/workers/scoring.ts`, change `coachingPoints` import and usage to `feedback`.

- [ ] **Step 8: Update test files**

Update all test files referencing coachingPoints/CoachingPoint.

- [ ] **Step 9: Generate migration**

```bash
cd packages/db && pnpm db:generate
```

- [ ] **Step 10: Verify typecheck and tests**

```bash
pnpm typecheck
pnpm test
```

---

### Task 4: Add sold tracking to opportunities

**Files:**
- Modify: `packages/db/src/schema.ts` (add columns to opportunities table)
- Modify: `packages/shared/src/types.ts` (add fields to Opportunity interface)
- Modify: `packages/shared/src/schemas.ts` (add SoldRequestSchema)
- Modify: `packages/db/src/schema.ts` (add relations for soldPricebookItem and soldByUser)
- Create: `apps/web/src/app/api/opportunities/[id]/sold/route.ts` (PATCH endpoint)
- Generate: migration

- [ ] **Step 1: Add sold columns to opportunities in schema.ts**

Add after `confidence` column:
```ts
soldAmount: real('sold_amount'),
soldPricebookItemId: uuid('sold_pricebook_item_id')
  .references(() => pricebookItems.id),
soldAt: timestamp('sold_at'),
soldByUserId: uuid('sold_by_user_id')
  .references(() => users.id),
```

- [ ] **Step 2: Update Opportunity type in types.ts**

Add to `Opportunity` interface:
```ts
soldAmount?: number
soldPricebookItemId?: string
soldAt?: string
soldByUserId?: string
```

- [ ] **Step 3: Add SoldRequestSchema to schemas.ts**

```ts
export const SoldRequestSchema = z.object({
  soldAmount: z.number().positive(),
  soldPricebookItemId: z.string().uuid(),
})
```

- [ ] **Step 4: Update opportunitiesRelations in schema.ts**

Add to existing `opportunitiesRelations`:
```ts
soldPricebookItem: one(pricebookItems, {
  fields: [opportunities.soldPricebookItemId],
  references: [pricebookItems.id],
}),
soldByUser: one(users, {
  fields: [opportunities.soldByUserId],
  references: [users.id],
}),
```

- [ ] **Step 5: Create sold API route**

Create `apps/web/src/app/api/opportunities/[id]/sold/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { db, opportunities, scores, calls } from '@kova/db'
import { eq, and } from 'drizzle-orm'
import { getAuthWithCompany } from '@/lib/auth'
import { withErrorHandler } from '@/lib/api-handler'
import { SoldRequestSchema } from '@kova/shared'

export const PATCH = withErrorHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { auth, error } = await getAuthWithCompany(['owner', 'manager', 'technician', 'sales'])
  if (error) return error

  const { id: opportunityId } = await params
  const body = SoldRequestSchema.parse(await request.json())

  // Verify opportunity belongs to this company via score -> call -> company chain
  const [opp] = await db
    .select({ id: opportunities.id, scoreId: opportunities.scoreId })
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))

  if (!opp) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  // Verify company ownership through score -> call chain
  const [score] = await db.select({ callId: scores.callId }).from(scores).where(eq(scores.id, opp.scoreId))
  if (!score) return NextResponse.json({ error: 'Score not found' }, { status: 404 })

  const [call] = await db.select({ companyId: calls.companyId }).from(calls).where(eq(calls.id, score.callId))
  if (!call || call.companyId !== auth.companyId) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  const [updated] = await db
    .update(opportunities)
    .set({
      soldAmount: body.soldAmount,
      soldPricebookItemId: body.soldPricebookItemId,
      soldAt: new Date(),
      soldByUserId: auth.userId,
    })
    .where(eq(opportunities.id, opportunityId))
    .returning()

  return NextResponse.json(updated)
})
```

- [ ] **Step 6: Generate migration**

```bash
cd packages/db && pnpm db:generate
```

- [ ] **Step 7: Verify typecheck**

```bash
pnpm typecheck
```

---

### Task 5: LLM customer extraction in scoring pipeline

**Files:**
- Create: `worker/src/lib/customer-extraction.ts`
- Modify: `worker/src/workers/scoring.ts` (add extraction step)

- [ ] **Step 1: Create customer-extraction.ts**

```ts
import { generateText, Output } from 'ai'
import { z } from 'zod'
import type { TranscriptSegment } from '@kova/shared'

const CustomerInfoSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
})

const EXTRACTION_PROMPT = `You are analyzing a service call transcript between a technician and a customer.
Extract any customer information mentioned in the conversation.
Only include information that is explicitly stated — do not guess or infer.
If a piece of information is not mentioned, omit it from your response.

Respond with JSON ONLY:
{
  "name": "customer name if mentioned",
  "phone": "phone number if mentioned",
  "email": "email if mentioned",
  "address": "address if mentioned"
}`

function formatForExtraction(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const role = s.speaker === 'speaker_0' ? 'Tech' : 'Customer'
      return `${role}: ${s.text}`
    })
    .join('\n')
}

export async function extractCustomerInfo(
  segments: TranscriptSegment[],
  resolveModel: (provider: string, model: string) => any,
): Promise<z.infer<typeof CustomerInfoSchema> | null> {
  const provider = process.env.LLM_PROVIDER ?? 'openai'
  const model = process.env.LLM_MODEL ?? 'gpt-4o-mini'

  try {
    const result = await generateText({
      model: resolveModel(provider, model),
      system: EXTRACTION_PROMPT,
      prompt: formatForExtraction(segments),
      output: Output.object({ schema: CustomerInfoSchema }),
      temperature: 0,
    })

    const parsed = result.output
    // Return null if nothing was extracted
    if (!parsed.name && !parsed.phone && !parsed.email && !parsed.address) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Add extraction step to scoring pipeline**

In `worker/src/workers/scoring.ts`, after Step 5 (transcript write) and before Step 7 (rules engine), add:

```ts
// Step 5b: Extract customer info from transcript (non-fatal)
let customerId: string | undefined
try {
  const customerInfo = await extractCustomerInfo(transcription.segments, resolveModel)
  if (customerInfo?.name) {
    // Try to find existing customer by phone within company, or create new
    if (customerInfo.phone) {
      const [existing] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(
          eq(customers.companyId, call.companyId),
          eq(customers.phone, customerInfo.phone),
        ))
      if (existing) {
        customerId = existing.id
      }
    }

    if (!customerId) {
      const [newCustomer] = await db
        .insert(customers)
        .values({
          companyId: call.companyId,
          name: customerInfo.name,
          phone: customerInfo.phone ?? null,
          email: customerInfo.email ?? null,
          address: customerInfo.address ?? null,
        })
        .returning({ id: customers.id })
      customerId = newCustomer.id
    }

    // Link customer to call
    await db.update(calls).set({ customerId }).where(eq(calls.id, callId))
  }
} catch (err) {
  logger.warn({ callId, err }, 'Customer extraction failed — non-fatal')
}
```

- [ ] **Step 3: Verify typecheck and tests**

```bash
pnpm typecheck
pnpm test
```

---

### Task 6: Customer API routes

**Files:**
- Create: `apps/web/src/app/api/customers/route.ts` (GET list, POST create)
- Create: `apps/web/src/app/api/customers/[id]/route.ts` (GET detail, PATCH update)
- Modify: `apps/web/src/app/api/calls/route.ts` (join to customers)
- Modify: `apps/web/src/app/api/calls/upload-complete/route.ts` (accept customerId)
- Modify: `apps/web/src/app/api/calls/[id]/route.ts` (include customer)

- [ ] **Step 1: Create customers list/create route**

Create `apps/web/src/app/api/customers/route.ts`:

GET: List all customers for the company. All roles allowed.
POST: Create a new customer. All roles allowed. Validate with CustomerInputSchema.

- [ ] **Step 2: Create customer detail/update route**

Create `apps/web/src/app/api/customers/[id]/route.ts`:

GET: Customer detail with call/job history. All roles allowed.
PATCH: Update customer fields. All roles allowed. Validate with partial CustomerInputSchema.

- [ ] **Step 3: Update calls list route**

Modify `apps/web/src/app/api/calls/route.ts` to join with customers table and return customer name.

- [ ] **Step 4: Update upload-complete route**

Modify `apps/web/src/app/api/calls/upload-complete/route.ts` to accept `customerId` instead of `customerName`.

- [ ] **Step 5: Update call detail route**

Modify `apps/web/src/app/api/calls/[id]/route.ts` to include customer data in response.

- [ ] **Step 6: Verify typecheck**

```bash
pnpm typecheck
```

---

### Task 7: Update frontend components

**Files:**
- Modify: `apps/web/src/app/dashboard/calls/[callId]/page.tsx`
- Modify: `apps/web/src/app/dashboard/calls/page.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/mobile/src/screens/JobTaggingScreen.tsx`
- Modify: `apps/mobile/src/screens/CallDetailScreen.tsx`
- Modify: `apps/mobile/src/screens/CallsScreen.tsx`
- Modify: `apps/mobile/src/screens/HomeScreen.tsx`
- Modify: `apps/mobile/src/services/api.ts`
- Modify: `apps/mobile/src/stores/upload-queue.ts`

- [ ] **Step 1: Update web call detail page**

Replace `customerName` references with customer data from the joined query. Show customer as a link. Rename coaching points UI to "Feedback".

- [ ] **Step 2: Update web calls list page**

Replace `customerName` with customer name from joined data.

- [ ] **Step 3: Update web dashboard page**

Replace `customerName` with customer name from joined data.

- [ ] **Step 4: Update mobile JobTaggingScreen**

Replace free-text customer name input with a customer picker (search/select from existing customers or create new).

- [ ] **Step 5: Update mobile CallDetailScreen**

Replace `customerName` display with customer entity display. Rename coaching references to feedback.

- [ ] **Step 6: Update mobile CallsScreen and HomeScreen**

Replace `customerName` with customer name from API response.

- [ ] **Step 7: Update mobile API service and upload store**

Update `apps/mobile/src/services/api.ts` types to use `customerId`. Update `apps/mobile/src/stores/upload-queue.ts` to use `customerId`.

- [ ] **Step 8: Verify typecheck**

```bash
pnpm typecheck
```
