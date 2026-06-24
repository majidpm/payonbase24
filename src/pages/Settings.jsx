import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'
import { handleAppError, showSuccess } from '../lib/errorHandler'
import { FormSkeleton } from '../components/Skeleton'

export default function Settings() {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  
  
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  
  const [socials, setSocials] = useState({
    twitter: '', instagram: '', github: '',
    telegram: '', youtube: '', discord: '', website: ''
  });
  
  const [usernameError, setUsernameError] = useState('');
  const [walletError, setWalletError] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setUsername(profileData.username || '');
        setDisplayName(profileData.display_name || '');
        setBio(profileData.bio || '');
        setWalletAddress(profileData.wallet_address || '');
        setSocials({
          twitter: profileData.twitter || '',
          instagram: profileData.instagram || '',
          github: profileData.github || '',
          telegram: profileData.telegram || '',
          youtube: profileData.youtube || '',
          discord: profileData.discord || '',
          website: profileData.website || ''
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setMessage('❌ Failed to load profile');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function checkUsernameAvailability(value) {
    if (!value || value === profile?.username) {
      setUsernameError('');
      return true;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
      setUsernameError('Username must be 3-20 characters (letters, numbers, underscores only)');
      return false;
    }
    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', value)
        .single();
      if (error && error.code === 'PGRST116') {
        setUsernameError('');
        return true;
      } else if (data) {
        setUsernameError('This username is already taken');
        return false;
      }
    } catch (err) {
      console.error('Username check error:', err);
    } finally {
      setCheckingUsername(false);
    }
  }

  function validateWallet(address) {
    if (!address) { setWalletError(''); return true; }
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethRegex.test(address)) {
      setWalletError('Invalid wallet address (must start with 0x and be 42 characters)');
      return false;
    }
    setWalletError('');
    return true;
  }

  async function updateProfile(e) {
    e.preventDefault()
    setMessage('')
    
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameError('Username must be 3-20 characters (letters, numbers, underscores only)')
      return
    }
    if (walletAddress && !validateWallet(walletAddress)) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          username: username.trim() || null,
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          wallet_address: walletAddress.trim() || null,
          twitter: socials.twitter.trim() || null,
          instagram: socials.instagram.trim() || null,
          github: socials.github.trim() || null,
          telegram: socials.telegram.trim() || null,
          youtube: socials.youtube.trim() || null,
          discord: socials.discord.trim() || null,
          website: socials.website.trim() || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          setUsernameError('This username is already taken')
        } else {
          throw error
        }
        return
      }

      setProfile(data)
      showSuccess('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      handleAppError(err, 'updateProfile')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    if (window.confirm('Are you sure you want to sign out?')) {
      try {
        await supabase.auth.signOut()
        showSuccess('Signed out successfully')
        navigate('/')
      } catch (err) {
        handleAppError(err, 'handleLogout')
      }
    }
  }

  async function handleResetPassword() {
    if (!user?.email) return
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`
      })

      if (error) throw error
      
      showSuccess('Password reset email sent! Check your inbox.')
    } catch (err) {
      handleAppError(err, 'handleResetPassword')
    }
  }

  function getPublicProfileUrl() {
    if (!username) return null;
    return `${window.location.origin}/u/${username}`;
  }

if (loading) {
  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className={`h-8 rounded w-48 mb-6 animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          <FormSkeleton />
        </div>
      </div>
    </div>
  )
}

  const socialFields = [
    { key: 'twitter', icon: '🐦', label: 'Twitter / X', placeholder: 'username' },
    { key: 'instagram', icon: '📸', label: 'Instagram', placeholder: 'username' },
    { key: 'github', icon: '💻', label: 'GitHub', placeholder: 'username' },
    { key: 'telegram', icon: '✈️', label: 'Telegram', placeholder: 'username' },
    { key: 'youtube', icon: '📺', label: 'YouTube', placeholder: 'channel or URL' },
    { key: 'discord', icon: '🎮', label: 'Discord', placeholder: 'username or ID' },
    { key: 'website', icon: '🌍', label: 'Website', placeholder: 'https://example.com' }
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-10">
          <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ⚙️ Settings
          </h1>
          <p className={`text-base sm:text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage your profile and account preferences
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-3 sm:p-4 rounded-2xl text-center text-sm sm:text-base font-medium transition-all ${
            messageType === 'success'
              ? isDark ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-green-50 text-green-700 border border-green-200'
              : isDark ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={updateProfile} className="space-y-6 sm:space-y-8">
          {/* Profile Information */}
          <div className={`rounded-3xl shadow-xl p-5 sm:p-8 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span className="text-2xl sm:text-3xl">👤</span>
              Profile Information
            </h2>

            <div className="space-y-4 sm:space-y-6">
              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Address
                </label>
                <div className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-2xl border text-sm sm:text-base ${isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                  {user?.email}
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Email cannot be changed
                </p>
              </div>

              {/* Username */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Username
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    /u/
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); checkUsernameAvailability(e.target.value); }}
                    placeholder="your-username"
                    className={`w-full pl-12 sm:pl-14 pr-5 py-3 sm:py-4 border rounded-2xl focus:outline-none text-base sm:text-lg font-mono ${
                      usernameError
                        ? 'border-red-500 focus:border-red-600 ring-2 ring-red-500/20'
                        : isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'bg-white border-blue-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                    }`}
                  />
                  {checkingUsername && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-blue-500">
                      Checking...
                    </span>
                  )}
                </div>
                {usernameError && (
                  <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                    <span>⚠️</span> {usernameError}
                  </p>
                )}
                <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Your public profile: <span className="font-mono text-blue-500">/u/{username || 'username'}</span>
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className={`w-full px-4 sm:px-5 py-3 sm:py-4 border rounded-2xl focus:outline-none text-base sm:text-lg ${
                    isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'bg-white border-blue-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                  }`}
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  This name will be displayed on your profile
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  maxLength={500}
                  className={`w-full px-4 sm:px-5 py-3 sm:py-4 border rounded-2xl focus:outline-none text-base sm:text-lg resize-none ${
                    isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'bg-white border-blue-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                  }`}
                />
                <p className={`text-xs mt-1 text-right ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {bio.length}/500 characters
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Address */}
          <div className={`rounded-3xl shadow-xl p-5 sm:p-8 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span className="text-2xl sm:text-3xl">💳</span>
              Donation Wallet
            </h2>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Wallet Address (Base Network)
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => { setWalletAddress(e.target.value); validateWallet(e.target.value); }}
                placeholder="0x..."
                className={`w-full px-4 sm:px-5 py-3 sm:py-4 border rounded-2xl focus:outline-none text-sm sm:text-lg font-mono break-all ${
                  walletError
                    ? 'border-red-500 focus:border-red-600 ring-2 ring-red-500/20'
                    : isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'bg-white border-blue-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                }`}
              />
              {walletError && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <span>⚠️</span> {walletError}
                </p>
              )}
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                This address will receive donations on your public profile
              </p>
            </div>
          </div>

          {/* Social Media */}
          <div className={`rounded-3xl shadow-xl p-5 sm:p-8 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span className="text-2xl sm:text-3xl">🌐</span>
              Social Media
            </h2>
            <p className={`text-sm mb-4 sm:mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Add your social media links to your public profile
            </p>
            <div className="space-y-3 sm:space-y-4">
              {socialFields.map((field) => (
                <div key={field.key} className="flex items-center gap-3 sm:gap-4">
                  <span className="text-xl sm:text-2xl w-8 sm:w-10 text-center flex-shrink-0">{field.icon}</span>
                  <div className="flex-1 min-w-0">
                    <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={socials[field.key]}
                      onChange={(e) => setSocials({ ...socials, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border focus:outline-none text-sm ${
                        isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Public Profile Preview */}
          {username && (
            <div className={`rounded-3xl shadow-xl p-5 sm:p-8 border ${isDark ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-800' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'}`}>
              <h2 className={`text-xl sm:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <span className="text-2xl sm:text-3xl">🔗</span>
                Your Public Profile
              </h2>
              <p className={`text-sm mb-3 sm:mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Share this link with your supporters:
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className={`flex-1 px-4 py-3 rounded-xl font-mono text-xs sm:text-sm truncate ${isDark ? 'bg-gray-900 text-gray-300 border border-gray-700' : 'bg-white text-gray-700 border border-gray-200'}`}>
                  {getPublicProfileUrl()}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getPublicProfileUrl());
                      setMessage('✅ Link copied!');
                      setMessageType('success');
                      setTimeout(() => setMessage(''), 2000);
                    }}
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base"
                  >
                    📋 Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(getPublicProfileUrl(), '_blank')}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 text-sm sm:text-base ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'}`}
                  >
                    🔗 View
                  </button>
                  {/* Show Tutorial Again */}
<button
  onClick={() => {
    localStorage.removeItem('hasSeenTutorial')
    // فقط یک پیام نشون بده
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }}
  className={`w-full text-left px-4 py-3 rounded-2xl transition-colors flex items-center gap-3 ${
    isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-blue-50'
  }`}
>
  <span className="text-2xl">🎓</span>
  <span className="font-semibold">Show Tutorial Again</span>
</button>
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          <div className={`rounded-3xl shadow-xl p-5 sm:p-8 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span className="text-2xl sm:text-3xl">🔒</span>
              Security
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <div className={`p-4 sm:p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Change Password
                    </p>
                    <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Update your account password
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all hover:scale-105 ${isDark ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
                  >
                    Reset Password
                  </button>
                </div>
              </div>

              <div className={`p-4 sm:p-6 rounded-2xl ${isDark ? 'bg-red-900/20 border border-red-900/50' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className={`font-semibold mb-1 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                      Sign Out
                    </p>
                    <p className={`text-xs sm:text-sm ${isDark ? 'text-red-300/70' : 'text-red-600'}`}>
                      Sign out from your account
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all hover:scale-105 ${isDark ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              type="submit"
              disabled={saving || !!usernameError || !!walletError}
              className={`flex-1 font-semibold py-3 sm:py-4 rounded-2xl text-base sm:text-lg transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 ${
                isDark
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white'
              } shadow-lg`}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Saving...
                </span>
              ) : '💾 Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-medium transition-all hover:scale-105 ${
                isDark ? 'border border-gray-700 hover:bg-gray-800 text-gray-300' : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>

        <div className={`mt-8 sm:mt-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <p className="text-xs sm:text-sm">
            Powered by <span className="font-semibold text-blue-500">PayOnBase24</span> • Built on Base Network
          </p>
        </div>
      </div>
    </div>
  );
}