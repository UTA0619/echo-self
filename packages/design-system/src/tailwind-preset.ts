/**
 * ECHO Design System — Tailwind CSS Preset
 *
 * Import in tailwind.config.ts:
 *
 *   import { echoTailwindPreset } from '@echo-self/design-system/tailwind-preset'
 *
 *   const config: Config = {
 *     presets: [echoTailwindPreset],
 *     ...
 *   }
 *
 * This preset exports all echo-* color aliases, font families, spacing
 * extensions, and animation utilities that match the ECHO design language.
 */

import type { Config } from 'tailwindcss'

export const echoTailwindPreset: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        // Base backgrounds
        echo: {
          bg:         '#0A0B0F',
          surface:    '#141620',
          'surface-2': '#1E2030',
          'surface-3': '#252840',

          // Accent
          accent:     '#7B6CF6',
          'accent-light': '#9B8DF8',
          'accent-dark': '#5B4DD6',

          // Warm secondary
          warm:       '#F6A26C',
          'warm-light': '#F8B98A',
          'warm-dark': '#E88A4A',

          // Violet
          violet:     '#7C3AED',
          'violet-light': '#8B5CF6',

          // Cyan
          cyan:       '#06B6D4',
          'cyan-light': '#22D3EE',

          // Text hierarchy
          text:       '#F0F0F5',
          'text-secondary': 'rgba(240,240,245,0.60)',
          'text-muted':     'rgba(240,240,245,0.35)',
          muted:      '#8B8FA8',

          // Borders
          border:     '#2A2D42',
          'border-light': 'rgba(255,255,255,0.12)',
          'border-faint': 'rgba(255,255,255,0.06)',

          // Semantic
          success:    '#10B981',
          warning:    '#F59E0B',
          error:      '#EF4444',

          // Emotions
          joy:        '#FBBF24',
          sadness:    '#6366F1',
          anger:      '#EF4444',
          fear:       '#9CA3AF',
          surprise:   '#06B6D4',
          disgust:    '#10B981',
          anticipation: '#F59E0B',
          trust:      '#EC4899',
          optimism:   '#FCD34D',
          love:       '#8B5CF6',
          awe:        '#4F46E5',
        },
      },

      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-geist-mono)', 'monospace'],
      },

      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
        '88':  '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },

      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },

      boxShadow: {
        'echo-glow':    '0 0 32px rgba(123,108,246,0.25)',
        'echo-warm':    '0 0 32px rgba(246,162,108,0.20)',
        'echo-subtle':  '0 4px 20px rgba(0,0,0,0.40)',
        'echo-card':    '0 2px 12px rgba(0,0,0,0.30)',
        'echo-float':   '0 8px 32px rgba(0,0,0,0.50)',
      },

      backdropBlur: {
        xs: '2px',
      },

      animation: {
        'fade-up':      'fadeUp 0.4s ease-out',
        'fade-in':      'fadeIn 0.3s ease-out',
        'slide-in':     'slideIn 0.35s cubic-bezier(0.16,1,0.3,1)',
        'pulse-soft':   'pulseSoft 3s ease-in-out infinite',
        'pulse-accent': 'pulseAccent 2.5s ease-in-out infinite',
        'shimmer':      'shimmer 1.8s linear infinite',
        'spin-slow':    'spin 4s linear infinite',
        'memory-reveal': 'memoryReveal 0.6s cubic-bezier(0.16,1,0.3,1) both',
      },

      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        pulseAccent: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(123,108,246,0)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(123,108,246,0.2)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        memoryReveal: {
          '0%':   { opacity: '0', transform: 'scale(0.95) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
