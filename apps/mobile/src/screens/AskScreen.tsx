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
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

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
            placeholderTextColor="#9CA3AF"
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Messages
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // AI bubble
  aiBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    maxWidth: '85%',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
    flexShrink: 0,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
  },
  aiText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
  },

  // User bubble
  userBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  userBubble: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
  },
  userText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 120,
    lineHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
})
