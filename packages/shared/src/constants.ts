import type { DrainDimension, PlumbingDimension, ScoringDimension } from './types.js'

// =============================================================================
// Scoring Constants
// Source of truth: product-plan-v3.md §3 Scoring Model
// =============================================================================

// ---- Dimension weights -------------------------------------------------------
// These weights are applied when computing the overall score.
// Drain: 6 dimensions, each worth up to ~16.7 pts (total 100)
// Plumbing: 5 dimensions, each worth up to 20 pts (total 100)
// For mixed calls (both), the score is an average of the two.

export const DRAIN_DIMENSION_WEIGHTS: Record<DrainDimension, number> = {
  drain_cleaning_upsell: 20,
  hydro_jetting: 20,
  camera_inspection: 20,
  grease_trap: 15,
  preventive_plan: 15,
  pipe_repair: 10,
}

export const PLUMBING_DIMENSION_WEIGHTS: Record<PlumbingDimension, number> = {
  water_heater: 25,
  fixture_upgrade: 20,
  water_filtration: 20,
  pressure_regulator: 20,
  whole_home_repiping: 15,
}

// ---- Dimension labels --------------------------------------------------------

export const DIMENSION_LABELS: Record<ScoringDimension, string> = {
  // Drain
  drain_cleaning_upsell: 'Permanent Solution Offered',
  hydro_jetting: 'Hydro-Jetting Upgrade',
  camera_inspection: 'Camera Inspection',
  grease_trap: 'Grease Trap Service',
  preventive_plan: 'Preventive Maintenance Plan',
  pipe_repair: 'Pipe Repair / Liner',
  // Plumbing
  water_heater: 'Water Heater Replacement',
  fixture_upgrade: 'Fixture Upgrade',
  water_filtration: 'Water Filtration',
  pressure_regulator: 'Pressure Regulator',
  whole_home_repiping: 'Whole-Home Repiping',
}

export const DIMENSION_LABELS_ES: Record<ScoringDimension, string> = {
  // Drain
  drain_cleaning_upsell: 'Solución Permanente Ofrecida',
  hydro_jetting: 'Actualización Hidrojetting',
  camera_inspection: 'Inspección con Cámara',
  grease_trap: 'Servicio de Trampa de Grasa',
  preventive_plan: 'Plan de Mantenimiento Preventivo',
  pipe_repair: 'Reparación / Forro de Tubería',
  // Plumbing
  water_heater: 'Reemplazo de Calentador de Agua',
  fixture_upgrade: 'Actualización de Accesorios',
  water_filtration: 'Filtración de Agua',
  pressure_regulator: 'Regulador de Presión',
  whole_home_repiping: 'Re-tubería Completa del Hogar',
}

// ---- Rules engine keyword triggers -----------------------------------------

export const DRAIN_KEYWORDS_EN: Record<DrainDimension, string[]> = {
  drain_cleaning_upsell: ['permanent', 'long-term', 'replace', 'lined', 'coating', 'fix for good'],
  hydro_jetting: ['hydro', 'jetting', 'jet', 'high pressure', 'water jet'],
  camera_inspection: ['camera', 'inspect', 'video', 'scope', 'see inside'],
  grease_trap: ['grease', 'trap', 'fog', 'restaurant', 'commercial', 'interceptor'],
  preventive_plan: ['plan', 'maintenance', 'annual', 'schedule', 'preventive', 'program', 'service agreement'],
  pipe_repair: ['repair', 'liner', 'trenchless', 'patch', 'pipe replacement', 'relining'],
}

export const DRAIN_KEYWORDS_ES: Record<DrainDimension, string[]> = {
  drain_cleaning_upsell: ['permanente', 'reemplazar', 'recubrimiento', 'solución definitiva'],
  hydro_jetting: ['hidrojetting', 'chorro', 'presión alta', 'hidrojet'],
  camera_inspection: ['cámara', 'inspección', 'video', 'ver adentro', 'video inspección'],
  grease_trap: ['trampa de grasa', 'grasa', 'interceptor', 'restaurante'],
  preventive_plan: ['plan', 'mantenimiento', 'anual', 'preventivo', 'programa', 'acuerdo de servicio'],
  pipe_repair: ['reparar', 'forro', 'sin zanja', 'reemplazar tubería', 'relining'],
}

export const PLUMBING_KEYWORDS_EN: Record<PlumbingDimension, string[]> = {
  water_heater: ['water heater', 'hot water', 'tank', 'tankless', 'water temperature', 'anode'],
  fixture_upgrade: ['fixture', 'faucet', 'toilet', 'shower', 'upgrade', 'replace', 'new model'],
  water_filtration: ['filter', 'filtration', 'purification', 'reverse osmosis', 'softener', 'water quality'],
  pressure_regulator: ['pressure', 'regulator', 'prv', 'high pressure', 'psi'],
  whole_home_repiping: ['repipe', 'repiping', 'whole house', 'all pipes', 'galvanized', 'polybutylene', 'pex'],
}

