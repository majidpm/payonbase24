import { useEffect, useState, useRef, useCallback } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { supabase } from '../lib/supabase'

export function useAutoProfile() {
  const { user: privyUser, ready } = usePrivy()
  const { wallets } = useWallets()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true) // ✅ همیشه با true شروع کن
  
  const isProcessingRef = useRef(false)
  const hasLoadedRef = useRef(false) // ✅ جلوگیری از اجرای چندباره

  const getPrivyInfo = useCallback(() => {
    if (!privyUser) return { email: null, wallet: null, privyId: null }

    const privyId = privyUser.id
    let email = null
    let wallet = null

    if (privyUser.email?.address) {
      email = privyUser.email.address
    }
    if (privyUser.wallet?.address) {
      wallet = privyUser.wallet.address.toLowerCase()
    }

    if (privyUser.linkedAccounts && Array.isArray(privyUser.linkedAccounts)) {
      for (const account of privyUser.linkedAccounts) {
        if (account.type === 'email' && account.address) {
          email = account.address
        }
        if (
          (account.type === 'wallet' || account.address?.startsWith('0x')) &&
          account.address &&
          account.chainType !== 'solana'
        ) {
          wallet = account.address.toLowerCase()
        }
      }
    }

    if (!wallet && wallets.length > 0) {
      const ethWallet = wallets.find(w => 
        w.chainType === 'ethereum' || w.address?.startsWith('0x')
      )
      if (ethWallet) {
        wallet = ethWallet.address.toLowerCase()
      }
    }

    return { email, wallet, privyId }
  }, [privyUser, wallets])

  useEffect(() => {
    // ✅ تا وقتی Privy آماده نشده، loading رو true نگه دار
    if (!ready) {
      return // loading هنوز true هست
    }

    // ✅ اگه قبلاً لود شده و پروفایل داریم، دوباره اجرا نکن
    if (hasLoadedRef.current && profile) {
      setLoading(false)
      return
    }

    // ✅ اگه Privy آماده شد ولی کاربر لاگین نکرده
    if (ready && !privyUser) {
      setLoading(false)
      hasLoadedRef.current = true
      return
    }

    ensureProfile()
  }, [ready, privyUser?.id]) // ✅ فقط وقتی privyId تغییر کنه

  async function ensureProfile() {
    // ✅ جلوگیری از اجرای همزمان
    if (isProcessingRef.current) {
      console.log('⏳ Already processing, skipping...')
      return
    }

    isProcessingRef.current = true
    // ✅ loading رو اینجا true کن (نه قبلش)
    
    try {
      const { email, wallet, privyId } = getPrivyInfo()
      console.log('🔍 Checking for profile...', { privyId, email, wallet })

      let profileData = null

      // ✅ 1. چک user_links با email
      if (email) {
        const { data: linkData, error: linkError } = await supabase
          .from('user_links')
          .select('*, profiles(*)')
          .eq('email', email)
          .maybeSingle()

        if (linkError) console.error('❌ user_links email error:', linkError)
        
        if (linkData && linkData.profiles) {
          profileData = linkData.profiles
          console.log('✅ Found via user_links (email):', profileData.id)
          
          if (privyId && (!linkData.privy_ids || !linkData.privy_ids.includes(privyId))) {
            const updatedPrivyIds = [...(linkData.privy_ids || []), privyId]
            await supabase
              .from('user_links')
              .update({ privy_ids: updatedPrivyIds })
              .eq('id', linkData.id)
            console.log('🔄 Updated privy_ids:', updatedPrivyIds)
          }
        }
      }

      // ✅ 2. چک user_links با wallet
      if (!profileData && wallet) {
        const { data: linkData, error: linkError } = await supabase
          .from('user_links')
          .select('*, profiles(*)')
          .eq('wallet_address', wallet)
          .maybeSingle()

        if (linkError) console.error('❌ user_links wallet error:', linkError)
        
        if (linkData && linkData.profiles) {
          profileData = linkData.profiles
          console.log('✅ Found via user_links (wallet):', profileData.id)
          
          if (privyId && (!linkData.privy_ids || !linkData.privy_ids.includes(privyId))) {
            const updatedPrivyIds = [...(linkData.privy_ids || []), privyId]
            await supabase
              .from('user_links')
              .update({ privy_ids: updatedPrivyIds })
              .eq('id', linkData.id)
            console.log('🔄 Updated privy_ids:', updatedPrivyIds)
          }
        }
      }

      // ✅ 3. چک profiles
      if (!profileData && email) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle()

        if (error) console.error('❌ profiles email error:', error)
        if (data) {
          profileData = data
          console.log('✅ Found in profiles (email):', data.id)
        }
      }

      if (!profileData && wallet) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('wallet_address', wallet)
          .maybeSingle()

        if (error) console.error('❌ profiles wallet error:', error)
        if (data) {
          profileData = data
          console.log('✅ Found in profiles (wallet):', data.id)
        }
      }

      // ✅ 4. اگه پیدا شد
      if (profileData) {
        console.log('✅ Profile loaded:', profileData.id)
        setProfile(profileData)
        hasLoadedRef.current = true
      } else {
        // ✅ 5. پروفایل جدید
        console.log('🆕 Creating new profile...')
        const created = await createProfile({ email, wallet, privyId })
        if (created) {
          console.log('✅ Profile created:', created.id)
          setProfile(created)
          hasLoadedRef.current = true
        }
      }
    } catch (err) {
      console.error('❌ ensureProfile error:', err)
    } finally {
      isProcessingRef.current = false
      setLoading(false) // ✅ اینجا loading رو false کن
    }
  }

  async function createProfile({ email, wallet, privyId }) {
    try {
      if (email) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle()
        
        if (existing) {
          throw new Error('Email already registered')
        }
      }

      if (wallet) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('wallet_address', wallet)
          .maybeSingle()
        
        if (existing) {
          throw new Error('Wallet already registered')
        }
      }

      const displayName = email?.split('@')[0] || `User_${wallet?.slice(2, 6) || Math.random().toString(36).slice(2, 6)}`
      const username = null

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          privy_id: privyId,
          email: email || null,
          wallet_address: wallet || null,
          display_name: displayName,
          username: username,
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (err) {
      console.error('❌ Create profile error:', err)
      throw err
    }
  }

  async function refresh() {
    hasLoadedRef.current = false
    setProfile(null)
    await ensureProfile()
  }

  return { profile, loading, refresh }
}