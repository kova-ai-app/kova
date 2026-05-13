import { z } from 'zod'
import type { ScoringDimension, OpportunityType } from './types.js'

// ---- Enums ------------------------------------------------------------------

export const UserRoleSchema = z.enum(['owner', 'manager', 'technician'])
export const CallStatusSchema = z.enum([
  'uploading',
  'pending',
  'processing',
  'transcribed',
  'scored',
  'failed',
])
export const JobTypeSchema = z.enum(['drain', 'plumbing', 'both'])
export const LanguageSchema = z.enum(['en', 'es', 'unknown'])
export const PricingModelSchema = z.enum(['fixed', 'range'])

export const DrainDimensionSchema = z.enum([
  'drain_cleaning_upsell',
  'hydro_jetting',
  'camera_inspection',
  'grease_trap',
  'preventive_plan',
  'pipe_repair',
])

export const PlumbingDimensionSchema = z.enum([
  'water_heater',
  'fixture_upgrade',
  'water_filtration',
  'pressure_regulator',
  'whole_home_repiping',
])

export const ScoringDimensionSchema = z.union([DrainDimensionSchema, PlumbingDimensionSchema])

export const CustomerInputSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

// ---- Request Schemas --------------------------------------------------------

export const ConsentRequestSchema = z.object({
  sessionId: z.string().uuid(),
  techId: z.string(),
  companyId: z.string(),
  consentedAt: z.string().datetime(),
  devicePlatform: z.enum(['ios', 'android']),
})

export const DeclineRequestSchema = z.object({
  sessionId: z.string().uuid(),
  techId: z.string(),
  companyId: z.string(),
  declinedAt: z.string().datetime(),
  reason: z.literal('customer_declined'),
})

export const UploadCompleteRequestSchema = z.object({
  callId: z.string(),
  sessionId: z.string().uuid(),
  s3Keys: z.array(z.string()).min(1),
  totalDurationSec: z.number().positive(),
  chunkCount: z.number().int().positive(),
  jobMetadata: z
    .object({
      customerId: z.string().uuid().optional(),
      jobType: JobTypeSchema,
      notes: z.string().optional(),
    })
    .nullable()
    .optional(),
  devicePlatform: z.enum(['ios', 'android']),
  audioFormat: z.literal('aac-lc'),
  audioBitrateKbps: z.literal(32),
  audioChannels: z.literal(1),
})

export const PricebookItemInputSchema = z.object({
  name: z.string().min(1),
  trade: JobTypeSchema,
  opportunityType: ScoringDimensionSchema,
  pricingModel: PricingModelSchema,
  priceFixed: z.number().positive().optional(),
  priceLow: z.number().positive().optional(),
  priceHigh: z.number().positive().optional(),
  isRecurring: z.boolean().default(false),
  ltvAnnual: z.number().positive().optional(),
  ltvYears: z.number().int().positive().optional(),
  active: z.boolean().default(true),
})

export const DisputeRequestSchema = z.object({
  reason: z.enum([
    'existing_service',
    'offered_declined',
    'not_relevant',
    'affordability',
    'other',
  ]),
  notes: z.string().optional(),
})

export const CoachingNoteRequestSchema = z.object({
  text: z.string().min(1).max(2000),
})

export const RegisterPushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
})

export const TagCallRequestSchema = z.object({
  customerId: z.string().uuid().optional(),
  jobType: JobTypeSchema,
  notes: z.string().optional(),
})

export const TeamRoleUpdateSchema = z.object({
  role: UserRoleSchema,
})

// ---- Worker Job Payload Schema ----------------------------------------------

export const ScoringJobPayloadSchema = z.object({
  callId: z.string(),
  s3Keys: z.array(z.string()).min(1),
  totalDurationSec: z.number().positive(),
  jobType: JobTypeSchema.optional(),
  promptVersion: z.string().default('v1'),
})

export type ScoringJobPayload = z.infer<typeof ScoringJobPayloadSchema>

// ---- LLM Response Schema (validated output from GPT-5.4-mini) ---------------

export const DimensionScoreSchema = z.object({
  dimension: ScoringDimensionSchema,
  score: z.number().min(0).max(100),
  triggered: z.boolean(),
  offered: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
})

export const LLMScoringResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  dimensions: z.array(DimensionScoreSchema),
  confidenceLevel: z.enum(['high', 'medium', 'low']),
  summary: z.string(),
  language: LanguageSchema,
})

export type LLMScoringResponse = z.infer<typeof LLMScoringResponseSchema>
