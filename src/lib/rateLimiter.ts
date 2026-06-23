import { supabase } from './supabase'

export interface RateLimitResponse {
  allowed: boolean
  remaining?: number
  limit?: number
  count?: number
  error?: string
  retryAfter?: number
}

export async function checkRateLimit(action: string): Promise<RateLimitResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { allowed: false, error: 'Not authenticated' }
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rate-limiter`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ 
          action, 
          userId: user.id 
        })
      }
    )

    const data: RateLimitResponse = await response.json()

    if (!response.ok) {
      return {
        allowed: false,
        error: data.error || 'Rate limit check failed',
        remaining: 0
      }
    }

    return data
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return { allowed: true }
  }
}