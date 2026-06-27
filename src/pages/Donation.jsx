import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'
import { usePrivy } from '@privy-io/react-auth'
import { useAutoProfile } from '../hooks/useAutoProfile'
import { handleAppError, showSuccess } from '../lib/errorHandler'
import EmptyState from '../components/EmptyState'

export default function Donation() {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const { authenticated, ready } = usePrivy()
  const { profile, loading: profileLoading } = useAutoProfile()
  
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    totalReceived: 0,
    thisMonth: 0,
    totalDonors: 0,
    topDonor: null,
    topDonorAmount: 0
  })

  useEffect(() => {
    if (ready && !authenticated) {
      navigate('/auth')
    }
  }, [ready, authenticated, navigate])

  useEffect(() => {
    if (profile && !profileLoading) {
      loadDonations()
    }
  }, [profile, profileLoading])

  useEffect(() => {
    function handleProfileUpdate(event) {
      const updatedProfile = event.detail
      if (updatedProfile?.id) {
        loadDonations(updatedProfile.id)
      }
    }

    window.addEventListener('profileUpdated', handleProfileUpdate)
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate)
  }, [])

  async function loadDonations(profileId = null) {
    if (!profile && !profileId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const targetProfileId = profileId || profile?.id
      
      const { data: donationsData, error } = await supabase
        .from('donations')
        .select('*')
        .eq('profile_id', targetProfileId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const donationsList = donationsData || []
      setDonations(donationsList)

      // محاسبه stats
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      let totalReceived = 0
      let thisMonthTotal = 0
      const uniqueDonors = new Set()
      const donorAmounts = {}

      donationsList.forEach(d => {
        const amount = parseFloat(d.amount)
        if (!isNaN(amount)) {
          totalReceived += amount
          
          const donationDate = new Date(d.created_at)
          if (donationDate >= thisMonthStart) {
            thisMonthTotal += amount
          }

          uniqueDonors.add(d.donor_address)

          if (!donorAmounts[d.donor_address]) {
            donorAmounts[d.donor_address] = 0
          }
          donorAmounts[d.donor_address] += amount
        }
      })

      let topDonor = null
      let topDonorAmount = 0
      Object.entries(donorAmounts).forEach(([address, amount]) => {
        if (amount > topDonorAmount) {
          topDonorAmount = amount
          topDonor = address
        }
      })

      setStats({
        totalReceived,
        thisMonth: thisMonthTotal,
        totalDonors: uniqueDonors.size,
        topDonor,
        topDonorAmount
      })

    } catch (err) {
      console.error('Donation error:', err)
      handleAppError(err, 'loadData')
    } finally {
      setLoading(false)
    }
  }

  async function deleteDonation(id) {
    if (!window.confirm('Are you sure you want to delete this donation record?')) return
    
    const originalDonations = [...donations]
    setDonations(donations.filter(d => d.id !== id))
    
    try {
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      showSuccess('Donation deleted')
      await loadDonations()
    } catch (err) {
      handleAppError(err, 'deleteDonation')
      setDonations(originalDonations)
    }
  }

  // ✅ فرمت عدد: 0.00 قبل از واریز، تا 4 رقم اعشار بعد از واریز
function formatAmount(amount) {
  const num = parseFloat(amount)
  
  // اگه NaN بود یا صفر
  if (isNaN(num) || num === 0) {
    return '0.00'
  }
  
  // اگه عدد خیلی کوچک هست (کمتر از 0.0001)، 6 رقم اعشار
  if (num < 0.0001) {
    return num.toFixed(6)
  }
  // اگه عدد کوچک هست (کمتر از 1)، 4 رقم اعشار
  else if (num < 1) {
    return num.toFixed(4)
  }
  // اگه عدد بزرگ هست (بزرگتر از 1)، 2 رقم اعشار
  else {
    return num.toFixed(2)
  }
}

  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatAddress(address) {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(38)}`
  }

  function getFilteredDonations() {
    let filtered = [...donations]
    const now = new Date()

    if (filter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(d => new Date(d.created_at) >= weekAgo)
    } else if (filter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(d => new Date(d.created_at) >= monthAgo)
    } else if (filter === 'year') {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(d => new Date(d.created_at) >= yearAgo)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(d => 
        d.donor_address.toLowerCase().includes(query) ||
        (d.donor_name && d.donor_name.toLowerCase().includes(query)) ||
        (d.message && d.message.toLowerCase().includes(query))
      )
    }

    if (sortBy === 'amount') {
      filtered.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
    } else {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return filtered
  }

  const filteredDonations = getFilteredDonations()
  const hasUsername = profile?.username
  const hasWallet = profile?.wallet_address
  const isProfileReady = hasUsername && hasWallet
  const publicProfileUrl = hasUsername ? `/u/${profile.username}` : null

  if (profileLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-blue-50 to-purple-50'}`}>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`h-32 rounded-2xl animate-pulse ${isDark ? 'bg-gray-900' : 'bg-white'}`}></div>
          ))}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-blue-50 to-purple-50'}`}>
        <div className="text-center">
          <div className="text-5xl mb-4">👻</div>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Profile Not Found
          </h2>
          <button
            onClick={() => navigate('/settings')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Go to Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            💝 Donation Dashboard
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Track and manage your donations
          </p>
        </div>

        {/* ✅ Public Profile Card - View Profile Button */}
        {isProfileReady && (
          <div className={`rounded-2xl p-4 border mb-6 shadow-lg ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                  isDark ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  ✅
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Your Donation Page is Live!
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Share this link with your supporters
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(publicProfileUrl)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
              >
                👤 View Profile
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards - Premium Design */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Total Received */}
          <div className={`rounded-2xl p-4 border shadow-lg ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                isDark ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                💰
              </div>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
              }`}>
                All Time
              </span>
            </div>
            <p className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ${formatAmount(stats.totalReceived)}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              USDC Total Received
            </p>
          </div>

          {/* This Month */}
          <div className={`rounded-2xl p-4 border shadow-lg ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                isDark ? 'bg-purple-500/20' : 'bg-purple-100'
              }`}>
                📅
              </div>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'
              }`}>
                This Month
              </span>
            </div>
            <p className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ${formatAmount(stats.thisMonth)}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              USDC This Month
            </p>
          </div>

          {/* Total Donors */}
          <div className={`rounded-2xl p-4 border shadow-lg ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                isDark ? 'bg-orange-500/20' : 'bg-orange-100'
              }`}>
                👥
              </div>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'
              }`}>
                Supporters
              </span>
            </div>
            <p className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {stats.totalDonors}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Total Donors
            </p>
          </div>

          {/* Top Donor */}
          <div className={`rounded-2xl p-4 border shadow-lg ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
              }`}>
                👑
              </div>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
              }`}>
                Top Donor
              </span>
            </div>
            {stats.topDonor ? (
              <>
                <p className={`text-lg font-bold mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ${formatAmount(stats.topDonorAmount)}
                </p>
                <p className={`text-xs font-mono truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatAddress(stats.topDonor)}
                </p>
              </>
            ) : (
              <>
                <p className={`text-lg font-bold mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  $0.00
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No donations yet
                </p>
              </>
            )}
          </div>
        </div>

        {/* Filters & Search */}
        <div className={`rounded-2xl p-4 border mb-4 shadow-lg ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'}`}>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search by address, name or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none text-sm transition-all ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
              }`}
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {['all', 'week', 'month', 'year'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl font-medium text-xs transition-all flex-shrink-0 capitalize ${
                    filter === f
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : isDark 
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {f === 'all' ? 'All Time' : f}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('date')}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  sortBy === 'date' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' 
                    : isDark 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                📅 Date
              </button>
              <button
                onClick={() => setSortBy('amount')}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  sortBy === 'amount' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' 
                    : isDark 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                💰 Amount
              </button>
            </div>
          </div>
        </div>

        {/* Donations List - Premium Cards */}
        {filteredDonations.length === 0 ? (
          <EmptyState
            illustration={donations.length === 0 ? 'donation' : 'search'}
            title={donations.length === 0 ? 'No Donations Yet' : 'No Results Found'}
            description={
              donations.length === 0 
                ? 'Share your public profile link with supporters to start receiving donations!'
                : 'Try adjusting your filters or search query.'
            }
            actionText={donations.length === 0 && publicProfileUrl ? '👤 View Profile' : undefined}
            onAction={donations.length === 0 && publicProfileUrl ? () => navigate(publicProfileUrl) : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filteredDonations.map((donation) => (
              <div
                key={donation.id}
                className={`rounded-2xl p-4 border transition-all hover:scale-[1.02] shadow-lg ${
                  isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Donor Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isDark ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-gradient-to-br from-blue-400 to-purple-500 text-white'
                      }`}>
                        {donation.donor_name 
                          ? donation.donor_name.charAt(0).toUpperCase() 
                          : donation.donor_address.substring(2, 4).toUpperCase()}
                      </div>
                      
                      {/* Name & Date */}
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {donation.donor_name || 'Anonymous'}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(donation.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Message */}
                    {donation.message && (
                      <div className={`mt-3 p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <p className={`text-sm italic ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          "{donation.message}"
                        </p>
                      </div>
                    )}

                    {/* Wallet Address */}
                    <p className={`text-xs font-mono mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatAddress(donation.donor_address)}
                    </p>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        ${formatAmount(donation.amount)}
                      </p>
                      <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        USDC
                      </p>
                    </div>
                    
                    <div className="flex gap-1">
                      {donation.tx_hash && (
                        <a
                          href={`https://basescan.org/tx/${donation.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                          title="View on Basescan"
                        >
                          🔗
                        </a>
                      )}
                      <button
                        onClick={() => deleteDonation(donation.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isDark ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {filteredDonations.length > 0 && (
          <div className={`mt-6 p-4 rounded-xl text-center ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Showing <span className="font-bold">{filteredDonations.length}</span> of{' '}
              <span className="font-bold">{donations.length}</span> donations
              {filter !== 'all' && ` (filtered by ${filter})`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}