import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useUser, useOrganization, useAuth } from '@clerk/clerk-expo'
import { colors, font, radii, spacing } from '../theme'

// ---------------------------------------------------------------------------
// ProfileScreen — User info and sign-out
// Shows name, phone, and organization from the active Clerk session.
// Falls back to a placeholder when Clerk is not configured.
// ---------------------------------------------------------------------------

function ProfilePlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.placeholder}>Clerk is not configured.</Text>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

function ProfileContent() {
  const { user, isLoaded: userLoaded } = useUser()
  const { organization, isLoaded: orgLoaded } = useOrganization()
  const { signOut } = useAuth()

  if (!userLoaded || !orgLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  const name = user?.fullName ?? user?.firstName ?? 'Unknown'
  const phone = user?.primaryPhoneNumber?.phoneNumber ?? '—'
  const orgName = organization?.name ?? '—'

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Row label="Name" value={name} />
        <Row label="Phone" value={phone} />
        <Row label="Company" value={orgName} />
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const IS_CLERK_CONFIGURED = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function ProfileScreen() {
  if (!IS_CLERK_CONFIGURED) return <ProfilePlaceholder />
  return <ProfileContent />
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, padding: spacing.xl },
  title: {
    fontFamily: font.bold,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  placeholder: { fontFamily: font.regular, color: colors.textSecondary },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  rowLabel: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary },
  rowValue: { fontFamily: font.medium, fontSize: 14, color: colors.textPrimary },
  signOutButton: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { fontFamily: font.semibold, color: colors.danger, fontSize: 16 },
})
