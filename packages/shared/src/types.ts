// =============================================================================
// Core TypeScript Types
// =============================================================================

export type UserRole = 'owner' | 'manager' | 'technician'
export type CallStatus =
  | 'uploading'
  | 'pending'
  | 'processing'
  | 'transcribed'
  | 'scored'
  | 'failed'
export type JobType = 'drain' | 'plumbing' | 'both'
export type Language = 'en' | 'es' | 'unknown'
export type PricingModel = 'fixed' | 'range'
export type NotificationChannel = 'push'
export type NotificationType = 'call_scored' | 'call_failed' | 'system'
export type AppEnv = 'development' | 'staging' | 'production'

// ---- Drain Scoring Dimensions -----------------------------------------------
export type DrainDimension =
  | 'drain_cleaning_upsell'    // 1. Permanent solution offered
  | 'hydro_jetting'             // 2. Hydro-jetting upgrade
  | 'camera_inspection'         // 3. Camera inspection
  | 'grease_trap'               // 4. Grease trap / FOG service
  | 'preventive_plan'           // 5. Preventive maintenance plan
  | 'pipe_repair'               // 6. Pipe repair / liner

// ---- Plumbing Scoring Dimensions --------------------------------------------
export type PlumbingDimension =
  | 'water_heater'              // 7. Water heater replacement
  | 'fixture_upgrade'           // 8. Fixture upgrade
  | 'water_filtration'          // 9. Water filtration
  | 'pressure_regulator'        // 10. Pressure regulator
  | 'whole_home_repiping'       // 11. Whole-home repiping

export type ScoringDimension = DrainDimension | PlumbingDimension
export type OpportunityType = ScoringDimension

// ---- Qualitative Dimensions (LLM-evaluated, no direct dollar value) ---------
export type QualitativeDimension =
  | 'diagnosis_quality'     // Root cause explained clearly; recurrence risk discussed
  | 'customer_education'    // Trust built before pricing; price not rushed
  | 'close_quality'         // Options presented; objection handling; confident close
  | 'hydrojet_presentation' // Hydrojetting or permanent solution presented as alternative

export type AnyDimension = ScoringDimension | QualitativeDimension

// ---- Entities ---------------------------------------------------------------

export interface Company {
  id: string
  name: string
  plan: string
  state: string
  createdAt: string
}

export interface User {
  id: string
  companyId: string
  clerkUserId: string
  role: UserRole
  name: string
  phone?: string
  languagePref: Language
}

export interface Call {
  id: string
  companyId: string
  techId: string
  sessionId: string
  recordedAt: string
  durationSec: number
  s3Key?: string
  transcriptId?: string
  scoreId?: string
  language: Language
  status: CallStatus
  consentLoggedAt?: string
  declineReason?: string
}

export interface CallSummary {
  id: string
  techId: string
  techName: string
  recordedAt: string
  durationSec: number
  status: CallStatus
  overallScore?: number
  opportunityTotalLow?: number
  opportunityTotalHigh?: number
  jobType?: JobType
  customerName?: string
}

export interface TranscriptSegment {
  speaker: string
  text: string
  startSec: number
  endSec: number
  language: Language
  confidence: number
}

export interface Transcript {
  id: string
  callId: string
  segments: TranscriptSegment[]
  language: Language
  werConfidence?: number
  provider: string
  model: string
}

export interface DimensionScore {
  dimension: AnyDimension    // was: ScoringDimension
  score: number              // 0–100
  triggered: boolean
  offered: boolean
  confidence: number         // 0–1
  reasoning?: string
}

// ---- Rules Engine -----------------------------------------------------------

export interface RuleResult {
  dimension: ScoringDimension
  triggered: boolean         // signal detected in the transcript
  offered: boolean           // tech explicitly offered the upsell
  confidence: number         // 0–1; rules are deterministic so always 0.95 unless suppressed
  clipStartSec?: number      // start of the relevant segment
  clipEndSec?: number        // end of the relevant segment
  suppressedReason?: 'emergency' | 'short_call'
}

export interface Score {
  id: string
  callId: string
  overallScore: number   // 0–100
  dimensions: DimensionScore[]
  opportunityTotalLow: number
  opportunityTotalHigh: number
  confidenceLevel: 'high' | 'medium' | 'low'
  modelUsed: string
  promptVersion: string
}

export interface Opportunity {
  id: string
  scoreId: string
  type: OpportunityType
  triggered: boolean
  offered: boolean
  pricebookItemId?: string
  valueLow: number
  valueHigh: number
  ltvValue?: number
  clipStartSec?: number
  clipEndSec?: number
  isDefaultPrice: boolean
  disputeReason?: string
  disputedAt?: string
  confidence: number
}

export interface PricebookItem {
  id: string
  companyId: string
  name: string
  trade: JobType
  opportunityType: OpportunityType
  pricingModel: PricingModel
  priceFixed?: number
  priceLow?: number
  priceHigh?: number
  isRecurring: boolean
  ltvAnnual?: number
  ltvYears?: number
  isDefault: boolean
  active: boolean
}

export interface PricebookItemInput {
  name: string
  trade: JobType
  opportunityType: OpportunityType
  pricingModel: PricingModel
  priceFixed?: number | null
  priceLow?: number | null
  priceHigh?: number | null
  isRecurring: boolean
  ltvAnnual?: number | null
  ltvYears?: number | null
}

export interface CoachingPoint {
  id: string
  callId: string
  techId: string
  text: string
  clipStartSec?: number
  clipEndSec?: number
  reviewedAt?: string
  managerNote?: string
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  payload: Record<string, unknown>
  sentAt?: string
  readAt?: string
  channel: NotificationChannel
}

export interface Job {
  id: string
  companyId: string
  techId: string
  customerName?: string
  jobType: JobType
  callId: string
}

export interface ProcessingCost {
  id: string
  callId: string
  provider: string
  tokensIn?: number
  tokensOut?: number
  costUsd: number
  createdAt: string
}

// ---- Scoring Pipeline -------------------------------------------------------

export interface ScoringResult {
  callId: string
  transcript: Transcript
  score: Score
  opportunities: Opportunity[]
  processingCostUsd: number
}

// ---- API Request / Response shapes ------------------------------------------

export interface UploadCompleteRequest {
  callId: string
  sessionId: string
  s3Keys: string[]
  totalDurationSec: number
  chunkCount: number
  jobMetadata?: {
    customerName?: string
    jobType: JobType
    notes?: string
  }
  devicePlatform: 'ios' | 'android'
  audioFormat: 'aac-lc'
  audioBitrateKbps: 32
  audioChannels: 1
}

export interface DashboardSummary {
  opportunityTotalLow: number
  opportunityTotalHigh: number
  opportunityChangePct: number
  cumulativeTotal: number
  topOpportunityTypes: Array<{
    type: OpportunityType
    totalValue: number
  }>
  pricebookCompletionPct: number
}

export interface PaginatedResponse<T> {
  data: T[]
  nextPage: number | null
  total: number
}
