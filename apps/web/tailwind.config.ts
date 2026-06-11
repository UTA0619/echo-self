import type { Config } from 'tailwindcss'
import { echoTailwindPreset } from '@echo-self/design-system'

const config: Config = {
  // Shared ECHO design tokens from packages/design-system
  presets: [echoTailwindPreset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  // Per-app overrides on top of the preset
  theme: {
    extend: {
      // Override font families with CSS variable fonts loaded in layout.tsx
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
