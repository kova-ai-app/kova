import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadConfig(localIosBuild: boolean) {
  vi.resetModules()

  if (localIosBuild) {
    process.env.LOCAL_IOS_BUILD = '1'
  } else {
    delete process.env.LOCAL_IOS_BUILD
  }

  const mod = await import('../../../app.config')
  return mod.default
}

afterEach(() => {
  delete process.env.LOCAL_IOS_BUILD
  vi.resetModules()
})

describe('app config', () => {
  it('omits expo-notifications plugin for local iOS builds', async () => {
    const config = await loadConfig(true)

    expect(config.plugins?.some((plugin) =>
      Array.isArray(plugin) && plugin[0] === 'expo-notifications'
    )).toBe(false)
    expect(config.ios?.infoPlist?.NSBackgroundModes).toEqual(['audio'])
  })

  it('keeps expo-notifications plugin for normal builds', async () => {
    const config = await loadConfig(false)

    expect(config.plugins?.some((plugin) =>
      Array.isArray(plugin) && plugin[0] === 'expo-notifications'
    )).toBe(true)
    expect(config.ios?.infoPlist?.NSBackgroundModes).toEqual([
      'audio',
      'remote-notification',
    ])
  })
})
