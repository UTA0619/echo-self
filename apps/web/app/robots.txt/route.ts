import { NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.echoself.app'

export function GET() {
  const body = `User-agent: *
Allow: /

# Public pages
Allow: /identity/
Allow: /join/

# Block private dashboard and API routes
Disallow: /api/
Disallow: /settings
Disallow: /onboarding
Disallow: /admin

Sitemap: ${APP_URL}/sitemap.xml
`
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
