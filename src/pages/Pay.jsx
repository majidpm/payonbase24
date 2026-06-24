import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { handleAppError, showSuccess } from '../lib/errorHandler';
import { ensureWalletUnlocked, checkUSDCBalance, ensureBaseNetwork } from '../lib/walletHelper';
import { celebrateDonation } from '../lib/celebrations';
import { QRCodeSVG } from 'qrcode.react';

export default function Pay() {
  const { isDark } = useTheme();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [payerName, setPayerName] = useState('');
  const [message, setMessage] = useState('');
  const [paying, setPaying] = useState(false);

  const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  useEffect(() => {
    loadLink();
    checkWallet();
  }, [slug]);

  async function loadLink() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setLink(null);
        return;
      }

      // چک کردن expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await supabase
          .from('payment')
          .update({ status: 'expired' })
          .eq('id', data.id);
        
        setLink({ ...data, status: 'expired' });
      } else {
        setLink(data);
      }
    } catch (err) {
      handleAppError(err, 'loadLink');
    } finally {
      setLoading(false);
    }
  }

  async function checkWallet() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) setAccount(accounts[0]);
      } catch (err) {
        console.error('Wallet check error:', err);
      }
    }
  }

  async function connectWallet() {
    try {
      const unlockedAccount = await ensureWalletUnlocked();
      setAccount(unlockedAccount);
      showSuccess('Wallet connected!');
    } catch (err) {
      handleAppError(err, 'connectWallet');
    }
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

  async function sendPayment() {
    if (!link || !account) {
      handleAppError({ message: 'Please connect your wallet' }, 'sendPayment');
      return;
    }

    if (link.status !== 'active') {
      handleAppError({ message: 'This link is no longer active' }, 'sendPayment');
      return;
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      handleAppError({ message: 'This link has expired' }, 'sendPayment');
      return;
    }

    const paymentAmount = link.amount || amount;
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      handleAppError({ message: 'Please enter a valid amount' }, 'sendPayment');
      return;
    }

    // ✅ چک کردن fixed amount با precision بیشتر
    if (link.amount) {
      const linkAmount = parseFloat(link.amount);
      const userAmount = parseFloat(amount);
      
      if (Math.abs(linkAmount - userAmount) > 0.000001) {
        handleAppError({ 
          message: `This link requires exactly $${formatAmount(link.amount)} USDC` 
        }, 'sendPayment');
        return;
      }
    }

    setPaying(true);

    try {
      const unlockedAccount = await ensureWalletUnlocked();
      setAccount(unlockedAccount);

      await ensureBaseNetwork();

      const balance = await checkUSDCBalance(unlockedAccount);
      const finalAmount = parseFloat(paymentAmount);

      if (balance < finalAmount) {
        handleAppError({
          message: `Insufficient USDC balance. You have ${balance.toFixed(2)} USDC, but need ${finalAmount.toFixed(2)} USDC`
        }, 'sendPayment');
        setPaying(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(USDC_ADDRESS, [
        'function transfer(address to, uint amount) returns (bool)'
      ], signer);

      const tx = await contract.transfer(
        link.wallet_address,
        ethers.parseUnits(finalAmount.toString(), 6)
      );

      const receipt = await tx.wait();

    await supabase
  .from('payment')
  .update({
    status: 'paid',
    payer_name: payerName.trim() || 'Anonymous',
    payer_address: unlockedAccount,
    paid_at: new Date().toISOString(),
    tx_hash: receipt.hash  
  })
  .eq('id', link.id);

  // ✅ آپدیت link در state با tx_hash جدید
setLink({
  ...link,
  status: 'paid',
  payer_name: payerName.trim() || 'Anonymous',
  payer_address: unlockedAccount,
  paid_at: new Date().toISOString(),
  tx_hash: receipt.hash
});

      await supabase
        .from('donations')
        .insert({
          profile_id: link.user_id,
          donor_address: unlockedAccount,
          amount: finalAmount,
          message: message.trim() || `Payment for: ${link.title}`,
          tx_hash: receipt.hash,
          verified: true
        });

      showSuccess('Payment successful! Thank you! 🎉');
      celebrateDonation();
      setAmount('');
      setPayerName('');
      setMessage('');
      await loadLink();
    } catch (err) {
      handleAppError(err, 'sendPayment');
    } finally {
      setPaying(false);
    }
  }

  function formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
        <div className="text-center px-6">
          <div className="text-7xl mb-4">👻</div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Link Not Found
          </h1>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            This payment link doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isExpired = link.status === 'expired' || (link.expires_at && new Date(link.expires_at) < new Date());
  const isPaid = link.status === 'paid';
  const isCancelled = link.status === 'cancelled';
  const isActive = link.status === 'active' && !isExpired;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-blue-600/10' : 'bg-blue-400/20'}`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-purple-600/10' : 'bg-purple-400/20'}`} />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 relative z-10">
        <div className={`rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 border ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto flex items-center justify-center text-3xl sm:text-4xl mb-4 ${
              isPaid 
                ? isDark ? 'bg-green-500/20' : 'bg-green-100'
                : isDark ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              {isPaid ? '✅' : isExpired ? '' : isCancelled ? '❌' : '💳'}
            </div>
            <h1 className={`text-xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {link.title}
            </h1>
            {link.description && (
              <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {link.description}
              </p>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            {isPaid && (
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
              }`}>
                ✅ Paid
              </span>
            )}
            {isExpired && (
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}>
                ⌛ Expired
              </span>
            )}
            {isCancelled && (
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
              }`}>
                ❌ Cancelled
              </span>
            )}
            {isActive && (
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
              }`}>
                ✅ Active
              </span>
            )}
          </div>

          {/* Amount Display */}
          <div className={`rounded-2xl p-6 text-center mb-6 ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}>
            <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {link.amount ? 'Amount Due' : 'Enter Amount'}
            </p>
            {link.amount ? (
              <p className={`text-3xl sm:text-5xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ${formatAmount(link.amount)}
              </p>
            ) : (
              <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Any Amount
              </p>
            )}
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              USDC on Base Network
            </p>
                      <div className="flex justify-center mb-4">
  <QRCodeSVG 
    value={window.location.href}
    size={128}
    level="H"
    includeMargin={false}
    className={`rounded-xl ${isDark ? 'bg-white p-2' : 'bg-white p-2'}`}
  />
