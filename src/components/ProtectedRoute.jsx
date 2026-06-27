import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { usePrivy } from '@privy-io/react-auth'
import { useAutoProfile } from '../hooks/useAutoProfile'

export default function ProtectedRoute({ children }) {
  const { authenticated, ready } = usePrivy()
  const { profile, loading: profileLoading } = useAutoProfile()
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [timeoutReached, setTimeoutReached] = useState(false)

  // ✅ Timeout برای جلوگیری از infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('⏰ ProtectedRoute: Timeout reached')
      setTimeoutReached(true)
    }, 10000) // 10 seconds

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    console.log('🔍 ProtectedRoute state:', {
      ready,
      authenticated,
      profileLoading,
      profile: profile?.id,
      isChecking
    })

    if (ready && !profileLoading) {
      console.log('✅ ProtectedRoute: Ready, stopping check')
      setIsChecking(false)
    }
  }, [ready, profileLoading, profile])

  if (isChecking && !timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // ✅ اگه authenticated نیست، redirect به auth
  if (!authenticated) {
    console.log('❌ ProtectedRoute: Not authenticated, redirecting to /auth')
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // ✅ اگه profile نیست، loading نشون بده (نه redirect)
  if (!profile) {
    console.log('⚠️ ProtectedRoute: No profile, showing loading')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Creating your profile...</p>
          {timeoutReached && (
            <p className="text-red-400 text-xs mt-2">
              Taking longer than expected. Please refresh the page.
            </p>
          )}
        </div>
      </div>
    )
  }

  console.log('✅ ProtectedRoute: All good, rendering children')
  return children
}