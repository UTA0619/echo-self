// ECHO//SELF — Daily Mirror Screen placeholder
// Full implementation lives in EPIC-03 (feature/epic-03-daily-mirror)
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, Typography } from '../../theme/tokens'

export function DailyMirrorScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.glyph}>◈</Text>
      <Text style={styles.title}>Daily Mirror</Text>
      <Text style={styles.sub}>Your AI reflection space — merge EPIC-03 to unlock</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  glyph: {
    fontSize: 56,
    color: Colors.indigo,
  },
  title: {
    ...Typography.displayMd,
    color: Colors.white,
    textAlign: 'center',
  },
  sub: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
})
