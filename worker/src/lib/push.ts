import { Expo } from 'expo-server-sdk'
import type { ExpoPushMessage } from 'expo-server-sdk'
import { db, calls, scores, pushTokens } from '@kova/db'
import { eq } from 'drizzle-orm'
import { createLogger } from './logger.js'

const logger = createLogger('push')

/**
 * Send a "call scored" push notification to all push tokens registered for a technician.
 * Non-fatal: errors are logged and swallowed; a failed push never fails the scoring job.
 */
export async function sendCallScoredNotification(
  callId: string,
  techId: string,
): Promise<void> {
  // 1. Look up push tokens for this tech
  const tokenRows = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.userId, techId))

  if (tokenRows.length === 0) {
    logger.info({ techId }, 'No push tokens registered — skipping notification')
    return
  }

  // 2. Look up call + score for the notification body
  const [callData] = await db
    .select({
      overallScore: scores.overallScore,
      opportunityTotalLow: scores.opportunityTotalLow,
    })
    .from(calls)
    .leftJoin(scores, eq(scores.id, calls.scoreId))
    .where(eq(calls.id, callId))

  const overallScore = callData?.overallScore ?? 0
  const missed = callData?.opportunityTotalLow ?? 0

  // 3. Build and validate push messages
  const expo = new Expo()
  const messages: ExpoPushMessage[] = tokenRows
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({
      to: t.token,
      sound: 'default' as const,
      title: 'Call Scored',
      body: `Score: ${overallScore}% · Missed revenue: $${missed.toFixed(0)}`,
      data: { callId, screen: 'CallDetail' },
    }))

  if (messages.length === 0) {
    logger.warn({ techId }, 'All push tokens are invalid — skipping notification')
    return
  }

  // 4. Send in chunks (Expo recommends max 100 per request)
  const chunks = expo.chunkPushNotifications(messages)
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk)
    } catch (err) {
      logger.error({ err, techId, callId }, 'Push notification chunk send failed — continuing')
    }
  }

  logger.info({ callId, techId, tokenCount: messages.length }, 'Push notifications sent')
}
