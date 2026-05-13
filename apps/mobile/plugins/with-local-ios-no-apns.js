const { withEntitlementsPlist } = require('expo/config-plugins')

function stripLocalIosPushEntitlements(entitlements) {
  const next = { ...entitlements }
  delete next['aps-environment']
  return next
}

const withLocalIosNoApns = (config) => {
  return withEntitlementsPlist(config, (mod) => {
    mod.modResults = stripLocalIosPushEntitlements(mod.modResults)
    return mod
  })
}

module.exports = withLocalIosNoApns
module.exports.stripLocalIosPushEntitlements = stripLocalIosPushEntitlements
