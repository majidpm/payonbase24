import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { handleAppError, showSuccess } from '../lib/errorHandler';
import { celebrateDonation } from '../lib/celebrations';
import { QRCodeSVG } from 'qrcode.react';
import { useWallet } from '../hooks/useWallet';
import { useUSDCBalance } from '../hooks/useUSDCBalance';
import { useSendUSDC } from '../hooks/useSendUSDC';

export default function Pay() {
  const { isDark } = useTheme();
  const { slug } = useParams();
  const navigate = useNavigate();

  const { address, isConnected, isConnecting, connectWallet, ensureBaseNetwork, isOnBase } = useWallet();
  const { balance, isLoading: balanceLoading } = useUSDCBalance(address);
  const { sendUSDC, txHash, isPending, isConfirming, isSuccess, isError, error } = useSendUSDC();

  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  
  // State محلی برای tracking
  const [processedHash, setProcessedHash] = useState(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const gasFee = 0.0001;
  const [estimatedTotal, setEstimatedTotal] = useState(0);

  useEffect(() => {
    loadLink();
  }, [slug]);

  useEffect(() => {
    if (isSuccess && txHash && link && txHash !== processedHash) {
      console.log('🎉 Payment success! Processing...');
      setProcessedHash(txHash);
      handlePaymentSuccess(txHash);
    }
  }, [isSuccess, txHash, link, processedHash]);

  useEffect(() => {
    if (isError && error) {
      handleAppError(error, 'sendPayment');
    }
  }, [isError, error]);

  useEffect(() => {
    const paymentAmount = parseFloat(link?.amount || amount || 0);
    setEstimatedTotal(paymentAmount + gasFee);
  }, [link?.amount, amount, gasFee]);

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

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await supabase.from('payment').update({ status: 'expired' }).eq('id', data.id);
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

  async function handlePaymentSuccess(hash) {
    try {
      const finalAmount = parseFloat(link.amount || amount);

      await supabase.from('payment').update({
        status: 'paid',
        payer_name: 'Anonymous',
        payer_address: address,
        paid_at: new Date().toISOString(),
        tx_hash: hash
      }).eq('id', link.id);

      await supabase.from('donations').insert({
        profile_id: link.user_id,
        donor_address: address,
        amount: finalAmount,
        message: message.trim() || `Payment for: ${link.title}`,
        tx_hash: hash,
        verified: true
      });

      setPaymentComplete(true);
      
      showSuccess('Payment successful! Thank you! 🎉');
      celebrateDonation();

      setAmount('');
      setMessage('');

      await loadLink();
    } catch (err) {
      console.error('Error recording payment:', err);
    }
  }

  async function handlePay() {
    if (!link || !address) return;

    const switched = await ensureBaseNetwork();
    if (!switched) {
      handleAppError({ message: 'Please switch to Base Network' }, 'sendPayment');
      return;
    }

    const paymentAmount = parseFloat(link.amount || amount);
    if (!paymentAmount || paymentAmount <= 0) {
      handleAppError({ message: 'Please enter a valid amount' }, 'sendPayment');
      return;
    }

    if (link.amount) {
      const linkAmount = parseFloat(link.amount);
      if (Math.abs(linkAmount - paymentAmount) > 0.000001) {
        handleAppError({
          message: `This link requires exactly $${formatAmount(link.amount)} USDC`
        }, 'sendPayment');
        return;
      }
    }

    if (balance < paymentAmount) {
      handleAppError({
        message: `Insufficient USDC. You have ${balance.toFixed(2)}, need ${paymentAmount.toFixed(2)}`
      }, 'sendPayment');
      return;
    }

    try {
      await sendUSDC(link.wallet_address, paymentAmount);
    } catch (err) {
      handleAppError(err, 'sendPayment');
    }
  }

  function formatAmount(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toFixed(2);
  }

  function formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function getButtonText() {
    if (isPending) return 'Confirm in Wallet';
    if (isConfirming) return 'Confirming on Base...';
    return `Pay ${link.amount ? '$' + formatAmount(link.amount) : amount ? '$' + formatAmount(amount) : ''} USDC`;
  }

  function getButtonState() {
    if (isPending) return 'pending';
    if (isConfirming) return 'confirming';
    return 'idle';
  }

  function isPayButtonDisabled() {
    if (buttonState !== 'idle') return true;
    if (!link.amount && !amount) return true;
    if (!isOnBase) return true;
    return false;
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0a0a0f]' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-[#0a0a0f]' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
        <div className="text-center px-6">
          <div className="text-7xl mb-4">👻</div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Link Not Found</h1>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>This payment link doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isExpired = link.status === 'expired' || (link.expires_at && new Date(link.expires_at) < new Date());
  const isPaid = link.status === 'paid' || paymentComplete;
  const isCancelled = link.status === 'cancelled';
  const isActive = link.status === 'active' && !isExpired && !paymentComplete;
  const paymentAmount = parseFloat(link.amount || amount || 0);
  const buttonState = getButtonState();

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0f]' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl ${isDark ? 'bg-blue-600/5' : 'bg-blue-400/10'}`}></div>
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl ${isDark ? 'bg-purple-600/5' : 'bg-purple-400/10'}`}></div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              
            </div>
            <h1 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>PayOnBase24</h1>
          </div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Secure payment on Base Network
          </p>
        </div>

        {/* Main Payment Card */}
        <div className={`rounded-2xl border shadow-xl ${isDark ? 'bg-[#13131f] border-gray-800' : 'bg-white border-gray-200'}`}>
          
          {/* Card Header */}
          <div className={`p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                  isPaid ? (isDark ? 'bg-green-500/20' : 'bg-green-100') : 
                  isExpired ? (isDark ? 'bg-gray-800' : 'bg-gray-100') :
                  isCancelled ? (isDark ? 'bg-red-500/20' : 'bg-red-100') :
                  (isDark ? 'bg-blue-500/20' : 'bg-blue-100')
                }`}>
                  {isPaid ? '✅' : isExpired ? '⌛' : isCancelled ? '❌' : '💳'}
                </div>
                <div>
                  <h2 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{link.title}</h2>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isPaid ? 'Completed' : isExpired ? 'Expired' : isCancelled ? 'Cancelled' : 'Active'}
                  </p>
                </div>
              </div>
              {link.description && (
                <div className={`hidden sm:block text-xs px-3 py-1.5 rounded-lg ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  {link.description.substring(0, 30)}{link.description.length > 30 ? '...' : ''}
                </div>
              )}
            </div>
          </div>

          {/* ✅ Amount Display - فقط وقتی پرداخت نشده */}
          {isActive && (
            <div className="p-6">
              <div className={`rounded-xl p-4 ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {link.amount ? 'Amount Due' : 'You Pay'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">$</div>
                    <span className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>USDC</span>
                  </div>
                </div>
                
                {link.amount ? (
                  <div className={`text-4xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatAmount(link.amount)}
                  </div>
                ) : (
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isPending || isConfirming}
                    className={`w-full text-4xl font-bold bg-transparent outline-none ${isDark ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                  />
                )}
                
                {/* Balance */}
                {isConnected && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {balanceLoading ? (
                      <div className={`h-3 w-16 rounded animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                    ) : (
                      <>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Balance:</span>
                        <span className={`text-xs font-medium ${
                          balance >= paymentAmount 
                            ? (isDark ? 'text-gray-300' : 'text-gray-700')
                            : 'text-red-500'
                        }`}>
                          {balance.toFixed(2)} USDC
                        </span>
                        {balance < paymentAmount && paymentAmount > 0 && (
                          <span className="text-xs text-red-500">⚠️</span>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500"></div>
                  <span className={`font-mono text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatAddress(link.wallet_address)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Fee Breakdown - فقط وقتی فرم فعاله */}
          {isActive && (
            <div className={`px-6 pb-4 space-y-2`}>
              <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <span>Network Fee (Gas)</span>
                <span className="font-mono">~${gasFee.toFixed(4)}</span>
              </div>
              <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <span>Slippage</span>
                <span className="text-green-500 font-medium">0%</span>
              </div>
              <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <span>Price Impact</span>
                <span className="text-green-500 font-medium">&lt;0.01%</span>
              </div>
              <div className={`border-t pt-2 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Total</span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>${estimatedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Network Warning */}
          {isConnected && !isOnBase && isActive && (
            <div className="px-6 pb-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 p-3 rounded-lg text-xs">
                ⚠️ Please switch to Base Network to continue
              </div>
            </div>
          )}

          {/* Action Button - فقط وقتی فرم فعاله */}
          {isActive && (
            <div className="p-4 pt-0">
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 shadow-lg"
                >
                  {isConnecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Connecting...
                    </span>
                  ) : (
                    '🦊 Connect Wallet'
                  )}
                </button>
              ) : (
                <button
                  onClick={handlePay}
                  disabled={isPayButtonDisabled()}
                  className={`w-full py-4 rounded-xl font-semibold text-white transition-all shadow-lg ${
                    buttonState === 'pending'
                      ? 'bg-yellow-500'
                      : buttonState === 'confirming'
                      ? 'bg-blue-500'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {buttonState === 'pending' && (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Confirm in Wallet
                    </span>
                  )}
                  {buttonState === 'confirming' && (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Confirming on Base...
                    </span>
                  )}
                  {buttonState === 'idle' && getButtonText()}
                </button>
              )}
            </div>
          )}

          {/* ✅ Paid Success State - فقط بعد از پرداخت */}
          {isPaid && (
            <div className="p-6">
              <div className={`rounded-xl p-6 text-center ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                <div className="text-5xl mb-3">🎉</div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                  Payment Completed!
                </h3>
                <p className={`text-sm mb-4 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                  Thank you, Anonymous!
                </p>
                
                {(processedHash || link.tx_hash) && (
                  <div className={`rounded-lg p-3 mb-3 ${isDark ? 'bg-[#0a0a0f]' : 'bg-white'}`}>
                    <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Transaction Hash</p>
                    <p className={`font-mono text-xs break-all mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {processedHash || link.tx_hash}
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={`https://basescan.org/tx/${processedHash || link.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                      >
                        🔗 Basescan
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(processedHash || link.tx_hash);
                          showSuccess('Hash copied!');
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Transaction Details Toggle - فقط وقتی فرم فعاله */}
        {isActive && (
          <div className="mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
                isDark ? 'bg-[#13131f] border border-gray-800 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              <span>Transaction Details</span>
              <svg className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDetails && (
              <div className={`mt-2 rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#13131f] border border-gray-800' : 'bg-white border border-gray-200'}`}>
                <div className="flex justify-between text-xs">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Payment Link</span>
                  <span className={`font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{link.slug}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Network</span>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Base (Ethereum L2)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Token</span>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>USDC (ERC-20)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Decimals</span>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>6</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Created</span>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{formatDate(link.created_at)}</span>
                </div>
                {link.expires_at && (
                  <div className="flex justify-between text-xs">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Expires</span>
                    <span className={isExpired ? 'text-red-500' : isDark ? 'text-gray-300' : 'text-gray-700'}>
                      {formatDate(link.expires_at)}
                    </span>
                  </div>
                )}
                
                <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                  <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Scan to Pay</p>
                  <div className="flex justify-center">
                    <QRCodeSVG
                      value={window.location.href}
                      size={120}
                      level="H"
                      className="rounded-lg bg-white p-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Secured by Base Network • Powered by PayOnBase24
          </p>
        </div>
      </div>
    </div>
  );
}