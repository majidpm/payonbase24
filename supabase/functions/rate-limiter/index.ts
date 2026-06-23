import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request
    const { action, userId } = await req.json()

    // Validate input
    if (!action || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing action or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Define rate limits (per hour)
    const RATE_LIMITS: Record<string, number> = {
      'create-payment': 10,
      'create-donation': 10,
      'create-travel-fund': 5,
      'create-split': 10,
    }

    const limit = RATE_LIMITS[action]
    if (!limit) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check recent actions (last 1 hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()

    const { data: recentActions, error: checkError } = await supabase
      .from('rate_limits')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('action', action)
      .gte('created_at', oneHourAgo)

    if (checkError) throw checkError

    const count = recentActions?.length || 0

    // Check if limit exceeded
    if (count >= limit) {
      return new Response(
        JSON.stringify({ 
          allowed: false,
          error: `Rate limit exceeded. You can create ${limit} ${action}s per hour.`,
          limit,
          count,
          retryAfter: 3600
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Record this action
    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert({
        user_id: userId,
        action,
        created_at: new Date().toISOString()
      })

    if (insertError) throw insertError

    // Return success
    return new Response(
      JSON.stringify({ 
        allowed: true, 
        remaining: limit - count - 1,
        limit,
        count: count + 1
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Rate limiter error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})