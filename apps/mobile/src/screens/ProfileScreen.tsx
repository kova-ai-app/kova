import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useUser, useOrganization, useAuth } from '@clerk/clerk-expo'

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
        <ActivityIndicator size="large" color="#2563EB" />
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
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 24 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
    marginTop: 16,
  },
  placeholder: { color: '#6B7280' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: { fontSize: 14, color: '#6B7280' },
  rowValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  signOutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
})
