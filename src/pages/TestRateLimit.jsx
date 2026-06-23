import { useState } from 'react'
import { checkRateLimit } from '../lib/rateLimiter'
import { useTheme } from '../contexts/ThemeContext'

export default function TestRateLimit() {
  const { isDark } = useTheme()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function testAction(action) {
    setLoading(true)
    try {
      const res = await checkRateLimit(action)
      setResult(res)
    } catch (err) {
      setResult({ error: err.message })
    }
    setLoading(false)
  }

  return (
    <div className={`min-h-screen p-8 ${isDark ? 'bg-gray-950 text-white' : 'bg-blue-50 text-gray-900'}`}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 Rate Limit Test</h1>
        
        <div className="space-y-3 mb-6">
          <button
            onClick={() => testAction('create-payment')}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            Test: Create Payment (Limit: 10/hour)
          </button>
          <button
            onClick={() => testAction('create-donation')}
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            Test: Create Donation (Limit: 10/hour)
          </button>
          <button
            onClick={() => testAction('create-travel-fund')}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            Test: Create Travel Fund (Limit: 5/hour)
          </button>
          <button
            onClick={() => testAction('create-split')}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            Test: Create Split (Limit: 10/hour)
          </button>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}

        {result && (
          <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">Result:</h2>
            <pre className={`p-4 rounded-lg overflow-auto text-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              {JSON.stringify(result, null, 2)}
            </pre>
            
            {result.allowed && (
              <div className="mt-4 p-4 rounded-lg bg-green-500/20 text-green-500">
                ✅ Allowed! {result.remaining} remaining
              </div>
            )}
            
            {!result.allowed && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/20 text-red-500">
                ❌ Blocked: {result.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}