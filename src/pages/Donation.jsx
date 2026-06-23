import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'
import { handleAppError, showSuccess } from '../lib/errorHandler'
import { StatsSkeleton, CardSkeleton, ListSkeleton } from '../components/Skeleton'

export default function Donation() {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [donations, setDonations] = useState([])
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    totalReceived: 0,
    thisMonth: 0,
    totalDonors: 0,
    topDonor: null,
    topDonorAmount: 0
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setProfile(profileData)

      const { data: donationsData, error } = await supabase
        .from('donations')
        .select('*')
        .eq('profile_id', profileData?.id || '00000000-0000-0000-0000-000000000000')
        .order('created_at', { ascending: false })

      if (error) throw error

      const donationsList = donationsData || []
      setDonations(donationsList)

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let totalReceived = 0;
      let thisMonthTotal = 0;
      const uniqueDonors = new Set();
      const donorAmounts = {};

      donationsList.forEach(d => {
        const amount = parseFloat(d.amount);
        if (!isNaN(amount)) {
          totalReceived += amount;
          
          const donationDate = new Date(d.created_at);
          if (donationDate >= thisMonthStart) {
            thisMonthTotal += amount;
          }

          uniqueDonors.add(d.donor_address);

          if (!donorAmounts[d.donor_address]) {
            donorAmounts[d.donor_address] = 0;
          }
          donorAmounts[d.donor_address] += amount;
        }
      });

      let topDonor = null;
      let topDonorAmount = 0;
      Object.entries(donorAmounts).forEach(([address, amount]) => {
        if (amount > topDonorAmount) {
          topDonorAmount = amount;
          topDonor = address;
        }
      });

      setStats({
        totalReceived,
        thisMonth: thisMonthTotal,
        totalDonors: uniqueDonors.size,
        topDonor,
        topDonorAmount
      });

    } catch (err) {
      handleAppError(err, 'loadData')
    } finally {
      setLoading(false)
    }
  }

