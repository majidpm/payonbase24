import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { usePrivy } from '@privy-io/react-auth';
import { useAutoProfile } from '../hooks/useAutoProfile';
import { handleAppError, showSuccess } from '../lib/errorHandler';

export default function Dashboard() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { authenticated, ready } = usePrivy();
  const { profile, loading: profileLoading, refresh: refreshProfile } = useAutoProfile();
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [qrSlug, setQrSlug] = useState(null);

  useEffect(() => {
    if (ready && !authenticated) {
      navigate('/auth');
    }
  }, [ready, authenticated, navigate]);

  // ✅ لود داده‌ها وقتی پروفایل آماده شد
  useEffect(() => {
    if (profile && !profileLoading) {
      loadPayments();
    }
  }, [profile, profileLoading]);

  // ✅ گوش دادن به event آپدیت از Create
  useEffect(() => {
    function handlePaymentCreated() {
      console.log(' Dashboard: Payment created, refreshing...');
      loadPayments();
    }

    window.addEventListener('paymentCreated', handlePaymentCreated);
    return () => window.removeEventListener('paymentCreated', handlePaymentCreated);
  }, [profile]);

  async function loadPayments() {
    if (!profile || !profile.id) {
      console.log('⚠️ Dashboard: No profile available');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Dashboard: Loading payments for profile.id:', profile.id);
      
      const { data, error } = await supabase
        .from('payment')
        .select('*')
        .eq('user_id', profile.id) // ✅ استفاده از profile.id
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Dashboard: Query error:', error);
        throw error;
      }

      console.log('✅ Dashboard: Raw payments loaded:', data?.length);

      // چک کردن expired links
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
      console.log('✅ Dashboard: Payments set:', updatedPayments.length);
    } catch (err) {
      console.error('❌ Dashboard error:', err);
      handleAppError(err, 'loadData');
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
    navigator.clipboard.writeText(`${window.location.origin}/pay/${slug}`);
    showSuccess('Link copied!');
  }

  function copyHash(txHash) {
    navigator.clipboard.writeText(txHash);
    showSuccess('Transaction hash copied!');
  }

  function formatAmount(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toFixed(2);
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
    try {
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
        filtered = filtered.filter(p => {
          try {
            return (
              (p.title && p.title.toLowerCase().includes(query)) ||
              (p.description && p.description.toLowerCase().includes(query)) ||
              (p.payer_name && p.payer_name.toLowerCase().includes(query))
            );
          } catch {
            return false;
          }
        });
      }
      if (sortBy === 'amount') {
        filtered.sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));
      } else if (sortBy === 'date') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (sortBy === 'status') {
        const statusOrder = { active: 0, paid: 1, expired: 2, cancelled: 3 };
        filtered.sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));
      }
      return filtered;
    } catch (err) {
      console.error('Filter error:', err);
      return payments;
    }
  }

  const filteredPayments = getFilteredPayments();

  const inputClass = `w-full px-4 py-3 rounded-xl border focus:outline-none text-sm transition-colors ${
    isDark
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
  }`;

  if (loading || profileLoading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-6">
            <div className={`h-8 w-48 rounded-lg animate-pulse mb-2 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            <div className={`h-4 w-32 rounded animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`rounded-2xl p-4 animate-pulse ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                <div className={`h-3 w-1/2 rounded mb-2 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                <div className={`h-6 w-3/4 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
              </div>
            ))}
          </div>
          <div className={`rounded-2xl p-4 mb-6 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`h-10 rounded-xl mb-3 animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`h-10 rounded-xl animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
              <div className={`h-10 rounded-xl animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`rounded-2xl p-6 animate-pulse ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="flex gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                  <div className="flex-1 space-y-2">
                    <div className={`h-5 w-3/4 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                    <div className={`h-4 w-1/2 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                  </div>
                </div>
                <div className={`h-12 rounded-xl mb-3 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                <div className="flex gap-2">
                  <div className={`h-8 w-20 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                  <div className={`h-8 w-20 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                💳 Payment Links
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Welcome back, {profile?.display_name || profile?.username}!
              </p>
            </div>
            <button
              onClick={() => navigate('/create')}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 shadow-sm"
            >
              + New PayLink
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className={`rounded-2xl p-4 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</span>
              <span className="text-xl">📊</span>
            </div>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
          </div>

          <div className={`rounded-2xl p-4 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Active</span>
              <span className="text-xl">✅</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{stats.active}</p>
          </div>

          <div className={`rounded-2xl p-4 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Paid</span>
              <span className="text-xl">💰</span>
            </div>
            <p className="text-2xl font-bold text-blue-500">{stats.paid}</p>
          </div>

          <div className={`rounded-2xl p-4 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Collected</span>
              <span className="text-xl">💵</span>
            </div>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ${stats.collectedAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className={`rounded-2xl p-4 border mb-6 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
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
          <div className={`rounded-2xl p-8 border text-center ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="text-5xl mb-4">💸</div>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {payments.length === 0 ? 'No Payment Links Yet' : 'No Results Found'}
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {payments.length === 0 
                ? 'Create your first payment link to start receiving USDC!'
                : 'Try adjusting your filters or search query.'}
            </p>
            {payments.length === 0 && (
              <button
                onClick={() => navigate('/create')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
              >
                + Create Your First PayLink
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((p) => {
              const isExpired = p.status === 'active' && p.expires_at && new Date(p.expires_at) < new Date();
              const displayStatus = isExpired ? 'expired' : p.status;
              const linkUrl = `${window.location.origin}/pay/${p.slug}`;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl p-5 border transition-all ${
                    isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                          displayStatus === 'paid' 
                            ? isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                            : displayStatus === 'cancelled'
                            ? isDark ? 'bg-red-500/20' : 'bg-red-100'
                            : displayStatus === 'expired'
                            ? isDark ? 'bg-gray-800' : 'bg-gray-100'
                            : isDark ? 'bg-green-500/20' : 'bg-green-100'
                        }`}>
                          {displayStatus === 'paid' ? '💰' : displayStatus === 'cancelled' ? '❌' : displayStatus === 'expired' ? '' : '✅'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {p.title}
                          </h3>
                          {p.description && (
                            <p className={`text-sm line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end gap-2">
                      {getStatusBadge(p)}
                      <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        ${p.amount ? formatAmount(p.amount) : 'Any'}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        {p.amount ? 'USDC (Fixed)' : 'USDC (Any)'}
                      </p>
                    </div>
                  </div>

                  {/* Link Box */}
                  <div className={`p-3 rounded-xl mb-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>🔗 Payment Link</p>
                    <div className="flex gap-2">
                      <div className={`flex-1 px-3 py-2 rounded-lg font-mono text-xs truncate ${
                        isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700 border border-gray-200'
                      }`}>
                        {linkUrl}
                      </div>
                      <button
                        onClick={() => copyLink(p.slug)}
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap gap-3 text-xs mb-3">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      📅 {formatDate(p.created_at)}
                    </span>
                    {p.expires_at && (
                      <span className={isExpired ? 'text-red-500 font-medium' : isDark ? 'text-gray-400' : 'text-gray-600'}>
                        ⏰ {formatDate(p.expires_at)}
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
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                    {displayStatus === 'active' && (
                      <>
                        <button
                          onClick={() => copyLink(p.slug)}
                          className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
                            isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                           Copy
                        </button>
                        <button
                          onClick={() => setQrSlug(p.slug)}
                          className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
                            isDark ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                          }`}
                        >
                           QR Code
                        </button>
                        <button
                          onClick={() => cancelLink(p.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
                            isDark ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                          }`}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    
                    {displayStatus === 'paid' && p.tx_hash && (
                      <div className="w-full flex flex-col sm:flex-row gap-2 mb-2">
                        <a
                          href={`https://basescan.org/tx/${p.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium text-center transition ${
                            isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          🔗 View on Basescan
                        </a>
                        <button
                          onClick={() => copyHash(p.tx_hash)}
                          className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition ${
                            isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                           Copy Hash
                        </button>
                      </div>
                    )}
                    
                    <button
                      onClick={() => deleteLink(p.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
                        isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {filteredPayments.length > 0 && (
          <div className={`mt-6 p-4 rounded-xl text-center ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Showing <span className="font-bold">{filteredPayments.length}</span> of{' '}
              <span className="font-bold">{payments.length}</span> payment links
              {filter !== 'all' && ` (filtered by ${filter})`}
            </p>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrSlug && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" 
          onClick={() => setQrSlug(null)}
        >
          <div 
            className={`rounded-2xl p-6 max-w-sm w-full ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-bold mb-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              📱 QR Code
            </h3>
            <div className="flex justify-center mb-4">
              <QRCodeSVG 
                value={`${window.location.origin}/pay/${qrSlug}`}
                size={200}
                level="H"
                includeMargin={false}
                className="rounded-xl bg-white p-4"
              />
            </div>
            <p className={`text-xs text-center mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Scan to open payment link
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/pay/${qrSlug}`);
                  showSuccess('Link copied!');
                }}
                className={`flex-1 py-2 rounded-xl font-semibold text-sm ${
                  isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 Copy Link
              </button>
              <button
                onClick={() => setQrSlug(null)}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}