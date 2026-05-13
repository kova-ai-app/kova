import {
  pgTable,
  text,
  integer,
  boolean,
  real,
  jsonb,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// =============================================================================
// Database Schema
// Source of truth: development-plan-mvp.md §3
// =============================================================================

// ---- companies --------------------------------------------------------------

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('pilot'),
  state: text('state').notNull().default('CA'),
  clerkOrgId: text('clerk_org_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---- users ------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  role: text('role', { enum: ['owner', 'manager', 'technician'] }).notNull().default('technician'),
  name: text('name').notNull(),
  phone: text('phone'),
  languagePref: text('language_pref', { enum: ['en', 'es', 'unknown'] }).notNull().default('en'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

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

// ---- calls ------------------------------------------------------------------

export const calls = pgTable(
  'calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    techId: uuid('tech_id')
      .notNull()
      .references(() => users.id),
    sessionId: uuid('session_id').notNull().unique(),
    recordedAt: timestamp('recorded_at').notNull(),
    durationSec: integer('duration_sec').notNull().default(0),
    s3Key: text('s3_key'),
    transcriptId: uuid('transcript_id'),
    scoreId: uuid('score_id'),
    language: text('language', { enum: ['en', 'es', 'unknown'] }).notNull().default('unknown'),
    status: text('status', {
      enum: ['uploading', 'pending', 'processing', 'transcribed', 'scored', 'failed'],
    })
      .notNull()
      .default('uploading'),
    consentLoggedAt: timestamp('consent_logged_at'),
    declineReason: text('decline_reason'),
    customerId: uuid('customer_id').references(() => customers.id),
    jobType: text('job_type', { enum: ['drain', 'plumbing', 'both'] }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    companyRecordedIdx: index('calls_company_recorded').on(table.companyId, table.recordedAt),
    techIdx: index('calls_tech').on(table.techId),
    statusIdx: index('calls_status').on(table.status),
  }),
)

// ---- transcripts ------------------------------------------------------------

export const transcripts = pgTable('transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id')
    .notNull()
    .references(() => calls.id, { onDelete: 'cascade' }),
  segments: jsonb('segments').notNull().default([]),
  language: text('language', { enum: ['en', 'es', 'unknown'] }).notNull().default('unknown'),
  werConfidence: real('wer_confidence'),
  provider: text('provider').notNull().default('deepgram'),
  model: text('model').notNull().default('nova-3-multilingual'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---- scores -----------------------------------------------------------------

export const scores = pgTable('scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id')
    .notNull()
    .references(() => calls.id, { onDelete: 'cascade' }),
  overallScore: integer('overall_score').notNull().default(0),
  dimensions: jsonb('dimensions').notNull().default([]),
  opportunityTotalLow: real('opportunity_total_low').notNull().default(0),
  opportunityTotalHigh: real('opportunity_total_high').notNull().default(0),
  confidenceLevel: text('confidence_level', { enum: ['high', 'medium', 'low'] })
    .notNull()
    .default('medium'),
  modelUsed: text('model_used').notNull().default('gpt-4o-mini'),
  promptVersion: text('prompt_version').notNull().default('v1'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---- opportunities ----------------------------------------------------------

export const opportunities = pgTable(
  'opportunities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scoreId: uuid('score_id')
      .notNull()
      .references(() => scores.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    triggered: boolean('triggered').notNull().default(false),
    offered: boolean('offered').notNull().default(false),
    pricebookItemId: uuid('pricebook_item_id'),
    valueLow: real('value_low').notNull().default(0),
    valueHigh: real('value_high').notNull().default(0),
    ltvValue: real('ltv_value'),
    clipStartSec: real('clip_start_sec'),
    clipEndSec: real('clip_end_sec'),
    isDefaultPrice: boolean('is_default_price').notNull().default(true),
    disputeReason: text('dispute_reason'),
    disputedAt: timestamp('disputed_at'),
    confidence: real('confidence').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    scoreIdx: index('opportunities_score').on(table.scoreId),
    disputedIdx: index('opportunities_disputed').on(table.disputedAt),
  }),
)

// ---- pricebook_items --------------------------------------------------------

export const pricebookItems = pgTable('pricebook_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  trade: text('trade', { enum: ['drain', 'plumbing', 'both'] }).notNull(),
  opportunityType: text('opportunity_type').notNull(),
  pricingModel: text('pricing_model', { enum: ['fixed', 'range'] }).notNull(),
  priceFixed: real('price_fixed'),
  priceLow: real('price_low'),
  priceHigh: real('price_high'),
  isRecurring: boolean('is_recurring').notNull().default(false),
  ltvAnnual: real('ltv_annual'),
  ltvYears: integer('ltv_years'),
  isDefault: boolean('is_default').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---- coaching_points --------------------------------------------------------

export const coachingPoints = pgTable('coaching_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id')
    .notNull()
    .references(() => calls.id, { onDelete: 'cascade' }),
  techId: uuid('tech_id')
    .notNull()
    .references(() => users.id),
  text: text('text').notNull(),
  clipStartSec: real('clip_start_sec'),
  clipEndSec: real('clip_end_sec'),
  reviewedAt: timestamp('reviewed_at'),
  managerNote: text('manager_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---- notifications ----------------------------------------------------------

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['call_scored', 'call_failed', 'system'] }).notNull(),
  payload: jsonb('payload').notNull().default({}),
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),
  channel: text('channel', { enum: ['push'] }).notNull().default('push'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---- jobs -------------------------------------------------------------------

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  techId: uuid('tech_id')
    .notNull()
    .references(() => users.id),
  customerId: uuid('customer_id').references(() => customers.id),
  jobType: text('job_type', { enum: ['drain', 'plumbing', 'both'] }).notNull(),
  callId: uuid('call_id').references(() => calls.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---- processing_costs -------------------------------------------------------

export const processingCosts = pgTable('processing_costs', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id')
    .notNull()
    .references(() => calls.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  tokensIn: integer('tokens_in'),
  tokensOut: integer('tokens_out'),
  costUsd: real('cost_usd').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---- audit_logs -------------------------------------------------------------

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: uuid('target_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---- push_tokens ------------------------------------------------------------

export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  platform: text('platform', { enum: ['ios', 'android'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// Relations
// =============================================================================

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  calls: many(calls),
  customers: many(customers),
  pricebookItems: many(pricebookItems),
}))

export const customersRelations = relations(customers, ({ one }) => ({
  company: one(companies, { fields: [customers.companyId], references: [companies.id] }),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
  calls: many(calls),
  notifications: many(notifications),
  pushTokens: many(pushTokens),
}))

export const callsRelations = relations(calls, ({ one, many }) => ({
  company: one(companies, { fields: [calls.companyId], references: [companies.id] }),
  tech: one(users, { fields: [calls.techId], references: [users.id] }),
  customer: one(customers, { fields: [calls.customerId], references: [customers.id] }),
  transcript: one(transcripts, { fields: [calls.transcriptId], references: [transcripts.id] }),
  score: one(scores, { fields: [calls.scoreId], references: [scores.id] }),
  coachingPoints: many(coachingPoints),
  processingCosts: many(processingCosts),
}))

export const scoresRelations = relations(scores, ({ one, many }) => ({
  call: one(calls, { fields: [scores.callId], references: [calls.id] }),
  opportunities: many(opportunities),
}))

export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
  score: one(scores, { fields: [opportunities.scoreId], references: [scores.id] }),
  pricebookItem: one(pricebookItems, {
    fields: [opportunities.pricebookItemId],
    references: [pricebookItems.id],
  }),
}))
