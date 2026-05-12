import { describe, it, expect } from 'vitest'
import { createSession, getSession } from '../upload-queue'

describe('upload queue no reset', () => {
  it('creates session', () => {
    createSession({ sessionId: 'x1', callId: 'c1', techId: 't1', companyId: 'co1', consentLoggedAt: new Date().toISOString() })
    expect(getSession('x1')?.callId).toBe('c1')
  })
})
