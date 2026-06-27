import { useState, useEffect } from 'react'
import { createBaseAccountSDK } from '@base-org/account'
import { supabase } from '../lib/supabase'

export function useSIWE() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [sdk, setSdk] = useState(null)

  // Initialize SDK
  useEffect(() => {
    const baseSdk = createBaseAccountSDK({
      appName: 'PayOnBase24',
      appChainIds: [8453],
    })
    setSdk(baseSdk)
  }, [])

  async function signInWithEthereum() {
    if (!sdk) {
      return { success: false, error: 'SDK not initialized' }
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔐 Starting Base authentication...')

      const provider = sdk.getProvider()

      const nonce = crypto.randomUUID().replace(/-/g, '')
      console.log('🎲 Nonce generated:', nonce)

      // Switch to Base chain
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        })
        console.log('✅ Switched to Base')
      } catch (switchError) {
        console.log('Chain switch result:', switchError)
      }

      // Connect and authenticate with SIWE
      const { accounts } = await provider.request({
        method: 'wallet_connect',
        params: [
          {
            version: '1',
            capabilities: {
              signInWithEthereum: {
                nonce,
                chainId: '0x2105',
              },
            },
          },
        ],
      })

      const { address } = accounts[0]
      const { message, signature } = accounts[0].capabilities.signInWithEthereum

      console.log('✅ Signature received')
      console.log('📍 Address:', address)

      // Verify with backend
      const { data, error: invokeError } = await supabase.functions.invoke('verify-siwe', {
        body: { address, message, signature },
      })

      if (invokeError) {
        console.error('Edge function error:', invokeError)
        throw new Error('Backend verification failed. Please try again.')
      }

      if (!data?.success) {
        if (data?.error === 'WALLET_NOT_LINKED') {
          throw new Error('This wallet is not linked. Sign in with email first, then link wallet in Settings.')
        }
        throw new Error(data?.message || 'Verification failed')
      }

      // Store session
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      localStorage.setItem('siwe_session', JSON.stringify({
        address: address.toLowerCase(),
        userId: data.user.id,
        expiresAt,
      }))

      setUser(data.user)
      console.log('✅ Base authentication successful!')
      return { success: true, user: data.user }

    } catch (err) {
      console.error('❌ Base auth error:', err)
      
      let errorMsg = 'Authentication failed'
      
      // ✅ Handle user rejection
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        errorMsg = 'Authentication was cancelled. Please try again and approve the request.'
      } else if (err.message?.includes('Request rejected')) {
        errorMsg = 'You cancelled the authentication. Please try again.'
      } else if (err.message?.includes('method_not_supported')) {
        errorMsg = 'Your wallet does not support Base Account. Please use Coinbase Wallet.'
      } else if (err.message?.includes('WALLET_NOT_LINKED')) {
        errorMsg = 'This wallet is not linked. Sign in with email first, then link wallet in Settings.'
      } else if (err.message?.includes('Backend verification failed')) {
        errorMsg = 'Server error. Please check your Edge Function deployment.'
      } else if (err.message) {
        errorMsg = err.message
      }
      
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }

  function signOut() {
    localStorage.removeItem('siwe_session')
    setUser(null)
  }

  function getSession() {
    try {
      const session = localStorage.getItem('siwe_session')
      if (!session) return null
      const parsed = JSON.parse(session)
      if (new Date(parsed.expiresAt) < new Date()) {
        localStorage.removeItem('siwe_session')
        return null
      }
      return parsed
    } catch {
      return null
    }
  }

  return { signInWithEthereum, signOut, getSession, isLoading, error, user }
}