import type { NextConfig } from 'next'

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Disable MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer policy — don't leak path to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Permissions policy — disable features ECHO doesn't use
  {
    key: 'Permissions-Policy',
    value: 'camera=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  // Strict Transport Security (HTTPS only, 1 year)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // DNS prefetch control
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig: NextConfig = {
  transpilePackages: [
    '@echo-self/shared-types',
    '@echo-self/design-system',
    '@echoself/auth',
    '@echoself/supabase',
  ],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  headers: async () => [
    {
      // Apply to all routes
      source: '/:path*',
      headers: securityHeaders,
    },
  ],

  experimental: {
    typedRoutes: true,
  },

  // Workspace packages are raw TypeScript whose ESM re-exports use explicit
  // `.js` specifiers (e.g. `export * from './server.js'`). tsc resolves these
  // via bundler module resolution, but webpack needs an extension alias to map
  // `.js` → the real `.ts`/`.tsx` sources.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js':  ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return config
  },
}

export default nextConfig
