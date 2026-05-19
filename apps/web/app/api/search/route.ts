import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: 3072,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI embedding error: ${res.status}`)
  const json = await res.json() as { data: Array<{ embedding: number[] }> }
  return json.data[0].embedding
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const embedding = await generateEmbedding(query)

    const { data, error } = await supabase.rpc('search_entries', {
      p_user_id: user.id,
      p_query_embedding: JSON.stringify(embedding),
      p_match_count: 10,
    })

    if (error) {
      // Fallback to text search if vector RPC not available
      const { data: textData, error: textError } = await supabase
        .from('entries')
        .select('id, content, created_at, emotion, ai_response')
        .eq('user_id', user.id)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10)

      if (textError) throw textError
      return NextResponse.json({ results: textData ?? [], mode: 'text' })
    }

    return NextResponse.json({ results: data ?? [], mode: 'semantic' })
  } catch (err) {
    console.error('search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