</div>
          </div>


          {/* Link Info */}
          <div className={`rounded-2xl p-4 mb-6 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Created</p>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatDate(link.created_at)}
                </p>
              </div>
              {link.expires_at && (
                <div>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Expires</p>
                  <p className={`font-medium ${isExpired ? 'text-red-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatDate(link.expires_at)}
                  </p>
                </div>
              )}
            </div>
            {link.wallet_address && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Receiving Wallet</p>
                <p className={`font-mono text-xs break-all ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formatAddress(link.wallet_address)}
                </p>
              </div>
            )}
          </div>

        {/* Paid Info */}
{isPaid && (
  <div className={`rounded-2xl p-6 mb-6 ${isDark ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
    <div className="text-center">
      <div className="text-5xl mb-3">🎉</div>
      <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
        Payment Completed!
      </h3>
      <p className={`text-sm mb-4 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
        Thank you, {link.payer_name || 'Anonymous'}!
      </p>
      {link.paid_at && (
        <p className={`text-xs mb-4 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
          Paid on {formatDate(link.paid_at)}
        </p>
      )}
      
      {/* ✅ نمایش tx_hash و لینک Basescan */}
      {link.tx_hash && (
        <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Transaction Hash
          </p>
          <p className={`font-mono text-xs break-all mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {link.tx_hash}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={`https://basescan.org/tx/${link.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium text-center transition ${
                isDark ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              🔗 View on Basescan
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(link.tx_hash);
                showSuccess('Transaction hash copied!');
              }}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition ${
                isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📋 Copy Hash
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}

          {/* Payment Form */}
          {isActive && (
            <div className={`rounded-2xl p-4 sm:p-6 ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                Complete Payment
              </h3>

              <div className="space-y-4">
                {/* Amount Input (اگه fixed amount نباشه) */}
                {!link.amount && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Amount (USDC) *
                    </label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        $
                      </span>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`w-full pl-8 pr-4 py-3 rounded-xl border focus:outline-none text-sm ${
                          isDark
                            ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Payer Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Your Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none text-sm ${
                      isDark
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Message (optional) */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Message (optional)
                  </label>
                  <textarea
                    placeholder="Add a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none text-sm resize-none ${
                      isDark
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Wallet Connection */}
                {!account ? (
                  <button
                    onClick={connectWallet}
                    className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:scale-105 transition-all"
                  >
                    🦊 Connect Wallet
                  </button>
                ) : (
                  <>
                    <div className={`flex items-center justify-between px-4 py-2 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className={`font-mono text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {formatAddress(account)}
                      </p>
                      <button
                        onClick={() => setAccount('')}
                        className="text-red-500 hover:text-red-600 text-xs font-medium"
                      >
                        Disconnect
                      </button>
                    </div>
                    <button
                      onClick={sendPayment}
                      disabled={paying || (!link.amount && !amount) || !payerName.trim()}
                      className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {paying 
                        ? '⏳ Processing...' 
                        : `💸 Pay ${link.amount ? '$' + formatAmount(link.amount) : amount ? '$' + formatAmount(amount) : ''} USDC`
                      }
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className={`mt-6 text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <p>
              Powered by <span className="font-semibold text-blue-500">PayOnBase24</span> • Built on Base Network
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}