export const PLUMBING_KEYWORDS_ES: Record<PlumbingDimension, string[]> = {
  water_heater: ['calentador', 'agua caliente', 'tanque', 'sin tanque', 'temperatura del agua'],
  fixture_upgrade: ['accesorio', 'llave', 'inodoro', 'ducha', 'actualizar', 'reemplazar'],
  water_filtration: ['filtro', 'filtración', 'purificación', 'ósmosis inversa', 'ablandador'],
  pressure_regulator: ['presión', 'regulador', 'prv', 'alta presión', 'psi'],
  whole_home_repiping: ['re-tubería', 'tubería completa', 'toda la casa', 'galvanizado', 'pex'],
}

// ---- Contextual suppression keywords (emergencies) -------------------------

export const EMERGENCY_KEYWORDS_EN = [
  'flood', 'flooding', 'emergency', 'urgent', 'burst pipe', 'sewage backup',
  'overflow', 'can\'t stop', 'water everywhere',
]

export const EMERGENCY_KEYWORDS_ES = [
  'inundación', 'emergencia', 'urgente', 'tubería reventada', 'desbordamiento',
  'no para', 'agua por todas partes',
]

// ---- Scoring thresholds -----------------------------------------------------

export const SCORING_THRESHOLDS = {
  MIN_CALL_DURATION_SEC: 8 * 60,     // Short calls (<8 min) get no LLM pass
  SHORT_CALL_MAX_SCORE: 40,           // Short calls capped at 40
  HIGH_CONFIDENCE_THRESHOLD: 0.8,
  LOW_CONFIDENCE_THRESHOLD: 0.5,
  LTV_DEFAULT_YEARS: 5,
} as const

// ---- Audio constants --------------------------------------------------------

export const AUDIO_CONSTANTS = {
  CHUNK_DURATION_MS: 5 * 60 * 1000,  // 5 minutes per chunk
  BITRATE_KBPS: 32,
  CHANNELS: 1,
  FORMAT: 'aac-lc' as const,
  MIN_FREE_DISK_BYTES: 200 * 1024 * 1024, // 200 MB
  MAX_RECORDING_DURATION_MS: 4 * 60 * 60 * 1000, // 4 hours hard limit
} as const

// ---- Queue constants --------------------------------------------------------

export const QUEUE_NAMES = {
  SCORING: 'scoring',
  NOTIFICATIONS: 'notifications',
} as const

export const JOB_NAMES = {
  SCORE_CALL: 'score-call',
  SEND_PUSH: 'send-push',
} as const

// ---- Default pricebook items (California drain + plumbing) -----------------

export interface DefaultPricebookItem {
  name: string
  trade: 'drain' | 'plumbing' | 'both'
  opportunityType: ScoringDimension
  pricingModel: 'fixed' | 'range'
  priceFixed?: number
  priceLow?: number
  priceHigh?: number
  isRecurring: boolean
  ltvAnnual?: number
  ltvYears?: number
}

export const DEFAULT_PRICEBOOK_ITEMS: DefaultPricebookItem[] = [
  // Drain
  { name: 'Permanent Drain Solution', trade: 'drain', opportunityType: 'drain_cleaning_upsell', pricingModel: 'range', priceLow: 500, priceHigh: 1500, isRecurring: false },
  { name: 'Hydro-Jetting Service', trade: 'drain', opportunityType: 'hydro_jetting', pricingModel: 'range', priceLow: 350, priceHigh: 700, isRecurring: false },
  { name: 'Camera Inspection', trade: 'drain', opportunityType: 'camera_inspection', pricingModel: 'fixed', priceFixed: 199, isRecurring: false },
  { name: 'Grease Trap Service', trade: 'drain', opportunityType: 'grease_trap', pricingModel: 'range', priceLow: 200, priceHigh: 500, isRecurring: true, ltvAnnual: 400, ltvYears: 5 },
  { name: 'Preventive Maintenance Plan', trade: 'drain', opportunityType: 'preventive_plan', pricingModel: 'range', priceLow: 99, priceHigh: 199, isRecurring: true, ltvAnnual: 149, ltvYears: 5 },
  { name: 'Pipe Repair / Liner', trade: 'drain', opportunityType: 'pipe_repair', pricingModel: 'range', priceLow: 800, priceHigh: 3000, isRecurring: false },
  // Plumbing
  { name: 'Water Heater Replacement', trade: 'plumbing', opportunityType: 'water_heater', pricingModel: 'range', priceLow: 1200, priceHigh: 2500, isRecurring: false },
  { name: 'Fixture Upgrade', trade: 'plumbing', opportunityType: 'fixture_upgrade', pricingModel: 'range', priceLow: 150, priceHigh: 800, isRecurring: false },
  { name: 'Water Filtration System', trade: 'plumbing', opportunityType: 'water_filtration', pricingModel: 'range', priceLow: 500, priceHigh: 2000, isRecurring: false },
  { name: 'Pressure Regulator', trade: 'plumbing', opportunityType: 'pressure_regulator', pricingModel: 'fixed', priceFixed: 350, isRecurring: false },
  { name: 'Whole-Home Repiping', trade: 'plumbing', opportunityType: 'whole_home_repiping', pricingModel: 'range', priceLow: 4000, priceHigh: 12000, isRecurring: false },
]
