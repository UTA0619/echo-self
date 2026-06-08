import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.echoself.app'

function xmlEntry(loc: string, lastmod?: string, priority = '0.8', changefreq = 'weekly') {
  return `  <url>
    <loc>${loc}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0]!

  // Fetch public identity share pages for dynamic routes
  let shareEntries: string[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('identity_shares')
      .select('id, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(500)

    shareEntries = (data ?? []).map(share =>
      xmlEntry(
        `${APP_URL}/identity/${share.id}`,
        new Date(share.created_at).toISOString().split('T')[0] ?? today,
        '0.5',
        'monthly',
      ),
    )
  } catch {
    // Non-critical — just skip dynamic entries
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntry(APP_URL, today, '1.0', 'daily')}
${xmlEntry(`${APP_URL}/auth`, today, '0.6', 'monthly')}
${shareEntries.join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 's-maxage=86400, stale-while-revalidate',
    },
  })
}
