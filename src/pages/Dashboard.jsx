import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import QRCode from 'react-qr-code'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { handleAppError, showSuccess } from '../lib/errorHandler'
import { StatsSkeleton, CardSkeleton, ListSkeleton } from '../components/Skeleton'

export default function Dashboard() {
  const { isDark } = useTheme()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showQR, setShowQR] = useState(null)
  const navigate = useNavigate()

  // Filters
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadPayments()
  }, [])

  async function loadPayments() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/auth')
        return
      }
      const { data, error } = await supabase
        .from('payment')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setPayments(data || [])
    } catch (err) {
      handleAppError(err, 'loadPayments')
    } finally {
      setLoading(false)
    }
  }

  // Optimistic delete
  async function cancelPayment(id) {
    if (!window.confirm('Are you sure you want to cancel this payment link?')) return
    
    // Optimistic update
    const originalPayments = [...payments]
    setPayments(payments.filter(p => p.id !== id))
    setDeletingId(id)
    
    try {
      const { error } = await supabase
        .from('payment')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      showSuccess('Payment link cancelled')
    } catch (err) {
      handleAppError(err, 'cancelPayment')
      // Rollback
      setPayments(originalPayments)
    } finally {
      setDeletingId(null)
    }
  }

  async function copyLink(slug, id) {
    try {
      const link = `${window.location.origin}/pay/${slug}`
      await navigator.clipboard.writeText(link)
      setCopiedId(id)
      showSuccess('Link copied to clipboard!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      handleAppError(err, 'copyLink')
    }
  }

  function viewOnBasescan(txHash) {
    if (txHash) {
      window.open(`https://basescan.org/tx/${txHash}`, '_blank')
    }
  }

  const filteredPayments = useMemo(() => {
    let filtered = [...payments]
    const now = new Date()

    if (dateFilter !== 'all') {
      filtered = filtered.filter(p => {
        const created = new Date(p.created_at)
        if (dateFilter === 'today') {
          return created.toDateString() === now.toDateString()
        }
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return created >= weekAgo
        }
        if (dateFilter === 'month') {
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
        }
        if (dateFilter === 'year') {
          return created.getFullYear() === now.getFullYear()
        }
        return true
      })
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        if (statusFilter === 'paid') return p.paid
        if (statusFilter === 'pending') return !p.paid
        return true
      })
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.slug.toLowerCase().includes(query) ||
        p.amount.toString().includes(query) ||
        (p.tx_hash && p.tx_hash.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [payments, dateFilter, statusFilter, searchQuery])

  const stats = useMemo(() => {
    const total = payments.length
    const paid = payments.filter(p => p.paid).length
    const pending = total - paid
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const paidAmount = payments.filter(p => p.paid).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const todayCount = payments.filter(p => {
      const created = new Date(p.created_at)
      return created.toDateString() === new Date().toDateString()
    }).length

    return { total, paid, pending, totalAmount, paidAmount, todayCount }
  }, [payments])

  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatAmount(amount) {
    const num = parseFloat(amount)
    if (isNaN(num)) return '0.00'
    if (num >= 1) return num.toFixed(2)
    if (num >= 0.01) return num.toFixed(4)
    return num.toFixed(6)
  }

  const dateFilters = [
    { key: 'today', label: 'Today', icon: '📅' },
    { key: 'week', label: 'Week', icon: '📆' },
    { key: 'month', label: 'Month', icon: '🗓️' },
    { key: 'year', label: 'Year', icon: '' },
    { key: 'all', label: 'All', icon: '🌐' }
  ]

  const statusFilters = [
    { key: 'all', label: 'All', icon: '📋' },
    { key: 'pending', label: 'Pending', icon: '⏳' },
    { key: 'paid', label: 'Paid', icon: '✅' }
  ]

  // Loading state with skeleton
  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div className={`h-8 rounded w-48 animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
              <div className={`h-10 rounded-xl w-32 animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            </div>
            <StatsSkeleton />
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
              <div className={`h-10 rounded-xl mb-4 animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
              <div className={`h-10 rounded-xl animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            </div>
            <ListSkeleton count={3} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 sm:mb-6">
            <div className="min-w-0 flex-1">
              <h1 className={`text-xl sm:text-2xl md:text-4xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                📊 Dashboard
              </h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {stats.todayCount > 0 ? `${stats.todayCount} new link${stats.todayCount > 1 ? 's' : ''} today` : 'Manage your payment links'}
              </p>
            </div>
            <button
              onClick={() => navigate('/create')}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all hover:scale-105 flex items-center justify-center gap-2 flex-shrink-0"
            >
              <span className="text-base">+</span> New PayLink
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-5 sm:mb-6">
            {/* Total Links */}
            <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border transition-all ${
              isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-xl ${
                  isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}>
                  🔗
                </div>
                <span className={`text-[9px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                  isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                }`}>
                  Total
                </span>
              </div>
              <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.total}
              </p>
              <p className={`text-[9px] sm:text-xs mt-0.5 sm:mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Payment Links
              </p>
            </div>

            {/* Paid */}
            <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border transition-all ${
              isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-xl ${
                  isDark ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  ✅
                </div>
                <span className={`text-[9px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                  isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                }`}>
                  Completed
                </span>
              </div>
              <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.paid}
              </p>
              <p className={`text-[9px] sm:text-xs mt-0.5 sm:mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Paid Links
              </p>
            </div>

            {/* Pending */}
            <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border transition-all ${
              isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-xl ${
                  isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
                }`}>
                  ⏳
                </div>
                <span className={`text-[9px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                  isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  Active
                </span>
              </div>
              <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.pending}
              </p>
              <p className={`text-[9px] sm:text-xs mt-0.5 sm:mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Pending Links
              </p>
            </div>

            {/* Total Amount */}
            <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border transition-all ${
              isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-xl ${
                  isDark ? 'bg-purple-500/20' : 'bg-purple-100'
                }`}>
                  💰
                </div>
                <span className={`text-[9px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                  isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'
                }`}>
                  Received
                </span>
              </div>
              <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ${formatAmount(stats.paidAmount)}
              </p>
              <p className={`text-[9px] sm:text-xs mt-0.5 sm:mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                USDC Collected
              </p>
            </div>
          </div>

          {/* Filters Section */}
          <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border mb-4 sm:mb-5 ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100 shadow-sm'
          }`}>
            {/* Search */}
            <div className="mb-3">
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
                  isDark ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search by slug, amount, or tx hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border focus:outline-none text-xs sm:text-sm transition-colors ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                  }`}
                />
              </div>
            </div>

            {/* Date Filters */}
            <div className="mb-3">
              <p className={`text-[9px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wide ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}>
                Date Range
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {dateFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setDateFilter(f.key)}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium text-[10px] sm:text-xs transition-all flex-shrink-0 flex items-center gap-1 ${
                      dateFilter === f.key
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : isDark
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="text-xs">{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filters */}
            <div>
              <p className={`text-[9px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wide ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}>
                Status
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {statusFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`px-2 py-1.5 sm:py-2 rounded-lg font-medium text-[10px] sm:text-xs transition-all flex items-center justify-center gap-1 ${
                      statusFilter === f.key
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                        : isDark
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="text-xs">{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex justify-between items-center mb-3">
            <p className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Showing <span className="font-bold">{filteredPayments.length}</span> of{' '}
              <span className="font-bold">{payments.length}</span> links
            </p>
            {(dateFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setDateFilter('all')
                  setStatusFilter('all')
                  setSearchQuery('')
                }}
                className={`text-[10px] sm:text-xs font-medium ${
                  isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Payments Grid */}
          {filteredPayments.length === 0 ? (
            <div className={`rounded-xl sm:rounded-2xl p-6 sm:p-8 border text-center ${
              isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'
            }`}>
              <div className="text-4xl sm:text-5xl mb-3">
                {payments.length === 0 ? '🎯' : '🔍'}
              </div>
              <h3 className={`text-base sm:text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {payments.length === 0 ? 'No Payment Links Yet' : 'No Results Found'}
              </h3>
              <p className={`text-xs sm:text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {payments.length === 0 
                  ? 'Create your first payment link to get started!'
                  : 'Try adjusting your filters or search query.'}
              </p>
              {payments.length === 0 && (
                <button
                  onClick={() => navigate('/create')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all hover:scale-105"
                >
                  Create Your First PayLink
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {filteredPayments.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-xl sm:rounded-2xl border transition-all ${
                    isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100 shadow-sm'
                  }`}
                >
                  {/* Card Header */}
                  <div className={`p-3 sm:p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] sm:text-xs font-bold ${
                            p.paid
                              ? isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                              : isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {p.paid ? '✅ Paid' : ' Pending'}
                          </span>
                        </div>
                        <p className={`font-mono text-[10px] sm:text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          /{p.slug}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {formatAmount(p.amount)}
                        </p>
                        <p className={`text-[9px] sm:text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          USDC
                        </p>
                      </div>
                    </div>
                    <p className={`text-[9px] sm:text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatDate(p.created_at)}
                    </p>
                  </div>

                  {/* QR Code (Toggle) */}
                  {showQR === p.id && (
                    <div className={`p-3 border-b flex justify-center ${isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                      <QRCode
                        size={100}
                        value={`${window.location.origin}/pay/${p.slug}`}
                        bgColor={isDark ? '#1f2937' : '#ffffff'}
                        fgColor={isDark ? '#ffffff' : '#1e293b'}
                      />
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className={`p-3 ${!p.paid && 'border-t ' + (isDark ? 'border-gray-800' : 'border-gray-100')}`}>
                    {!p.paid ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => copyLink(p.slug, p.id)}
                          className={`py-2 rounded-lg font-medium text-xs transition-all ${
                            copiedId === p.id
                              ? 'bg-green-500 text-white'
                              : isDark
                                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {copiedId === p.id ? '✅ Copied!' : ' Copy'}
                        </button>
                        <button
                          onClick={() => setShowQR(showQR === p.id ? null : p.id)}
                          className={`py-2 rounded-lg font-medium text-xs transition-all ${
                            isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {showQR === p.id ? '❌ Hide' : '📱 QR'}
                        </button>
                        <button
                          onClick={() => cancelPayment(p.id)}
                          disabled={deletingId === p.id}
                          className={`col-span-2 py-2 rounded-lg font-medium text-xs transition-all disabled:opacity-50 ${
                            isDark
                              ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
                              : 'bg-red-50 hover:bg-red-100 text-red-700'
                          }`}
                        >
                          {deletingId === p.id ? '⏳ Cancelling...' : '️ Cancel Link'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {p.tx_hash && (
                          <button
                            onClick={() => viewOnBasescan(p.tx_hash)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2"
                          >
                            🔗 View on Basescan
                          </button>
                        )}
                        <button
                          onClick={() => setShowQR(showQR === p.id ? null : p.id)}
                          className={`w-full py-2 rounded-lg font-medium text-xs transition-all ${
                            isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {showQR === p.id ? '❌ Hide QR' : '📱 Show QR Code'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Summary */}
          {filteredPayments.length > 0 && (
            <div className={`mt-4 p-3 rounded-xl text-center ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
              <p className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                💡 Tip: Click on <span className="font-bold">QR</span> to view the QR code for any link
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}