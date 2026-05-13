// apps/mobile/src/theme.ts
// Single source of truth for all Kova mobile design tokens.
// Mirrors the web app's "Warm Premium" design system (apps/web/src/app/globals.css).

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const colors = {
  // Backgrounds
  bgPage: '#FAFAF8',       // warm off-white — all screens (mirrors web oklch(0.99 0.005 80))
  bgCard: '#FFFFFF',       // white cards on warm background
  bgInput: '#F0EDE8',      // warm input surface (AskScreen)

  // Navigation chrome — dark warm (mirrors web sidebar oklch(0.17 0.012 60))
  navBg: '#2A2318',
  navBorder: '#3D3327',
  navActive: '#4870F5',    // brand blue (approximates web oklch(0.62 0.19 250))
  navInactive: '#8B8070',  // warm muted for inactive tabs

  // Brand
  brand: '#4870F5',        // primary interactive color
  brandDark: '#3558D4',    // darker shade for pressed states

  // Text
  textPrimary: '#1C1917',  // near-black warm (replaces #111827)
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnDark: '#F5F0EB',   // off-white text on dark nav bg

  // Semantic
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#78350F',
  warningLabel: '#92400E',

  // Badge backgrounds (translucent — status badges)
  badgeSuccessBg: '#16A34A22',
  badgeDangerBg: '#DC262622',
  badgeWarningBg: '#D9770622',
  badgeMutedBg: '#6B728022',

  // Borders / Separators
  border: '#E8E3DC',       // warm border (mirrors web oklch(0.91 0.007 80))
  separator: '#F0EDE8',    // subtle warm separator

  // Score / Opportunity
  scoreGreen: '#16A34A',
  missedRed: '#DC2626',
} as const

// ---------------------------------------------------------------------------
// Typography — font families (these strings must match useFonts keys)
// ---------------------------------------------------------------------------

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const

// ---------------------------------------------------------------------------
// Border radii
// ---------------------------------------------------------------------------

export const radii = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const

// ---------------------------------------------------------------------------
// Shadows — warm-tinted, very subtle (mirrors web --shadow-card)
// ---------------------------------------------------------------------------

export const shadow = {
  card: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  inputBar: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
} as const

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const
