import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg';
import type { ArcPoint } from '../../store/timeline';
import type { EmotionType } from '@echo-self/shared-types';
import { Colors, Spacing } from '../../theme/tokens';

const EMOTION_COLORS: Record<EmotionType, string> = {
  joy: '#FBBF24', sadness: '#6366F1', anger: '#EF4444', fear: '#9CA3AF',
  surprise: '#06B6D4', disgust: '#10B981', anticipation: '#F59E0B',
  trust: '#EC4899', optimism: '#FCD34D', love: '#8B5CF6', awe: '#4F46E5',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.xl * 2 - 32;
const CHART_HEIGHT = 120;
const PAD_X = 12;
const PAD_Y = 12;

interface Props {
  points: ArcPoint[];
  days: number;
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export function EmotionalArcChart({ points, days }: Props) {
  const chartPts = useMemo(() => {
    if (!points.length) return { line: [], dots: [], fillPath: '' };

    const w = CHART_WIDTH - PAD_X * 2;
    const h = CHART_HEIGHT - PAD_Y * 2;

    const mapped = points.map((p, i) => ({
      x: PAD_X + (i / Math.max(points.length - 1, 1)) * w,
      y: PAD_Y + (1 - p.intensity) * h,
      emotion: p.emotion,
      intensity: p.intensity,
    }));

    const linePath = smoothPath(mapped);

    // Fill path: line + bottom close
    const last = mapped[mapped.length - 1];
    const first = mapped[0];
    const fillPath = linePath +
      ` L ${last.x} ${CHART_HEIGHT - PAD_Y} L ${first.x} ${CHART_HEIGHT - PAD_Y} Z`;

    return { line: mapped, dots: mapped, fillPath };
  }, [points]);

  if (!points.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Write more entries to see your emotional arc</Text>
      </View>
    );
  }

  const dominantEmotion = points[points.length - 1]?.emotion;
  const chartColor = dominantEmotion ? EMOTION_COLORS[dominantEmotion] : Colors.indigo;

  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emotional arc · {days}d</Text>
        {dominantEmotion && (
          <Text style={[styles.current, { color: chartColor }]}>
            {dominantEmotion} ↑
          </Text>
        )}
      </View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="arcGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={chartColor} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <Line
            key={pct}
            x1={PAD_X} y1={PAD_Y + (1 - pct) * (CHART_HEIGHT - PAD_Y * 2)}
            x2={CHART_WIDTH - PAD_X} y2={PAD_Y + (1 - pct) * (CHART_HEIGHT - PAD_Y * 2)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* Fill */}
        {chartPts.fillPath ? (
          <Path d={chartPts.fillPath} fill="url(#arcGrad)" />
        ) : null}

        {/* Line */}
        {chartPts.line.length > 1 && (
          <Path
            d={smoothPath(chartPts.line)}
            fill="none"
            stroke={chartColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots */}
        {chartPts.dots.map((pt, i) => (
          <Circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={pt.emotion === dominantEmotion ? 5 : 3}
            fill={pt.emotion ? EMOTION_COLORS[pt.emotion] : chartColor}
            stroke={Colors.black}
            strokeWidth={1.5}
          />
        ))}
      </Svg>

      {/* X-axis labels */}
      <View style={styles.xLabels}>
        <Text style={styles.xLabel}>{days}d ago</Text>
        <Text style={styles.xLabel}>Today</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: Spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.silver,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  current: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PAD_X,
  },
  xLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
  empty: {
    height: CHART_HEIGHT + 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 13, color: Colors.silver, opacity: 0.5, textAlign: 'center' },
});
