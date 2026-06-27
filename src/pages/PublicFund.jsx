import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'
import { useWallet } from '../hooks/useWallet'
import { useUSDCBalance } from '../hooks/useUSDCBalance'
import { useSendUSDC } from '../hooks/useSendUSDC'
import { handleAppError, showSuccess } from '../lib/errorHandler'
import { verifyTransaction } from '../lib/verifyTransaction'
import { celebrateDonation } from '../lib/celebrations'

export default function PublicFund() {
  const { isDark } = useTheme()
  const { slug } = useParams()
  const navigate = useNavigate()
  
  const { address, isConnected, isConnecting, connectWallet, ensureBaseNetwork, isOnBase } = useWallet()
  const { balance, isLoading: balanceLoading } = useUSDCBalance(address)
  const { sendUSDC, txHash, isPending, isConfirming, isSuccess, isError, error } = useSendUSDC()

  const [fund, setFund] = useState(null)
  const [contributions, setContributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [name, setName] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [localTxHash, setLocalTxHash] = useState(null)
  const [localStatus, setLocalStatus] = useState('idle')

  useEffect(() => {
    loadFund()
  }, [slug])

  useEffect(() => {
    if (isPending && localStatus === 'idle') {
      setLocalStatus('pending')
    }
  }, [isPending])

  useEffect(() => {
    if (isConfirming && localStatus === 'pending') {
      setLocalStatus('confirming')
    }
  }, [isConfirming])

  useEffect(() => {
    if (isSuccess && txHash && localStatus !== 'success') {
      setLocalTxHash(txHash)
      setLocalStatus('success')
      handleContributionSuccess(txHash)
    }
  }, [isSuccess, txHash])

  useEffect(() => {
    if (isError && error) {
      setLocalStatus('error')
      handleAppError(error, 'contributeToFund')
    }
  }, [isError, error])

  async function loadFund() {
    setLoading(true)
    try {
      console.log('🔍 PublicFund: Loading fund with slug:', slug)
      
      // 1. لود fund با slug
      const { data: fundData, error: fundError } = await supabase
        .from('travel_funds')
        .select('*')
        .eq('slug', slug)
        .single()

      if (fundError || !fundData) {
        console.error('Fund not found:', fundError)
        setFund(null)
        setLoading(false)
        return
      }

      setFund(fundData)
      console.log('✅ PublicFund: Fund loaded:', fundData)

      // 2. لود contributions
      await loadContributions(fundData.id)
    } catch (err) {
      console.error('Error loading fund:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadContributions(fundId) {
    try {
      const { data, error } = await supabase
        .from('travel_contributions')
        .select('*')
        .eq('fund_id', fundId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setContributions(data)
        console.log('🔍 PublicFund: Contributions loaded:', data.length)
      }
    } catch (err) {
      console.error('Error loading contributions:', err)
    }
  }

  async function handleContributionSuccess(hash) {
    try {
      const contributionAmount = parseFloat(amount || customAmount)

      const verification = await verifyTransaction(
        hash,
        fund.wallet_address,
        contributionAmount
      )

      if (!verification.valid) {
        throw new Error(`Verification failed: ${verification.reason}`)
      }

      await supabase.from('travel_contributions').insert({
        fund_id: fund.id,
        contributor_address: verification.from,
        contributor_name: name.trim() || 'Anonymous',
        amount: verification.amount,
        tx_hash: hash
      })

      showSuccess('Contribution successful! 🎉')
      celebrateDonation()

      setAmount('')
      setCustomAmount('')
      setName('')

      await loadContributions(fund.id)
    } catch (err) {
      console.error('Error recording contribution:', err)
      handleAppError(err, 'recordContribution')
    }
  }

  async function handleContribute() {
    if (!fund?.wallet_address) {
      handleAppError({ message: 'This fund has not set up their wallet yet' }, 'contributeToFund')
      return
    }

    if (!amount && !customAmount) {
      handleAppError({ message: 'Please select or enter an amount' }, 'contributeToFund')
      return
    }

    const switched = await ensureBaseNetwork()
    if (!switched) {
      handleAppError({ message: 'Please switch to Base Network' }, 'contributeToFund')
      return
    }

    const contributionAmount = parseFloat(amount || customAmount)
    
    if (balance < contributionAmount) {
      handleAppError({
        message: `Insufficient USDC. You have ${balance.toFixed(2)}, need ${contributionAmount.toFixed(2)}`
      }, 'contributeToFund')
      return
    }

    try {
      setLocalStatus('pending')
      await sendUSDC(fund.wallet_address, contributionAmount)
    } catch (err) {
      setLocalStatus('error')
      handleAppError(err, 'contributeToFund')
    }
  }

  function handleContributeAgain() {
    setLocalTxHash(null)
    setLocalStatus('idle')
    setAmount('')
    setCustomAmount('')
    setName('')
  }

  function formatAddress(address) {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(38)}`
  }

  function formatAmount(amount) {
    const num = parseFloat(amount)
    if (isNaN(num)) return '0.00'
    if (num >= 1) return num.toFixed(2)
    if (num >= 0.01) return num.toFixed(4)
    return num.toFixed(6)
  }

  const totalCollected = contributions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
  const percentage = fund ? Math.min((totalCollected / fund.target_amount) * 100, 100) : 0
  const isComplete = totalCollected >= fund?.target_amount

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950 text-white' : 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 text-gray-900'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!fund) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-gray-950 text-white' : 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 text-gray-900'}`}>
        <div className="text-center px-6">
          <div className="text-7xl mb-4">👻</div>
          <h1 className="text-3xl font-bold mb-2">Fund Not Found</h1>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            The travel fund with slug <span className="font-mono text-green-500">/trip/{slug}</span> does not exist.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-2xl font-semibold hover:scale-105 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const contributionAmount = parseFloat(amount || customAmount || 0)

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50'}`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-green-600/10' : 'bg-green-400/20'}`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-teal-600/10' : 'bg-teal-400/20'}`} />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20 relative z-10">
        {/* Fund Header */}
        <div className={`rounded-3xl shadow-2xl overflow-hidden border mb-6 ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
          <div className={`h-32 relative ${isDark ? 'bg-gradient-to-r from-green-900 via-emerald-900 to-teal-900' : 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500'}`}>
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-8 left-8 w-24 h-24 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-8 right-8 w-32 h-32 bg-yellow-300 rounded-full blur-3xl" />
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                setCopiedLink(true)
                showSuccess('Link copied!')
                setTimeout(() => setCopiedLink(false), 2000)
              }}
              className={`absolute top-3 right-3 px-3 py-1.5 rounded-xl font-medium text-xs transition-all hover:scale-105 ${
                copiedLink ? 'bg-green-500 text-white' : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30'
              }`}
            >
              {copiedLink ? '✅ Copied!' : '📋 Copy Link'}
            </button>
          </div>

          <div className="px-6 pb-6 -mt-12 relative">
            <div className="flex items-end gap-4 mb-4">
              <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-4xl shadow-2xl border-4 ${
                isDark ? 'bg-gradient-to-br from-green-500 to-teal-600 border-gray-900' : 'bg-gradient-to-br from-green-600 to-teal-600 border-white'
              }`}>
                ✈️
              </div>
              <div className="flex-1 pb-1">
                <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {fund.title}
                </h1>
                {fund.description && (
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {fund.description}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Progress</span>
                <span className={`text-sm font-bold ${isComplete ? 'text-green-500' : isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isComplete 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                      : 'bg-gradient-to-r from-green-500 to-teal-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Collected</p>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ${totalCollected.toFixed(2)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Target</p>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ${fund.target_amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {localStatus === 'success' && localTxHash && (
          <div className={`rounded-3xl shadow-2xl p-6 border mb-6 ${isDark ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200'}`}>
            <div className="text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                Contribution Successful!
              </h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                Thank you for supporting this trip!
              </p>
              <div className={`p-3 rounded-xl mb-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Transaction Hash</p>
                <p className={`font-mono text-xs break-all ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {localTxHash}
                </p>
              </div>
              <button
                onClick={handleContributeAgain}
                className="px-6 py-2 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-teal-600 text-white hover:scale-105 transition-all"
              >
                ✈️ Contribute Again
              </button>
            </div>
          </div>
        )}

        {/* Contribution Form */}
        {localStatus !== 'success' && !isComplete && (
          <div className={`rounded-3xl shadow-2xl p-6 border mb-6 ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
            <div className="text-center mb-5">
              <h2 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ✈️ Support This Trip
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Contribute to help fund this travel
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {['5', '10', '25', '50'].map((val) => (
                  <button
                    key={val}
                    onClick={() => { setAmount(val); setCustomAmount('') }}
                    disabled={localStatus !== 'idle'}
                    className={`py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50 ${
                      amount === val
                        ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg'
                        : isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setAmount('') }}
                    disabled={localStatus !== 'idle'}
                    className={`w-full pl-8 pr-3 py-3 border rounded-xl focus:outline-none text-sm ${
                      isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-green-600'
                    }`}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={localStatus !== 'idle'}
                  className={`flex-1 px-3 py-3 border rounded-xl focus:outline-none text-sm ${
                    isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-green-600'
                  }`}
                />
              </div>

              {isConnected && (
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Your Balance</span>
                    {balanceLoading ? (
                      <div className={`h-4 w-16 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    ) : (
                      <span className={`text-sm font-bold ${contributionAmount <= balance ? 'text-green-500' : 'text-red-500'}`}>
                        {balance.toFixed(2)} USDC
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isConnected && !isOnBase && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-600 p-3 rounded-xl text-xs">
                  ⚠️ Please switch to Base Network to continue
                </div>
              )}

              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="w-full py-3 rounded-xl font-semibold transition-all hover:scale-105 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg disabled:opacity-50"
                >
                  {isConnecting ? '⏳ Connecting...' : '🦊 Connect Wallet'}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className={`flex items-center justify-between px-4 py-2 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <p className={`font-mono text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {formatAddress(address)}
                    </p>
                    <span className="text-green-500 text-xs">✅ Connected</span>
                  </div>
                  <button
                    onClick={handleContribute}
                    disabled={localStatus !== 'idle' || (!amount && !customAmount) || !isOnBase}
                    className={`w-full py-3 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 text-white shadow-lg ${
                      localStatus === 'pending' ? 'bg-yellow-500' : localStatus === 'confirming' ? 'bg-green-500' : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700'
                    }`}
                  >
                    {localStatus === 'pending' && (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Confirm in Wallet
                      </span>
                    )}
                    {localStatus === 'confirming' && (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Confirming on Base...
                      </span>
                    )}
                    {localStatus === 'idle' && `✈️ Contribute $${amount || customAmount || '0'}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complete Message */}
        {isComplete && (
          <div className={`rounded-3xl shadow-2xl p-8 border text-center mb-6 ${isDark ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200'}`}>
            <div className="text-5xl mb-3">🎉</div>
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
              Fund Complete!
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              This travel fund has reached its goal. Thank you to all contributors!
            </p>
          </div>
        )}

        {/* Contributions List */}
        {contributions.length > 0 && (
          <div className={`rounded-3xl shadow-2xl p-6 border ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
               Contributors ({contributions.length})
            </h2>
            <div className="space-y-3">
              {contributions.map((c, idx) => (
                <div key={c.id} className={`flex items-center justify-between p-4 rounded-xl transition-all ${isDark ? 'bg-gray-800/50' : 'bg-gradient-to-r from-gray-50 to-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-lg`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {c.contributor_name || 'Anonymous'}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatAddress(c.contributor_address)}
                      </p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    ${formatAmount(c.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {contributions.length === 0 && (
          <div className={`rounded-3xl shadow-2xl p-8 border text-center ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
            <div className="text-5xl mb-3">✈️</div>
            <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Be the First Contributor!
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No contributions yet. Be the first to support this trip!
            </p>
          </div>
        )}

        <div className={`mt-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <p className="text-xs">
            Powered by <span className="font-semibold text-green-500">PayOnBase24</span> • Built on Base Network
          </p>
        </div>
      </div>
    </div>
  )
}