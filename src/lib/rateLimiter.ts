export interface RateLimitResponse {
  allowed: boolean
  remaining?: number
  limit?: number
  count?: number
  error?: string
  retryAfter?: number
}

// ✅ استفاده از localStorage به جای Supabase Auth
export async function checkRateLimit(action: string): Promise<RateLimitResponse> {
  try {
    const key = `rate_limit_${action}`
    const now = Date.now()
    const windowMs = 60 * 60 * 1000 // 1 hour
    const maxRequests = 5

    const stored = localStorage.getItem(key)
    
    if (stored) {
      try {
        const { count, resetAt } = JSON.parse(stored)
        
        // اگه window expired شده، reset کن
        if (now > resetAt) {
          localStorage.setItem(key, JSON.stringify({ count: 1, resetAt: now + windowMs }))
          return { 
            allowed: true, 
            remaining: maxRequests - 1,
            limit: maxRequests,
            count: 1
          }
        }
        
        // اگه به limit رسیدیم
        if (count >= maxRequests) {
          const retryAfter = Math.ceil((resetAt - now) / 1000)
          return { 
            allowed: false, 
            error: `Rate limit exceeded. Try again in ${Math.ceil((resetAt - now) / 60000)} minutes`,
            remaining: 0,
            retryAfter
          }
        }
        
        // افزایش count
        const newCount = count + 1
        localStorage.setItem(key, JSON.stringify({ count: newCount, resetAt }))
        return { 
          allowed: true, 
          remaining: maxRequests - newCount,
          limit: maxRequests,
          count: newCount
        }
      } catch (parseError) {
        // اگه parse نشد، از اول شروع کن
        console.warn('Rate limit parse error, resetting:', parseError)
      }
    }
    
    // اولین درخواست
    localStorage.setItem(key, JSON.stringify({ count: 1, resetAt: now + windowMs }))
    return { 
      allowed: true, 
      remaining: maxRequests - 1,
      limit: maxRequests,
      count: 1
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // اگه ارور داشت، اجازه بده
    return { allowed: true, remaining: 5 }
  }
}

// ✅ تابع برای reset کردن rate limit (اختیاری)
export function resetRateLimit(action: string): void {
  const key = `rate_limit_${action}`
  localStorage.removeItem(key)
}

// ✅ تابع برای گرفتن وضعیت rate limit (برای نمایش در UI)
export function getRateLimitStatus(action: string): { count: number; remaining: number; resetAt: number } | null {
  const key = `rate_limit_${action}`
  const stored = localStorage.getItem(key)
  
  if (!stored) return null
  
  try {
    const { count, resetAt } = JSON.parse(stored)
    return { count, remaining: 5 - count, resetAt }
  } catch {
    return null
  }
}