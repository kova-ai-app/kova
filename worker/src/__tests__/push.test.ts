import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('expo-server-sdk', () => {
  const mockSend = vi.fn().mockResolvedValue([{ status: 'ok' }])
  const mockChunk = vi.fn().mockImplementation((msgs: unknown[]) => [msgs])
  return {
    Expo: Object.assign(
      vi.fn().mockImplementation(() => ({
        sendPushNotificationsAsync: mockSend,
        chunkPushNotifications: mockChunk,
      })),
      {
        isExpoPushToken: vi.fn().mockReturnValue(true),
      }
    ),
  }
})

vi.mock('@kova/db', () => ({
  db: { select: vi.fn() },
  users: {},
  calls: {},
  scores: {},
  pushTokens: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }))

import { db } from '@kova/db'
import { Expo } from 'expo-server-sdk'
import { sendCallScoredNotification } from '../lib/push.js'

describe('sendCallScoredNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(Expo.isExpoPushToken as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)
  })

  it('1. sends push notification when tech has a valid token', async () => {
    const tokens = [{ token: 'ExponentPushToken[xxxxxx]' }]
    const scoreData = [{ overallScore: 72, opportunityTotalLow: 425 }]
    let callCount = 0
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve(tokens)
          return Promise.resolve(scoreData)
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(scoreData),
        }),
      }),
    }))

    await sendCallScoredNotification('call-1', 'tech-1')

    const expoInstance = (Expo as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(expoInstance.sendPushNotificationsAsync).toHaveBeenCalled()
    const sentMessages = expoInstance.sendPushNotificationsAsync.mock.calls[0][0]
    expect(sentMessages[0].to).toBe('ExponentPushToken[xxxxxx]')
    expect(sentMessages[0].data).toMatchObject({ callId: 'call-1', screen: 'CallDetail' })
  })

  it('2. skips send when tech has no push tokens', async () => {
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }))

    await sendCallScoredNotification('call-1', 'tech-1')

    const ExpoClass = Expo as unknown as ReturnType<typeof vi.fn>
    // Expo constructor should not even be called (or send was not called)
    if (ExpoClass.mock.results.length > 0) {
      const instance = ExpoClass.mock.results[0].value
      expect(instance.sendPushNotificationsAsync).not.toHaveBeenCalled()
    }
    // No assertion needed beyond no throw — function exits early
  })

  it('3. filters out invalid Expo tokens before sending', async () => {
    const tokens = [
      { token: 'ExponentPushToken[valid]' },
      { token: 'not-a-valid-expo-token' },
    ]
    ;(Expo.isExpoPushToken as unknown as ReturnType<typeof vi.fn>)
      .mockImplementation((t: string) => t.startsWith('ExponentPushToken'))

    let callCount = 0
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve(tokens)
          return Promise.resolve([{ overallScore: 60, opportunityTotalLow: 0 }])
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ overallScore: 60, opportunityTotalLow: 0 }]),
        }),
      }),
    }))

    await sendCallScoredNotification('call-1', 'tech-1')

    const expoInstance = (Expo as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
    const sentMessages = expoInstance.sendPushNotificationsAsync.mock.calls[0][0]
    expect(sentMessages).toHaveLength(1)
    expect(sentMessages[0].to).toBe('ExponentPushToken[valid]')
  })

  it('4. does not throw when sendPushNotificationsAsync rejects (non-fatal)', async () => {
    const tokens = [{ token: 'ExponentPushToken[xxxxxx]' }]
    let callCount = 0
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve(tokens)
          return Promise.resolve([{ overallScore: 80, opportunityTotalLow: 750 }])
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ overallScore: 80, opportunityTotalLow: 750 }]),
        }),
      }),
    }))

    const ExpoClass = Expo as unknown as ReturnType<typeof vi.fn>
    ExpoClass.mockImplementation(() => ({
      sendPushNotificationsAsync: vi.fn().mockRejectedValue(new Error('Expo push service down')),
      chunkPushNotifications: vi.fn().mockImplementation((msgs: unknown[]) => [msgs]),
    }))

    await expect(sendCallScoredNotification('call-1', 'tech-1')).resolves.not.toThrow()
  })

  it('5. notification body includes overallScore and opportunityTotalLow', async () => {
    const tokens = [{ token: 'ExponentPushToken[xxxxxx]' }]
    let callCount = 0
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve(tokens)
          return Promise.resolve([{ overallScore: 85, opportunityTotalLow: 1275 }])
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ overallScore: 85, opportunityTotalLow: 1275 }]),
        }),
      }),
    }))

    await sendCallScoredNotification('call-1', 'tech-1')

    const expoInstance = (Expo as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
    const sentMessages = expoInstance.sendPushNotificationsAsync.mock.calls[0][0]
    expect(sentMessages[0].body).toContain('85')
    expect(sentMessages[0].body).toContain('1275')
  })
})
