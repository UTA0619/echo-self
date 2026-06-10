import { defineConfig } from 'vitest/config'

/**
 * Vitest config for the Expo mobile app.
 *
 * The unit tests here cover pure, framework-agnostic logic (formatting
 * helpers, onboarding payload builders) that have no React Native or Expo
 * runtime imports — so they run cleanly in a Node environment without the
 * heavy jest-expo native transform pipeline.
 *
 * React-Native component/integration tests, if added later, should live in
 * a separate Detox / RN Testing Library setup.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
