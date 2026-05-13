import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, font, radii, shadow, spacing } from '../theme'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = 'user' | 'ai'

interface Message {
  id: string
  role: Role
  text: string
}

// ---------------------------------------------------------------------------
// Seed messages — UI demonstration only, no logic
// ---------------------------------------------------------------------------

const SEED_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'ai',
    text: "Hi! I'm your call coach. Ask me anything about your recent calls — scores, missed opportunities, or how to improve.",
  },
  {
    id: '2',
    role: 'user',
    text: 'How did my last call go?',
  },
  {
    id: '3',
    role: 'ai',
    text: 'Your last call scored 74%. You did well on product knowledge, but there were a couple of moments where acknowledging the customer\'s concern earlier could have helped close faster.',
  },
  {
    id: '4',
    role: 'user',
    text: 'What was the biggest missed opportunity?',
  },
  {
    id: '5',
    role: 'ai',
    text: 'Around the 4-minute mark the customer mentioned budget flexibility. Following up on that could have unlocked an upsell worth ~$120.',
  },
]

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function AiBubble({ text }: { text: string }) {
  return (
    <View style={styles.aiBubbleRow}>
      <View style={styles.aiAvatar}>
        <Ionicons name="chatbubble" size={14} color="#FFFFFF" />
      </View>
      <View style={styles.aiBubble}>
        <Text style={styles.aiText}>{text}</Text>
      </View>
    </View>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <View style={styles.userBubbleRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
      </View>
    </View>
  )
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'ai') return <AiBubble text={message.text} />
  return <UserBubble text={message.text} />
}

// ---------------------------------------------------------------------------
// AskScreen
// ---------------------------------------------------------------------------

export default function AskScreen() {
  const [input, setInput] = useState('')
  const flatListRef = useRef<FlatList<Message>>(null)

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={88}
      >
        {/* Message list */}
        <FlatList
          ref={flatListRef}
          data={SEED_MESSAGES}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your calls…"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            disabled={!input.trim()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={input.trim() ? '#FFFFFF' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bgPage },
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  aiBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    maxWidth: '85%',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
    flexShrink: 0,
  },
  aiBubble: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderTopLeftRadius: radii.xs,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    ...shadow.card,
  },
  aiText: {
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  userBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
  },
  userBubble: {
    backgroundColor: colors.brand,
    borderRadius: radii.xl,
    borderBottomRightRadius: radii.xs,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
  },
  userText: {
    fontFamily: font.regular,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bgPage,
    gap: spacing.sm,
    ...shadow.inputBar,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgInput,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 120,
    lineHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
})
