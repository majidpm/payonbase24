import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createPublicClient, http } from 'https://esm.sh/viem@2'
import { base } from 'https://esm.sh/viem@2/chains'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { address, message, signature } = await req.json()

    if (!address || !message || !signature) {
      throw new Error('Missing required fields')
    }

    console.log('🔍 Verifying signature for:', address)

    // 1. Verify signature with viem
    const client = createPublicClient({
      chain: base,
      transport: http(),
    })

    const isValid = await client.verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })

    if (!isValid) {
      throw new Error('Invalid signature')
    }

    console.log('✅ Signature verified')

    const walletAddress = address.toLowerCase()

    // 2. Initialize Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Find profile by wallet_address
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle()

    if (error) {
      console.error('Database error:', error)
      throw new Error('Database error')
    }

    if (!profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'WALLET_NOT_LINKED',
          message: 'This wallet is not linked to any account. Please sign in with email first, then link your wallet in Settings.',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 4. Generate session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    console.log('✅ Login successful for user:', profile.user_id)

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: profile.user_id,
          email: profile.email,
          wallet_address: profile.wallet_address,
          username: profile.username,
          display_name: profile.display_name,
        },
        expiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Verification failed',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})