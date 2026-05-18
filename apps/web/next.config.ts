import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@echo/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
