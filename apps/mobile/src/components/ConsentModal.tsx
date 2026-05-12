import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native'

interface ConsentModalProps {
  visible: boolean
  onConsent: () => void
  onDecline: () => void
}

export default function ConsentModal({ visible, onConsent, onDecline }: ConsentModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Before You Record</Text>
          <Text style={styles.instruction}>
            Please inform your customer:
          </Text>
          <View style={styles.scriptBox}>
            <Text style={styles.script}>
              "I'll be recording this appointment for quality
              purposes — is that okay with you?"
            </Text>
          </View>
          <TouchableOpacity style={styles.consentButton} onPress={onConsent}>
            <Text style={styles.consentButtonText}>
              Customer Consented — Start Recording
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineButtonText}>Customer Declined</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { flex: 1, padding: 32, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 24, textAlign: 'center' },
  instruction: { fontSize: 16, color: '#9CA3AF', marginBottom: 16, textAlign: 'center' },
  scriptBox: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  script: { fontSize: 18, color: '#F3F4F6', lineHeight: 28, fontStyle: 'italic' },
  consentButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  consentButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  declineButton: { padding: 16, alignItems: 'center' },
  declineButtonText: { fontSize: 16, color: '#9CA3AF' },
})
