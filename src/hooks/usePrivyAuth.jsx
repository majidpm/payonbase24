import { usePrivy, useWallets } from '@privy-io/react-auth'
import { supabase } from '../lib/supabase'
import { useState } from 'react'

export function usePrivyAuth() {
  const { login, logout, authenticated, user, ready } = usePrivy()
  const { wallets } = useWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // لاگین با Privy
  async function signIn() {
    setIsLoading(true)
    setError(null)
    try {
      await login()
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  // بعد از لاگین موفق، پروفایل رو sync کن
  async function syncProfile() {
    if (!authenticated || !user) return null

    try {
      // آدرس ولت اصلی
      const walletAddress = wallets[0]?.address?.toLowerCase()
      const email = user.email?.address

      // چک کن پروفایل با این ایمیل یا ولت هست
      let profile = null

      if (email) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle()
        profile = data
      }

      if (!profile && walletAddress) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('wallet_address', walletAddress)
          .maybeSingle()
        profile = data
      }

      // اگه پروفایل نیست، بساز
      if (!profile) {
        const { data: newUser } = await supabase.auth.signUp({
          email: email || `${walletAddress?.slice(2, 10)}@privy.base`,
          password: crypto.randomUUID(),
        })

        if (newUser?.user) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              user_id: newUser.user.id,
              email: email || null,
              wallet_address: walletAddress || null,
              display_name: user.email?.address?.split('@')[0] || `User ${walletAddress?.slice(2, 6)}`,
              username: (email?.split('@')[0] || `user_${walletAddress?.slice(2, 8)}`).toLowerCase(),
            })
            .select()
            .single()

          profile = newProfile
        }
      } else {
        // اگه پروفایل هست ولی wallet_address نداره، آپدیت کن
        if (walletAddress && !profile.wallet_address) {
          await supabase
            .from('profiles')
            .update({ wallet_address: walletAddress })
            .eq('id', profile.id)
        }
      }

      // Session ذخیره کن
      localStorage.setItem('privy_session', JSON.stringify({
        userId: profile?.user_id,
        profileId: profile?.id,
        walletAddress,
        email,
      }))

      return profile
    } catch (err) {
      console.error('Sync profile error:', err)
      return null
    }
  }

  async function signOut() {
    localStorage.removeItem('privy_session')
    await logout()
  }

  function getSession() {
    try {
      const session = localStorage.getItem('privy_session')
      if (!session) return null
      return JSON.parse(session)
    } catch {
      return null
    }
  }

  return {
    signIn,
    signOut,
    getSession,
    syncProfile,
    isLoading,
    error,
    authenticated,
    ready,
    user,
    wallets,
  }
}