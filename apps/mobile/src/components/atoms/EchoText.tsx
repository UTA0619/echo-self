import React, { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated'
import { Colors, FontSize } from '../../theme/tokens'

interface EchoTextProps {
  children: string
  size?: keyof typeof FontSize
  weight?: 'regular' | 'medium' | 'bold'
  animated?: boolean
  style?: object
}

export function EchoText({ children, size = 'base', weight = 'regular', animated = false, style }: EchoTextProps) {
  const progress = useSharedValue(0)

  useEffect(() => {
    if (animated) {
      progress.value = withTiming(1, { duration: 2000 })
    }
  }, [animated])

  const animatedStyle = useAnimatedStyle(() => ({
    color: animated
      ? interpolateColor(progress.value, [0, 0.5, 1], [Colors.silver, Colors.cyan, Colors.indigo])
      : Colors.white,
  }))

  return (
    <Animated.Text style={[styles.base, { fontSize: FontSize[size] }, animatedStyle, style]}>
      {children}
    </Animated.Text>
  )
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'System',
    color: Colors.white,
    letterSpacing: -0.3,
  },
})
