// ---------------------------------------------------------------------------
// Kova API Client — standalone fetch functions, no React hooks
// Pass the Clerk JWT token from useAuth().getToken() to each call.
// ---------------------------------------------------------------------------

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

const DEFAULT_TIMEOUT_MS = 15000

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

async function authFetch(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<unknown> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error((errBody as { message?: string }).message ?? `HTTP ${res.status}`)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export interface CallsListResponse {
  data: CallSummaryItem[]
  nextPage: number | null
  total: number
}

export interface CallSummaryItem {
  id: string
  techId: string
  recordedAt: string
  durationSec: number
  status: string
  jobType: string | null
  customerName: string | null
  overallScore: number | null
  opportunityTotalLow: number | null
  opportunityTotalHigh: number | null
}

export interface CallDetailResponse {
  call: Record<string, unknown>
  score: Record<string, unknown> | null
  transcript: Record<string, unknown> | null
  opportunities: Record<string, unknown>[]
  feedback: Record<string, unknown>[]
}

export interface AudioUrlResponse {
  url: string
  expiresInSec: number
}

export function fetchCalls(token: string, page = 0): Promise<CallsListResponse> {
  return authFetch(`/api/calls?page=${page}`, token) as Promise<CallsListResponse>
}

export function fetchCall(token: string, callId: string): Promise<CallDetailResponse> {
  return authFetch(`/api/calls/${callId}`, token) as Promise<CallDetailResponse>
}

export function fetchCallAudioUrl(token: string, callId: string): Promise<AudioUrlResponse> {
  return authFetch(`/api/calls/${callId}/audio`, token) as Promise<AudioUrlResponse>
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

export function disputeOpportunity(
  token: string,
  opportunityId: string,
  reason: string,
): Promise<{ disputed: boolean }> {
  return authFetch(`/api/opportunities/${opportunityId}/dispute`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }) as Promise<{ disputed: boolean }>
}

// ---------------------------------------------------------------------------
// Push tokens
// ---------------------------------------------------------------------------

export function registerPushToken(
  token: string,
  pushToken: string,
  platform: 'ios' | 'android',
): Promise<{ registered: boolean }> {
  return authFetch('/api/notifications/register', token, {
    method: 'POST',
    body: JSON.stringify({ token: pushToken, platform }),
  }) as Promise<{ registered: boolean }>
}
