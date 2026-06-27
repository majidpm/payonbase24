import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { usePrivyAuth } from '../hooks/usePrivyAuth'
import { showSuccess } from '../lib/errorHandler'

export default function Auth() {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, syncProfile, authenticated, ready, isLoading } = usePrivyAuth()

  const from = location.state?.from?.pathname || '/dashboard'

  // اگه کاربر لاگین شده، sync کن و redirect کن
  useEffect(() => {
    if (authenticated && ready) {
      syncProfile().then(() => {
        showSuccess('Welcome! 🎉')
        navigate(from, { replace: true })
      })
    }
  }, [authenticated, ready])

  async function handleSignIn() {
    await signIn()
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${
      isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'
      }`}>
        
        {/* Header */}
        <div className={`p-8 text-center ${
          isDark ? 'bg-gradient-to-br from-blue-900/50 to-purple-900/50' : 'bg-gradient-to-br from-blue-500 to-purple-600'
        }`}>
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl">
            💳
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PayOnBase24</h1>
          <p className="text-sm text-white/80">Send & receive USDC on Base</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Welcome Back
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Sign in to access your account
            </p>
          </div>

          {/* Privy Login Button */}
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all shadow-lg ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Connecting...
              </span>
            ) : (
              '🚀 Sign In with Privy'
            )}
          </button>

          {/* Info */}
          <div className={`p-4 rounded-xl text-center ${
            isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              🔒 Secure authentication powered by Privy<br />
              Support Email, SMS, and Wallet login
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="text-2xl mb-1">📧</div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="text-2xl mb-1">🦊</div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Wallet</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="text-2xl mb-1">📱</div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>SMS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}