async function deleteDonation(id) {
  if (!window.confirm('Are you sure you want to delete this donation record?')) return
  
  // Optimistic update
  const originalDonations = [...donations]
  setDonations(donations.filter(d => d.id !== id))
  
  try {
    const { error } = await supabase
      .from('donations')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    showSuccess('Donation deleted')
    await loadData() // Refresh stats
  } catch (err) {
    handleAppError(err, 'deleteDonation')
    // Rollback
    setDonations(originalDonations)
  }
}

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  }

  function formatAmount(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    if (num >= 1) return num.toFixed(2);
    if (num >= 0.01) return num.toFixed(4);
    return num.toFixed(6);
  }

  function getFilteredDonations() {
    let filtered = [...donations];
    const now = new Date();

    if (filter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(d => new Date(d.created_at) >= weekAgo);
    } else if (filter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(d => new Date(d.created_at) >= monthAgo);
    } else if (filter === 'year') {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(d => new Date(d.created_at) >= yearAgo);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.donor_address.toLowerCase().includes(query) ||
        (d.message && d.message.toLowerCase().includes(query))
      );
    }

    if (sortBy === 'amount') {
      filtered.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    } else {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return filtered;
  }

  const filteredDonations = getFilteredDonations();
  const hasUsername = profile?.username;
  const hasWallet = profile?.wallet_address;
  const isProfileReady = hasUsername && hasWallet;
  const publicProfileUrl = hasUsername ? `${window.location.origin}/u/${profile.username}` : null;

 if (loading) {
  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div className={`h-8 rounded w-64 animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          </div>
          <StatsSkeleton />
          <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`h-10 rounded-xl mb-4 animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            <div className={`h-10 rounded-xl animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          </div>
          <ListSkeleton count={5} />
        </div>
      </div>
    </div>
  )
}

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-10">
          <h1 className={`text-2xl sm:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            💝 Donation Dashboard
          </h1>
          <p className={`text-sm sm:text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Track and manage your donations
          </p>
        </div>

        {/* Setup Guide */}
        {!isProfileReady && (
          <div className={`rounded-2xl sm:rounded-3xl border-2 border-dashed p-4 sm:p-8 mb-6 sm:mb-10 ${
            isDark 
              ? 'bg-gradient-to-br from-blue-950/50 to-purple-950/50 border-blue-500/50' 
              : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300'
          }`}>
            <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0 ${
                isDark ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                🚀
              </div>
              <div className="flex-1">
                <h2 className={`text-lg sm:text-2xl font-bold mb-1 sm:mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Setup Your Donation Page
                </h2>
                <p className={`text-xs sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Complete your profile to activate your public donation page.
                </p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              <div className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl ${isDark ? 'bg-gray-900/60' : 'bg-white/80'}`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg flex-shrink-0 ${
                  hasUsername ? 'bg-green-500 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                }`}>
                  {hasUsername ? '✓' : '1'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Set Your Username
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {hasUsername ? `@${profile.username}` : 'Choose a unique username'}
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl ${isDark ? 'bg-gray-900/60' : 'bg-white/80'}`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg flex-shrink-0 ${
                  hasWallet ? 'bg-green-500 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                }`}>
                  {hasWallet ? '✓' : '2'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Add Wallet Address
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {hasWallet ? formatAddress(profile.wallet_address) : 'Enter your Base wallet address'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/settings')}
              className={`w-full py-3 sm:py-4 rounded-2xl font-semibold text-sm sm:text-lg transition-all flex items-center justify-center gap-2 ${
                isDark ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              ⚙️ Complete Setup in Settings
            </button>
          </div>
        )}

        {/* Public Profile Card */}
        {isProfileReady && (
          <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 border mb-6 sm:mb-10 ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl ${
                  isDark ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  ✅
                </div>
                <div>
                  <h3 className={`text-sm sm:text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Your Donation Page is Live!
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Share this link with your supporters
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-mono text-xs sm:text-sm truncate max-w-[200px] sm:max-w-none ${
                  isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  {publicProfileUrl}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(publicProfileUrl);
                    alert('Link copied!');
                  }}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-medium transition-colors flex-shrink-0 ${
                    isDark ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title="Copy link"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - Grid 2x2 */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-10">
          {/* Total Received */}
          <div className={`rounded-2xl sm:rounded-3xl p-3 sm:p-6 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl ${
                isDark ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                💰
              </div>
              <span className={`text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 rounded-full ${
                isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
              }`}>
                All Time
              </span>
            </div>
            <p className={`text-xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatAmount(stats.totalReceived)}
            </p>
            <p className={`text-[10px] sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              USDC Total Received
            </p>
          </div>

          {/* This Month */}
          <div className={`rounded-2xl sm:rounded-3xl p-3 sm:p-6 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl ${
                isDark ? 'bg-purple-500/20' : 'bg-purple-100'
              }`}>
                📅
              </div>
              <span className={`text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 rounded-full ${
                isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'
              }`}>
                This Month
              </span>
            </div>
            <p className={`text-xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatAmount(stats.thisMonth)}
            </p>
            <p className={`text-[10px] sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              USDC This Month
            </p>
          </div>

          {/* Total Donors */}
          <div className={`rounded-2xl sm:rounded-3xl p-3 sm:p-6 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl ${
                isDark ? 'bg-orange-500/20' : 'bg-orange-100'
              }`}>
                👥
              </div>
              <span className={`text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 rounded-full ${
                isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'
              }`}>
                Supporters
              </span>
            </div>
            <p className={`text-xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {stats.totalDonors}
            </p>
            <p className={`text-[10px] sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Total Donors
            </p>
          </div>

          {/* Top Donor */}
          <div className={`rounded-2xl sm:rounded-3xl p-3 sm:p-6 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl ${
                isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
              }`}>
                🏆
              </div>
              <span className={`text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 rounded-full ${
                isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
              }`}>
                Top Donor
              </span>
            </div>
            {stats.topDonor ? (
              <>
                <p className={`text-xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatAmount(stats.topDonorAmount)}
                </p>
                <p className={`text-[10px] sm:text-xs font-mono truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatAddress(stats.topDonor)}
                </p>
              </>
            ) : (
              <>
                <p className={`text-xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  0.00
                </p>
                <p className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No donations yet
                </p>
              </>
            )}
          </div>
        </div>

        {/* Filters & Search */}
        <div className={`rounded-2xl sm:rounded-3xl p-3 sm:p-6 border mb-4 sm:mb-6 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Search by address or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl border focus:outline-none text-xs sm:text-base transition-colors ${
                isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
              }`}
            />

            <div className="flex gap-2 overflow-x-auto pb-2">
              {['all', 'week', 'month', 'year'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-base transition-all flex-shrink-0 ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'week' ? 'Week' : f === 'month' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('date')}
                className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-base transition-all ${
                  sortBy === 'date' ? 'bg-purple-600 text-white' : isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                📅 Date
              </button>
              <button
                onClick={() => setSortBy('amount')}
                className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-base transition-all ${
                  sortBy === 'amount' ? 'bg-purple-600 text-white' : isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                💰 Amount
              </button>
            </div>
          </div>
        </div>

        {/* Donations List */}
        {filteredDonations.length === 0 ? (
          <div className={`rounded-2xl sm:rounded-3xl p-8 sm:p-12 border text-center ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🎁</div>
            <h3 className={`text-lg sm:text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {donations.length === 0 ? 'No Donations Yet' : 'No Results Found'}
            </h3>
            <p className={`text-xs sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {donations.length === 0 
                ? 'Share your profile link to start receiving donations!'
                : 'Try adjusting your filters or search query.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredDonations.map((donation) => (
              <div
                key={donation.id}
                className={`rounded-2xl sm:rounded-3xl p-3 sm:p-6 border transition-all ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                        isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {donation.donor_address.substring(2, 4).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-mono text-xs sm:text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {formatAddress(donation.donor_address)}
                        </p>
                        <p className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatDate(donation.created_at)}
                        </p>
                      </div>
                    </div>
                    {donation.message && (
                      <p className={`mt-2 text-xs sm:text-sm italic ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        "{donation.message}"
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className={`text-lg sm:text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      {formatAmount(donation.amount)}
                    </p>
                    <p className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      USDC
                    </p>
                    <div className="flex gap-1 sm:gap-2">
                      {donation.tx_hash && (
                        <a
                          href={`https://basescan.org/tx/${donation.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium transition-colors ${
                            isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                          title="View on Basescan"
                        >
                          🔗
                        </a>
                      )}
                      <button
                        onClick={() => deleteDonation(donation.id)}
                        className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium transition-colors ${
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
          <div className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Showing <span className="font-bold">{filteredDonations.length}</span> of{' '}
              <span className="font-bold">{donations.length}</span> donations
              {filter !== 'all' && ` (filtered by ${filter})`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}