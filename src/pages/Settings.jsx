import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAutoProfile } from '../hooks/useAutoProfile'
import { handleAppError, showSuccess } from '../lib/errorHandler'

export default function Settings() {
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { user: privyUser } = usePrivy()
  const { wallets } = useWallets()
  const { profile, loading: profileLoading, refresh: refreshProfile } = useAutoProfile()

  const [saving, setSaving] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState(null)

  const [emailInput, setEmailInput] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)

  // ✅ ولت متصل Privy
  const ethereumWallet = wallets.find(w => 
    w.chainType === 'ethereum' || w.address?.startsWith('0x')
  )
  const connectedAddress = ethereumWallet?.address

  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    bio: '',
    wallet_address: '',
    twitter: '',
    instagram: '',
    github: '',
    telegram: '',
    youtube: '',
    discord: '',
    website: ''
  })

  const [errors, setErrors] = useState({})

  // ✅ وقتی profile لود شد، فرم رو پر کن
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        wallet_address: profile.wallet_address || '',
        twitter: profile.twitter || '',
        instagram: profile.instagram || '',
        github: profile.github || '',
        telegram: profile.telegram || '',
        youtube: profile.youtube || '',
        discord: profile.discord || '',
        website: profile.website || ''
      })
      // ✅ پر کردن email input از پروفایل
      setEmailInput(profile.email || '')
      setUsernameAvailable(true)
    }
  }, [profile])

  // ✅ چک کردن username
  async function checkUsername(username) {
    if (!username || username.length < 3) {
      setUsernameAvailable(null)
      return
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setUsernameAvailable(false)
      return
    }
    if (profile && username === profile.username) {
      setUsernameAvailable(true)
      return
    }

    setCheckingUsername(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle()
      setUsernameAvailable(!data)
    } catch (err) {
      console.error('Username check error:', err)
    } finally {
      setCheckingUsername(false)
    }
  }

  function handleUsernameChange(value) {
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    setFormData({ ...formData, username: cleanValue })
    setUsernameAvailable(null)
    clearTimeout(window.usernameCheckTimeout)
    window.usernameCheckTimeout = setTimeout(() => checkUsername(cleanValue), 500)
  }

  function validateForm() {
    const errs = {}
    if (!formData.display_name.trim()) errs.display_name = 'Display name is required'
    if (formData.bio && formData.bio.length > 200) errs.bio = 'Bio too long'
    if (formData.wallet_address && !/^0x[a-fA-F0-9]{40}$/.test(formData.wallet_address.trim())) {
      errs.wallet_address = 'Invalid Ethereum address'
    }
    if (formData.username) {
      if (formData.username.length < 3 || formData.username.length > 30) {
        errs.username = 'Username must be between 3-30 characters'
      } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
        errs.username = 'Invalid characters'
      } else if (usernameAvailable === false) {
        errs.username = 'This username is already taken'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

async function handleSave() {
  if (!validateForm() || !profile) {
    console.error('❌ Validation failed or no profile')
    return
  }

  // ✅ چک نهایی تکراری نبودن username
  if (formData.username && formData.username !== profile.username) {
    if (usernameAvailable === false) {
      handleAppError({ message: 'This username is already taken' }, 'saveSettings')
      return
    }

    if (usernameAvailable === null) {
      // هنوز چک نشده، الان چک کن
      setSaving(true)
      try {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', formData.username.toLowerCase())
          .maybeSingle()

        if (existing) {
          handleAppError({ message: 'This username is already taken' }, 'saveSettings')
          setSaving(false)
          return
        }
      } catch (err) {
        console.error('Username check error:', err)
        handleAppError({ message: 'Failed to check username' }, 'saveSettings')
        setSaving(false)
        return
      }
    }
  }

  setSaving(true)
  try {
    const oldUsername = profile.username
    const newUsername = formData.username.trim().toLowerCase() || null

    const updateData = {
      display_name: formData.display_name.trim(),
      username: newUsername,
      bio: formData.bio.trim() || null,
      wallet_address: formData.wallet_address.trim() || null,
      twitter: formData.twitter.trim() || null,
      instagram: formData.instagram.trim() || null,
      github: formData.github.trim() || null,
      telegram: formData.telegram.trim() || null,
      youtube: formData.youtube.trim() || null,
      discord: formData.discord.trim() || null,
      website: formData.website.trim() || null,
      updated_at: new Date().toISOString()
    }

    console.log('💾 Saving profile:', updateData)

    // 1. آپدیت profiles
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Save error:', error)
      
      // اگه خطای تکراری بودن username بود
      if (error.code === '23505' && error.message?.includes('username')) {
        handleAppError({ message: 'This username is already taken' }, 'saveSettings')
        return
      }
      
      throw error
    }

    console.log('✅ Profile saved:', data)

    // 2. ✅ آپدیت user_links اگه username تغییر کرده
    if (oldUsername !== newUsername) {
      try {
        console.log('🔄 Updating user_links for username change:', oldUsername, '→', newUsername)
        
        const { error: linkError } = await supabase
          .from('user_links')
          .update({ updated_at: new Date().toISOString() })
          .eq('profile_id', profile.id)

        if (linkError) {
          console.error('⚠️ Failed to update user_links:', linkError)
        } else {
          console.log('✅ user_links updated')
        }
      } catch (linkErr) {
        console.error('⚠️ user_links update failed:', linkErr)
      }
    }

    showSuccess('Settings saved successfully! ✅')
    refreshProfile()
    
    // ارسال event برای آپدیت PublicProfile
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: data }))
  } catch (err) {
    console.error('❌ Save exception:', err)
    handleAppError(err, 'saveSettings')
  } finally {
    setSaving(false)
  }
}

  // ✅ Add یا Change Email
  async function handleEmailAction() {
    if (!emailInput.trim() || !profile) return

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailInput.trim())) {
      handleAppError({ message: 'Invalid email format' }, 'emailAction')
      return
    }

    setAddingEmail(true)
    try {
      // چک کن اگه این ایمیل قبلاً استفاده شده
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailInput.trim().toLowerCase())
        .maybeSingle()

      if (existing && existing.id !== profile.id) {
        handleAppError({ message: 'This email is already in use by another account' }, 'emailAction')
        setAddingEmail(false)
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ email: emailInput.trim().toLowerCase() })
        .eq('id', profile.id)

      if (error) throw error

      const action = profile.email ? 'changed' : 'added'
      showSuccess(`Email ${action} successfully! `)
      setEditingEmail(false)
      refreshProfile()
    } catch (err) {
      console.error('Error updating email:', err)
      handleAppError(err, 'emailAction')
    } finally {
      setAddingEmail(false)
    }
  }

  // ✅ Use Current Wallet
  function useCurrentWallet() {
    if (!connectedAddress) return
    setFormData({ ...formData, wallet_address: connectedAddress })
    showSuccess('Current wallet applied! 🔗')
  }

  const inputClass = (hasError) => `w-full px-4 py-3 rounded-xl border focus:outline-none text-sm transition-all ${
    hasError
      ? 'border-red-500 focus:border-red-600 ring-2 ring-red-500/20'
      : isDark
        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
  }`

  const errorText = (msg) => msg ? (
    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
      <span>⚠️</span> {msg}
    </p>
  ) : null

  if (profileLoading || !profile) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  // ✅ ایمیل فعلی (از پروفایل یا Privy)
  const currentEmail = profile?.email || privyUser?.email?.address

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ️ Settings
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage your profile and preferences
          </p>
        </div>

        {/* Account Info */}
        <div className={`rounded-2xl border p-6 mb-6 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            👤 Account Information
          </h2>
          <div className="space-y-3">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Privy ID</p>
              <p className={`text-xs font-mono truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {privyUser?.id}
              </p>
            </div>
          </div>
        </div>

        {/* ✅ Email Section - همیشه نشون داده میشه */}
        <div className={`rounded-2xl border p-6 mb-6 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📧 Email Address
          </h2>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {currentEmail 
              ? 'Update your email address for account recovery' 
              : 'Add an email for backup access and notifications'}
          </p>

          <div className="space-y-4">
            {editingEmail ? (
              // ✅ حالت ویرایش
              <div className="space-y-3">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    New Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className={inputClass(false)}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleEmailAction}
                    disabled={!emailInput.trim() || addingEmail}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      !emailInput.trim() || addingEmail
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                    }`}
                  >
                    {addingEmail ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </span>
                    ) : currentEmail ? (
                      '💾 Save New Email'
                    ) : (
                      '📧 Add Email'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditingEmail(false)
                      setEmailInput(currentEmail || '')
                    }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                      isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // ✅ حالت نمایش
              <div className="space-y-3">
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Current Email
                  </p>
                  {currentEmail ? (
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {currentEmail}
                    </p>
                  ) : (
                    <p className={`text-sm italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      No email added yet
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    setEditingEmail(true)
                    setEmailInput(currentEmail || '')
                  }}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isDark 
                      ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-800' 
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  {currentEmail ? '✏️ Change Email' : '📧 Add Email'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Section */}
        <div className={`rounded-2xl border p-6 mb-6 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ✏️ Profile Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Display Name *
              </label>
              <input
                type="text"
                placeholder="Your name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className={inputClass(!!errors.display_name)}
              />
              {errorText(errors.display_name)}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
  Username
</label>
              <div className="flex">
                <span className={`inline-flex items-center px-3 rounded-l-xl border border-r-0 text-sm ${
                  isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>@</span>
               <input
  type="text"
  placeholder="Choose a username"
  value={formData.username || ''}
  onChange={(e) => handleUsernameChange(e.target.value)}
  className={`${inputClass(!!errors.username)} rounded-l-none`}
/>
              </div>
              
              <div className="mt-1 flex items-center gap-2">
                {profile?.username && (
                  <p className="text-xs text-green-500">
                    ✅ Username already set: @{profile.username}
                  </p>
                )}
                {!profile?.username && checkingUsername && (
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    ⏳ Checking availability...
                  </p>
                )}
                {!profile?.username && !checkingUsername && usernameAvailable === true && formData.username && (
                  <p className="text-xs text-green-500">✅ Available</p>
                )}
                {!profile?.username && !checkingUsername && usernameAvailable === false && (
                  <p className="text-xs text-red-500">❌ Taken</p>
                )}
              </div>
              
              {errorText(errors.username)}
              
              {!profile?.username && formData.username && (
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Your public profile: <span className="font-mono">{window.location.origin}/u/{formData.username}</span>
                </p>
              )}
              
              {profile?.username && (
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Your public profile: <span className="font-mono">{window.location.origin}/u/{profile.username}</span>
                </p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Bio</label>
              <textarea
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                className={`${inputClass(!!errors.bio)} resize-none`}
              />
              {errorText(errors.bio)}
              <p className={`text-xs mt-1 text-right ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {formData.bio.length}/200
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div className={`rounded-2xl border p-6 mb-6 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>💳 Wallet Address</h2>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            This address will receive all your payments, donations, and travel fund contributions
          </p>

          <div className="space-y-4">
            {connectedAddress && (
              <div className={`p-4 rounded-xl border-2 border-dashed ${
                isDark ? 'bg-blue-900/20 border-blue-500/50' : 'bg-blue-50 border-blue-300'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🦊</span>
                  <p className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                    Currently Connected Wallet
                  </p>
                </div>
                <p className={`font-mono text-xs break-all mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {connectedAddress}
                </p>
                <button
                  onClick={useCurrentWallet}
                  disabled={formData.wallet_address === connectedAddress}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    formData.wallet_address === connectedAddress
                      ? 'bg-green-500/20 text-green-500 cursor-default'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                  }`}
                >
                  {formData.wallet_address === connectedAddress ? '✅ Already Using' : '🔄 Use Current Wallet'}
                </button>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Or Enter Manually
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={formData.wallet_address}
                onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                className={`${inputClass(!!errors.wallet_address)} font-mono text-xs`}
              />
              {errorText(errors.wallet_address)}
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className={`rounded-2xl border p-6 mb-6 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>🔗 Social Media</h2>
          <div className="space-y-4">
            {[
              { key: 'twitter', icon: '🐦', label: 'Twitter / X' },
              { key: 'instagram', icon: '📸', label: 'Instagram' },
              { key: 'github', icon: '💻', label: 'GitHub' },
              { key: 'telegram', icon: '✈️', label: 'Telegram' },
              { key: 'youtube', icon: '📺', label: 'YouTube' },
              { key: 'discord', icon: '🎮', label: 'Discord' },
              { key: 'website', icon: '🌍', label: 'Website' }
            ].map(({ key, icon, label }) => (
              <div key={key}>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {icon} {label}
                </label>
                <input
                  type={key === 'website' ? 'url' : 'text'}
                  placeholder={key === 'website' ? 'https://yourwebsite.com' : 'username'}
                  value={formData[key]}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  className={inputClass(false)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div className={`rounded-2xl border p-6 mb-6 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}> Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Dark Mode</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Toggle theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isDark ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDark ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || checkingUsername}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </span>
            ) : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}