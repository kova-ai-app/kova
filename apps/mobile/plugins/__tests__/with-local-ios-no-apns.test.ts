import { describe, expect, it } from 'vitest'

import { stripLocalIosPushEntitlements } from '../with-local-ios-no-apns.js'

describe('with-local-ios-no-apns', () => {
  it('removes aps-environment from entitlements', () => {
    expect(
      stripLocalIosPushEntitlements({
        'aps-environment': 'development',
        'com.apple.security.application-groups': ['group.kova'],
      }),
    ).toEqual({
      'com.apple.security.application-groups': ['group.kova'],
    })
  })
})
