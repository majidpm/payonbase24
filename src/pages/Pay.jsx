import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { supabase } from '../lib/supabase'
import QRCode from 'react-qr-code'
import { useTheme } from '../contexts/ThemeContext'
import { handleAppError, showSuccess } from '../lib/errorHandler'
import Navbar from '../components/Navbar'

export default function Pay() {
  const { isDark } = useTheme()
  const { slug } = useParams()
  const navigate = useNavigate()
  const [account, setAccount] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [payment, setPayment] = useState(null)
  const [copiedTx, setCopiedTx] = useState(false)
  const [user, setUser] = useState(null)
  const [signatureValid, setSignatureValid] = useState(false)
  const [signatureLoading, setSignatureLoading] = useState(false)
  const [walletConnecting, setWalletConnecting] = useState(false)
  const [needsSign, setNeedsSign] = useState(false)
  const [payerAddress, setPayerAddress] = useState(null)

  const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

  const isWalletInstalled = () => {
    return typeof window.ethereum !== 'undefined'
  }

  useEffect(() => {
    loadPayment()
    loadUser()
    const interval = setInterval(checkPaymentStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  async function loadUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (err) {
      console.error('Load user error:', err)
    }
  }

  async function loadPayment() {
    try {
      const { data, error } = await supabase
        .from('payment')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (error) throw error
      setPayment(data)
      if (data.paid && data.payer_address) {
        setPayerAddress(data.payer_address)
      }
    } catch (err) {
      handleAppError(err, 'loadPayment')
    } finally {
      setLoading(false)
    }
  }

  async function signMessage() {
    if (!account) {
      handleAppError({ message: 'Please connect wallet first' }, 'signMessage')
      return
    }
    if (!isWalletInstalled()) {
      handleAppError({ message: 'Please install MetaMask!' }, 'signMessage')
      return
    }
    
    setSignatureLoading(true)
    setStatus('⏳ Please sign the message in your wallet...')
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const message = `PayonBase24 - Wallet Verification
Domain: ${window.location.origin}
Address: ${account}
Timestamp: ${Date.now()}
Expires: 1 hour`
      
      const signature = await signer.signMessage(message)
      
      const { error } = await supabase
        .from('wallet_signatures')
        .insert({
          wallet_address: account,
          signature: signature,
          message: message,
          user_id: user?.id || null,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
      
      if (error) throw error
      
      setSignatureValid(true)
      setNeedsSign(false)
      showSuccess('Wallet verified successfully!')
    } catch (err) {
      handleAppError(err, 'signMessage')
      setSignatureValid(false)
      setNeedsSign(true)
    } finally {
      setSignatureLoading(false)
    }
  }

  async function checkPaymentStatus() {
    if (!payment || payment.paid) return
    try {
      const { data, error } = await supabase
        .from('payment')
        .select('paid, tx_hash, payer_address, is_active')
        .eq('slug', slug)
        .single()
      
      if (error) throw error
      
      if (data.paid && !payment.paid) {
        setPayment(prev => ({
          ...prev,
          paid: true,
          tx_hash: data.tx_hash,
          payer_address: data.payer_address,
          is_active: false
        }))
        setPayerAddress(data.payer_address)
        showSuccess('Payment Successful!')
      }
    } catch (err) {
      console.error('Status check error:', err)
    }
  }

  async function connectWallet() {
    try {
      if (!isWalletInstalled()) {
        handleAppError({ message: 'Please install a Web3 wallet' }, 'connectWallet')
        return
      }
      
      setWalletConnecting(true)
      setStatus('⏳ Connecting wallet...')
      
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0]
        setAccount(address)
        setStatus('✅ Wallet connected!')
        showSuccess('Wallet connected successfully!')
      } else {
        handleAppError({ message: 'No accounts found' }, 'connectWallet')
      }
    } catch (err) {
      handleAppError(err, 'connectWallet')
    } finally {
      setWalletConnecting(false)
    }
  }

  async function pay() {
    if (payment.is_active === false) {
      handleAppError({ message: 'This payment link is no longer active' }, 'pay')
      return
    }
    if (payment.paid) {
      handleAppError({ message: 'This payment has already been completed' }, 'pay')
      return
    }
    if (payment.expires_at && new Date() > new Date(payment.expires_at)) {
      handleAppError({ message: 'This payment link has expired' }, 'pay')
      return
    }
    if (!account) {
      handleAppError({ message: 'Please connect your wallet first' }, 'pay')
      return
    }
    if (!signatureValid) {
      handleAppError({ message: 'Please sign to verify your wallet first' }, 'pay')
      return
    }
    if (!isWalletInstalled()) {
      handleAppError({ message: 'Please install MetaMask!' }, 'pay')
      return
    }
    
    try {
      const BASE_CHAIN_ID = '0x2105'
      const currentChain = await window.ethereum.request({ method: 'eth_chainId' })
      
      if (currentChain !== BASE_CHAIN_ID) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID }]
        })
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(USDC_ADDRESS, [
        'function transfer(address to, uint amount) returns (bool)'
      ], signer)
      
      setStatus('⏳ Opening MetaMask...')
      const tx = await contract.transfer(
        payment.recipient,
        ethers.parseUnits(payment.amount.toString(), 6)
      )
      
      setStatus('⏳ Waiting for confirmation...')
      const receipt = await tx.wait()
      
      await supabase
        .from('payment')
        .update({
          paid: true,
          tx_hash: receipt.hash,
          payer_address: account,
          is_active: false
        })
        .eq('slug', slug)
      
      showSuccess('Payment Successful!')
      setPayment(prev => ({
        ...prev,
        paid: true,
        tx_hash: receipt.hash,
        payer_address: account,
        is_active: false
      }))
      setPayerAddress(account)
    } catch (err) {
      handleAppError(err, 'pay')
    }
  }

  function copyTxHash() {
    try {
      if (payment?.tx_hash) {
        navigator.clipboard.writeText(payment.tx_hash)
        setCopiedTx(true)
        showSuccess('Transaction hash copied!')
        setTimeout(() => setCopiedTx(false), 2000)
      }
    } catch (err) {
      handleAppError(err, 'copyTxHash')
    }
  }

  function viewOnBasescan() {
    if (payment?.tx_hash) {
      window.open(`https://basescan.org/tx/${payment.tx_hash}`, '_blank')
    }
  }

  function goToCreate() {
    navigate('/create')
  }



  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center text-xl sm:text-2xl transition-colors duration-300 ${
      isDark ? 'bg-gray-950 text-white' : 'bg-blue-50 text-gray-900'
    }`}>
      Loading...
    </div>
  );

  if (!payment) return (
    <div className={`min-h-screen flex items-center justify-center text-red-500 text-xl sm:text-2xl transition-colors duration-300 ${
      isDark ? 'bg-gray-950' : 'bg-blue-50'
    }`}>
      Payment link not found
    </div>
  );

  const paymentLink = `${window.location.origin}/pay/${payment.slug}`;
  const isPayer = account && payerAddress && account.toLowerCase() === payerAddress.toLowerCase();

  // ============================================
  // اگر لینک پرداخت شده
  // ============================================
  if (payment.paid) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-gray-950' : 'bg-blue-50'
      }`}>
        <Navbar />
        <div className="flex items-center justify-center p-4 pt-8 sm:pt-10">
          <div className={`max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden border transition-colors duration-300 ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'
          }`}>
            <div className={`p-4 sm:p-6 text-center transition-colors duration-300 ${
              isDark ? 'bg-blue-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'
            } text-white`}>
              <h1 className="text-2xl sm:text-3xl font-bold">Payment Request</h1>
              <p className="mt-1 opacity-90 text-sm sm:text-base">USDC on Base Network</p>
            </div>
            <div className="p-4 sm:p-6">
              {isPayer ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="text-center">
                    <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">✅</div>
                    <h2 className={`text-xl sm:text-2xl font-bold mb-2 transition-colors duration-300 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      Transaction Successful!
                    </h2>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Your payment was completed successfully
                    </p>
                  </div>
                  <div className={`p-3 sm:p-4 rounded-2xl transition-colors duration-300 ${
                    isDark ? 'bg-gray-800' : 'bg-gray-50'
                  }`}>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Transaction Hash
                    </p>
                    <p className={`font-mono text-xs break-all transition-colors duration-300 ${
                      isDark ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {payment.tx_hash}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={copyTxHash}
                      className={`flex-1 py-2 sm:py-3 rounded-2xl text-xs sm:text-sm font-medium transition-colors duration-300 ${
                        isDark
                          ? 'border border-gray-700 hover:bg-gray-800 text-gray-300'
                          : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {copiedTx ? '✅ Copied!' : 'Copy Tx Hash'}
                    </button>
                    <button
                      onClick={viewOnBasescan}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 sm:py-3 rounded-2xl text-xs sm:text-sm font-medium transition-colors"
                    >
                      View on Basescan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 sm:py-6">
                  <div className="text-6xl sm:text-7xl mb-3 sm:mb-4">✅</div>
                  <h2 className={`text-xl sm:text-2xl font-bold mb-2 transition-colors duration-300 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Payment Completed
                  </h2>
                  <p className={`text-sm sm:text-base transition-colors duration-300 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    This payment has already been processed.
                  </p>
                </div>
              )}
              <button
                onClick={goToCreate}
                className={`w-full mt-3 sm:mt-4 border py-2 sm:py-3 rounded-2xl text-sm sm:text-base font-semibold transition-all duration-300 ${
                  isDark
                    ? 'border-gray-700 hover:bg-gray-800 text-gray-300'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                + Create New PayLink
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // اگر لینک منقضی شده
  // ============================================
  if (payment.expires_at && new Date() > new Date(payment.expires_at)) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-gray-950' : 'bg-blue-50'
      }`}>
        <Navbar />
        <div className="flex items-center justify-center p-4 pt-8 sm:pt-10">
          <div className={`max-w-md w-full mx-4 rounded-3xl shadow-2xl overflow-hidden border transition-colors duration-300 ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'
          }`}>
            <div className={`p-6 sm:p-10 text-center transition-colors duration-300 ${
              isDark ? 'bg-blue-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'
            } text-white`}>
              <h1 className="text-2xl sm:text-3xl font-bold">Payment Request</h1>
              <p className="mt-2 opacity-90 text-sm sm:text-base">USDC on Base Network</p>
            </div>
            <div className="p-6 sm:p-8 text-center">
              <div className="text-6xl sm:text-7xl mb-4 sm:mb-6">⏰</div>
              <h2 className={`text-xl sm:text-2xl font-bold mb-2 transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Payment Link Expired
              </h2>
              <p className={`text-sm sm:text-base transition-colors duration-300 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                This payment link is no longer valid.
              </p>
              <button
                onClick={goToCreate}
                className={`w-full mt-4 sm:mt-6 border py-2 sm:py-3 rounded-2xl text-sm sm:text-base font-semibold transition-all duration-300 ${
                  isDark
                    ? 'border-gray-700 hover:bg-gray-800 text-gray-300'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                + Create New PayLink
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // صفحه اصلی پرداخت (برای لینک‌های فعال)
  // ============================================
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-950' : 'bg-blue-50'
    }`}>
      <Navbar />
      <div className="flex items-center justify-center p-4 pt-8 sm:pt-10">
        <div className={`max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden border transition-colors duration-300 ${
          isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'
        }`}>
          <div className={`p-4 sm:p-6 text-center transition-colors duration-300 ${
            isDark ? 'bg-blue-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'
          } text-white`}>
            <h1 className="text-2xl sm:text-3xl font-bold">Payment Request</h1>
            <p className="mt-1 opacity-90 text-sm sm:text-base">USDC on Base Network</p>
          </div>
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center">
              <div className={`p-3 sm:p-4 rounded-2xl bg-white`}>
                <QRCode
                  value={paymentLink}
                  size={150}
                  bgColor="#ffffff"
                  fgColor="#1e293b"
                />
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Scan with your phone to pay
              </p>
            </div>
            <div className="text-center">
              <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Amount to Pay
              </p>
              <p className={`text-4xl sm:text-5xl font-bold mt-1 transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {payment.amount} <span className="text-xl sm:text-2xl">USDC</span>
              </p>
            </div>
            <div className={`p-3 sm:p-4 rounded-2xl transition-colors duration-300 ${
              isDark ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <p className={`text-xs mb-1 transition-colors duration-300 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Recipient Address
              </p>
              <p className={`font-mono text-xs break-all transition-colors duration-300 ${
                isDark ? 'text-gray-300' : 'text-gray-900'
              }`}>
                {payment.recipient.substring(0, 6)}...{payment.recipient.substring(payment.recipient.length - 4)}
              </p>
              {user && (
                <p className={`font-mono text-xs break-all mt-1 pt-1 border-t ${
                  isDark ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'
                }`}>
                  Full: {payment.recipient}
                </p>
              )}
            </div>
            {!account ? (
              !isWalletInstalled() ? (
                <div className="space-y-3">
                  <div className={`p-3 rounded-2xl border text-center ${
                    isDark
                      ? 'bg-yellow-950/30 border-yellow-800'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                      ⚠️ No Web3 Wallet Detected
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      A wallet is required to make payments
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-center transition-colors duration-300 flex items-center justify-center gap-1 ${
                        isDark
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      🦊 MetaMask
                    </a>
                    <a
                      href="https://rabby.io/download"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-center transition-colors duration-300 flex items-center justify-center gap-1 ${
                        isDark
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                    >
                       Rabby
                    </a>
                  </div>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={walletConnecting}
                  className={`w-full py-3 rounded-2xl text-base sm:text-lg font-semibold transition-colors duration-300 ${
                    isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-white disabled:bg-gray-800'
                      : 'bg-gray-900 hover:bg-black text-white disabled:bg-gray-400'
                  }`}
                >
                  {walletConnecting ? '⏳ Connecting...' : 'Connect Wallet'}
                </button>
              )
            ) : signatureLoading ? (
              <button
                disabled
                className={`w-full py-3 rounded-2xl text-base sm:text-lg font-semibold ${
                  isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-300 text-gray-500'
                }`}
              >
                ⏳ Signing...
              </button>
            ) : !signatureValid ? (
              <button
                onClick={signMessage}
                className={`w-full py-3 rounded-2xl text-base sm:text-lg font-semibold transition-colors duration-300 ${
                  isDark
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
              >
                ✍️ Sign to Verify Wallet
              </button>
            ) : (
              <button
                onClick={pay}
                className={`w-full py-3 rounded-2xl text-base sm:text-lg font-semibold transition-colors duration-300 ${
                  isDark
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Pay Now
              </button>
            )}
            {status && (
              <p className={`text-center font-medium text-xs sm:text-base mt-2 transition-colors duration-300 ${
                status.includes('❌') || status.includes('Failed') || status.includes('rejected')
                  ? 'text-red-500'
                  : status.includes('✅') || status.includes('Successful')
                    ? 'text-green-500'
                    : isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {status}
              </p>
            )}
            <button
              onClick={goToCreate}
              className={`w-full border py-2 sm:py-3 rounded-2xl text-sm sm:text-base font-semibold transition-all duration-300 ${
                isDark
                  ? 'border-gray-700 hover:bg-gray-800 text-gray-300'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              + Create New PayLink
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}