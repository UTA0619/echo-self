import React from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { Colors, BorderRadius, Spacing } from '../../theme/tokens'

interface GlassCardProps {
  children: React.ReactNode
  style?: ViewStyle
  intensity?: number
}

export function GlassCard({ children, style, intensity = 20 }: GlassCardProps) {
  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      style={[styles.card, style]}
    >
      {children}
    </BlurView>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: `${Colors.white}15`,
    overflow: 'hidden',
  },
})
