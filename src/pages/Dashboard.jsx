import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { handleAppError, showSuccess } from '../lib/errorHandler';
import { StatsSkeleton, ListSkeleton } from '../components/Skeleton';

export default function Dashboard() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paid: 0,
    expired: 0,
    totalAmount: 0,
    collectedAmount: 0
  });
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) loadPayments();
  }, [userId]);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  }

  async function loadPayments() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // چک کردن expiry برای همه لینک‌ها
      const updatedPayments = await Promise.all(
        (data || []).map(async (p) => {
          if (p.status === 'active' && p.expires_at && new Date(p.expires_at) < new Date()) {
            await supabase
              .from('payment')
              .update({ status: 'expired' })
              .eq('id', p.id);
            return { ...p, status: 'expired' };
          }
          return p;
        })
      );

      setPayments(updatedPayments);
      calculateStats(updatedPayments);
    } catch (err) {
      handleAppError(err, 'loadPayments');
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(paymentsList) {
    const statsData = {
      total: paymentsList.length,
      active: paymentsList.filter(p => p.status === 'active').length,
      paid: paymentsList.filter(p => p.status === 'paid').length,
      expired: paymentsList.filter(p => p.status === 'expired').length,
      totalAmount: paymentsList.reduce((sum, p) => sum + (p.amount ? parseFloat(p.amount) : 0), 0),
      collectedAmount: paymentsList
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount ? parseFloat(p.amount) : 0), 0)
    };
    setStats(statsData);
  }

  async function cancelLink(id) {
    if (!window.confirm('Cancel this payment link?')) return;

    const original = [...payments];
    setPayments(payments.map(p => p.id === id ? { ...p, status: 'cancelled' } : p));

    try {
      const { error } = await supabase
        .from('payment')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      showSuccess('Link cancelled');
      await loadPayments();
    } catch (err) {
      handleAppError(err, 'cancelLink');
      setPayments(original);
    }
  }

  async function deleteLink(id) {
    if (!window.confirm('Delete this payment link permanently?')) return;

    const original = [...payments];
    setPayments(payments.filter(p => p.id !== id));

    try {
      const { error } = await supabase
        .from('payment')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess('Link deleted');
      await loadPayments();
    } catch (err) {
      handleAppError(err, 'deleteLink');
      setPayments(original);
    }
  }

  function copyLink(slug) {
    const url = `${window.location.origin}/pay/${slug}`;
    navigator.clipboard.writeText(url);
    showSuccess('Link copied!');
  }

  // ✅ تابع formatAmount برای نمایش اعداد کوچک
  function formatAmount(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    
    if (num < 0.01) {
      return num.toFixed(6);
    } else if (num < 1) {
      return num.toFixed(4);
    } else {
      return num.toFixed(2);
    }
  }

  function getStatusBadge(payment) {
    const isExpired = payment.status === 'active' && payment.expires_at && new Date(payment.expires_at) < new Date();
    const status = isExpired ? 'expired' : payment.status;

    const styles = {
      active: isDark ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-100 text-green-700 border-green-200',
      paid: isDark ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200',
      expired: isDark ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200',
      cancelled: isDark ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-100 text-red-700 border-red-200'
    };

    const labels = {
      active: '✅ Active',
      paid: '💰 Paid',
      expired: '⌛ Expired',
      cancelled: '❌ Cancelled'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getFilteredPayments() {
    let filtered = [...payments];

    if (filter !== 'all') {
      filtered = filtered.filter(p => {
        if (filter === 'active') return p.status === 'active';
        if (filter === 'paid') return p.status === 'paid';
        if (filter === 'expired') return p.status === 'expired';
        if (filter === 'cancelled') return p.status === 'cancelled';
        return true;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.payer_name && p.payer_name.toLowerCase().includes(query))
      );
    }

    if (sortBy === 'amount') {
      filtered.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'status') {
      const statusOrder = { active: 0, paid: 1, expired: 2, cancelled: 3 };
      filtered.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }

    return filtered;
  }

  const filteredPayments = getFilteredPayments();

  const inputClass = `w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border focus:outline-none text-xs sm:text-sm transition-colors ${
    isDark
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
  }`;

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
        <div className="p-3 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <div className={`h-6 sm:h-8 rounded w-48 sm:w-64 animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 animate-pulse ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                  <div className={`h-3 sm:h-4 rounded w-1/2 mb-2 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                  <div className={`h-6 sm:h-8 rounded w-3/4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                </div>
              ))}
            </div>
            <ListSkeleton count={4} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
      <div className="p-3 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-2">
              <div>
                <h1 className={`text-xl sm:text-2xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  💳 Payment Links
                </h1>
                <p className={`text-xs sm:text-sm md:text-base mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Manage your payment links
                </p>
              </div>
              <button
                onClick={() => navigate('/create')}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all hover:scale-105"
              >
                + New PayLink
              </button>
            </div>
          </div>

          {/* Stats Cards - Responsive Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
            <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</span>
                <span className="text-lg sm:text-2xl">📊</span>
              </div>
              <p className={`text-lg sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
            </div>

            <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Active</span>
                <span className="text-lg sm:text-2xl">✅</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-green-500">{stats.active}</p>
            </div>

            <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Paid</span>
                <span className="text-lg sm:text-2xl">💰</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-blue-500">{stats.paid}</p>
            </div>

            <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Collected</span>
                <span className="text-lg sm:text-2xl">💵</span>
              </div>
              <p className={`text-lg sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ${stats.collectedAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-6 border mb-3 sm:mb-6 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Search by title, description, or payer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={inputClass}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Filter by Status
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className={inputClass}
                  >
                    <option value="all">All Links</option>
                    <option value="active">Active</option>
                    <option value="paid">Paid</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Sort by
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={inputClass}
                  >
                    <option value="date">Date Created</option>
                    <option value="amount">Amount</option>
                    <option value="status">Status</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Payments List */}
          {filteredPayments.length === 0 ? (
            <div className={`rounded-xl sm:rounded-2xl p-6 sm:p-12 border text-center ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
              <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🎯</div>
              <h3 className={`text-base sm:text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {payments.length === 0 ? 'No Payment Links Yet' : 'No Results Found'}
              </h3>
              <p className={`text-xs sm:text-base mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {payments.length === 0 
                  ? 'Create your first payment link to start receiving USDC!'
                  : 'Try adjusting your filters or search query.'}
              </p>
              {payments.length === 0 && (
                <button
                  onClick={() => navigate('/create')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all hover:scale-105"
                >
                  + Create Your First PayLink
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredPayments.map((p) => {
                const isExpired = p.status === 'active' && p.expires_at && new Date(p.expires_at) < new Date();
                const displayStatus = isExpired ? 'expired' : p.status;
                const linkUrl = `${window.location.origin}/pay/${p.slug}`;

                return (
                  <div
                    key={p.id}
                    className={`rounded-xl sm:rounded-2xl p-3 sm:p-6 border transition-all ${
                      isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 sm:gap-3 mb-2">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0 ${
                            displayStatus === 'paid' 
                              ? isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                              : displayStatus === 'cancelled'
                              ? isDark ? 'bg-red-500/20' : 'bg-red-100'
                              : displayStatus === 'expired'
                              ? isDark ? 'bg-gray-800' : 'bg-gray-100'
                              : isDark ? 'bg-green-500/20' : 'bg-green-100'
                          }`}>
                            {displayStatus === 'paid' ? '💰' : displayStatus === 'cancelled' ? '❌' : displayStatus === 'expired' ? '⌛' : '✅'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm sm:text-lg font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {p.title}
                            </h3>
                            {p.description && (
                              <p className={`text-xs sm:text-sm line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-start sm:items-end gap-2">
                        {getStatusBadge(p)}
                        <p className={`text-base sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          ${p.amount ? formatAmount(p.amount) : 'Any'}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          {p.amount ? 'USDC (Fixed)' : 'USDC (Any)'}
                        </p>
                      </div>
                    </div>

                    {/* Link Box */}
                    <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl mb-2 sm:mb-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>🔗 Payment Link</p>
                      <div className="flex gap-2">
                        <div className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-mono text-xs truncate ${
                          isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700 border border-gray-200'
                        }`}>
                          {linkUrl}
                        </div>
                        <button
                          onClick={() => copyLink(p.slug)}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs mb-2 sm:mb-3">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                        📅 {formatDate(p.created_at)}
                      </span>
                      {p.expires_at && (
                        <span className={isExpired ? 'text-red-500 font-medium' : isDark ? 'text-gray-400' : 'text-gray-600'}>
                           {formatDate(p.expires_at)}
                        </span>
                      )}
                      {p.payer_name && displayStatus === 'paid' && (
                        <span className="text-green-500 font-medium">
                          💳 {p.payer_name}
                        </span>
                      )}
                      {p.recipient_email && (
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          📧 {p.recipient_email}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-800">
                      {displayStatus === 'active' && (
                        <>
                          <button
                            onClick={() => copyLink(p.slug)}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition ${
                              isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            🔗 Copy
                          </button>
                          <button
                            onClick={() => cancelLink(p.id)}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition ${
                              isDark ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                            }`}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {displayStatus === 'paid' && p.tx_hash && (
                        <a
                          href={`https://basescan.org/tx/${p.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition ${
                            isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                           Basescan
                        </a>
                      )}
                      <button
                        onClick={() => deleteLink(p.id)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition ${
                          isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        ️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary */}
          {filteredPayments.length > 0 && (
            <div className={`mt-3 sm:mt-6 p-3 sm:p-4 rounded-lg sm:rounded-xl text-center ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
              <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Showing <span className="font-bold">{filteredPayments.length}</span> of{' '}
                <span className="font-bold">{payments.length}</span> payment links
                {filter !== 'all' && ` (filtered by ${filter})`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}