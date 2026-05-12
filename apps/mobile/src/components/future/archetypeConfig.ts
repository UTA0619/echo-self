import type { VisualArchetype } from '@echo-self/shared-types';

export interface ArchetypeConfig {
  emoji: string;
  label: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  gradient: [string, string];
  symbol: string;
}

export const ARCHETYPE_CONFIG: Record<VisualArchetype, ArchetypeConfig> = {
  visionary: {
    emoji: '🌌',
    label: 'The Visionary',
    tagline: 'You see what others cannot yet imagine.',
    primaryColor: '#4F46E5',
    secondaryColor: '#06B6D4',
    gradient: ['#1e1b4b', '#0c4a6e'],
    symbol: '✦',
  },
  healer: {
    emoji: '🌸',
    label: 'The Healer',
    tagline: 'Your presence transforms pain into wholeness.',
    primaryColor: '#EC4899',
    secondaryColor: '#8B5CF6',
    gradient: ['#4a1942', '#2d1b69'],
    symbol: '◈',
  },
  creator: {
    emoji: '🎨',
    label: 'The Creator',
    tagline: 'You build worlds from nothing but intention.',
    primaryColor: '#F59E0B',
    secondaryColor: '#EF4444',
    gradient: ['#451a03', '#450a0a'],
    symbol: '◎',
  },
  rebel: {
    emoji: '🔥',
    label: 'The Rebel',
    tagline: 'You break what needs breaking to reveal truth.',
    primaryColor: '#EF4444',
    secondaryColor: '#F59E0B',
    gradient: ['#450a0a', '#451a03'],
    symbol: '⚡',
  },
  sage: {
    emoji: '🦉',
    label: 'The Sage',
    tagline: 'You hold wisdom the world is still learning to ask for.',
    primaryColor: '#10B981',
    secondaryColor: '#06B6D4',
    gradient: ['#022c22', '#0c4a6e'],
    symbol: '◉',
  },
  explorer: {
    emoji: '🧭',
    label: 'The Explorer',
    tagline: 'Every edge of the map is an invitation.',
    primaryColor: '#06B6D4',
    secondaryColor: '#4F46E5',
    gradient: ['#0c4a6e', '#1e1b4b'],
    symbol: '⊕',
  },
  guardian: {
    emoji: '🛡️',
    label: 'The Guardian',
    tagline: 'You protect what deserves to be protected.',
    primaryColor: '#6366F1',
    secondaryColor: '#8B5CF6',
    gradient: ['#1e1b4b', '#2d1b69'],
    symbol: '◇',
  },
  alchemist: {
    emoji: '⚗️',
    label: 'The Alchemist',
    tagline: 'You transmute the ordinary into extraordinary.',
    primaryColor: '#8B5CF6',
    secondaryColor: '#EC4899',
    gradient: ['#2d1b69', '#4a1942'],
    symbol: '✧',
  },
};
