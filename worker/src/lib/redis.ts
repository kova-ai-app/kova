import { Redis } from 'ioredis'

const REDIS_URL = process.env.REDIS_URL
if (!REDIS_URL) {
  throw new Error('REDIS_URL is required')
}

export function createClient() {
  const redis = new Redis(REDIS_URL!, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
  })

  redis.on('error', (err) => {
    console.error('Redis error:', err)
  })

  return redis
}

// Singleton for workers (BullMQ requires dedicated connections)
let _redisClient: Redis | null = null

export function getRedisClient() {
  if (!_redisClient) {
    _redisClient = createClient()
  }
  return _redisClient
}
