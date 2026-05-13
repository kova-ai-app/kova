import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useUser, useOrganization, useAuth } from '@clerk/clerk-expo'
import { colors, font, radii, spacing } from '../theme'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

function SettingsPlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.sectionLabel}>Profile</Text>
      <Text style={styles.placeholder}>Clerk is not configured.</Text>
    </View>
  )
}

function SettingsContent() {
  const { user, isLoaded: userLoaded } = useUser()
  const { organization, isLoaded: orgLoaded } = useOrganization()
  const { signOut } = useAuth()

  if (!userLoaded || !orgLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  const name = user?.fullName ?? user?.firstName ?? 'Unknown'
  const phone = user?.primaryPhoneNumber?.phoneNumber ?? '—'
  const orgName = organization?.name ?? '—'

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.sectionLabel}>Profile</Text>

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

export default function SettingsScreen() {
  if (!IS_CLERK_CONFIGURED) return <SettingsPlaceholder />
  return <SettingsContent />
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, padding: spacing.xl },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: {
    fontFamily: font.bold,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontFamily: font.semibold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
