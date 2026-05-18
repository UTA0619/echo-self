import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  const { query, limit = 10 } = await req.json()

  if (!query) {
    return new Response(JSON.stringify({ error: 'query is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Embed the query
  const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: query }),
  })
  const { data: embData } = await embeddingRes.json()
  const queryEmbedding = embData?.[0]?.embedding

  // Semantic similarity search
  const { data: semanticResults } = await supabase.rpc('match_memories', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: limit,
    p_user_id: user.id,
  })

  // Recent memories (last 7 days, always included)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString().split('T')[0]
  const { data: recentResults } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .gte('memory_date', sevenDaysAgo)
    .order('memory_date', { ascending: false })
    .limit(5)

  // Merge, deduplicate
  const seen = new Set<string>()
  const merged = [...(semanticResults ?? []), ...(recentResults ?? [])].filter((m) => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })

  return new Response(JSON.stringify({ memories: merged }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
