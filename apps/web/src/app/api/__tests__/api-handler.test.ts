import { describe, it, expect, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@kova/db', () => ({
  db: {
    query: { companies: { findFirst: vi.fn() } },
  },
  companies: {},
}))
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

import { withErrorHandler } from '@/lib/api-handler'

describe('withErrorHandler', () => {
  it('returns 500 with structured error when handler throws', async () => {
    const handler = withErrorHandler(async (_req: Request, _ctx: unknown): Promise<NextResponse> => {
      throw new Error('DB connection lost')
    })

    const req = new NextRequest('http://localhost/api/test')
    const res = await handler(req, {})

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
  })

  it('passes through normal responses unchanged', async () => {
    const handler = withErrorHandler(async (_req: Request, _ctx: unknown) => {
      return NextResponse.json({ data: 'hello' })
    })

    const req = new NextRequest('http://localhost/api/test')
    const res = await handler(req, {})

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBe('hello')
  })
})
