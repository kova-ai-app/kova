import React from 'react'
import { TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { colors, radii } from '../theme'

type RootNav = NativeStackNavigationProp<RootStackParamList>

export default function SettingsButton({
  color = colors.textOnDark,
  style,
}: {
  color?: string
  style?: StyleProp<ViewStyle>
}) {
  const navigation = useNavigation<RootNav>()

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      hitSlop={10}
      onPress={() => navigation.navigate('Settings')}
      style={[styles.button, style]}
    >
      <Ionicons name="settings-outline" size={22} color={color} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
