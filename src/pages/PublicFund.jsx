import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { handleAppError, showSuccess } from '../lib/errorHandler';
import { celebrateDonation } from '../lib/celebrations';
import { ensureWalletUnlocked, checkUSDCBalance, ensureBaseNetwork } from '../lib/walletHelper';

export default function PublicFund() {
  const { isDark } = useTheme();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [fund, setFund] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState('');
  const [donateAmount, setDonateAmount] = useState('');
  const [donateName, setDonateName] = useState('');
  const [donating, setDonating] = useState(false);

  const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  useEffect(() => {
    loadFund();
    checkWallet();
  }, [slug]);

  async function loadFund() {
    setLoading(true);
    try {
      const { data: fundData, error } = await supabase
        .from('travel_funds')
        .select('*')
        .eq('slug', slug)
        .eq('is_public', true)
        .single();

      if (error || !fundData) {
        setFund(null);
      } else {
        setFund(fundData);
        await loadContributions(fundData.id);
      }
    } catch (err) {
      handleAppError(err, 'loadFund');
    } finally {
      setLoading(false);
    }
  }

  async function loadContributions(fundId) {
    try {
      const { data, error } = await supabase
        .from('travel_contributions')
        .select('*')
        .eq('fund_id', fundId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setContributions(data || []);
    } catch (err) {
      handleAppError(err, 'loadContributions');
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
  if (typeof window.ethereum === 'undefined') {
    handleAppError({ message: 'Please install MetaMask' }, 'connectWallet');
    return;
  }
  
  try {
    // ✅ استفاده از eth_requestAccounts که MetaMask رو باز می‌کنه
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (accounts && accounts.length > 0) {
      setAccount(accounts[0]);
      showSuccess('Wallet connected!');
    } else {
      handleAppError({ message: 'No accounts found' }, 'connectWallet');
    }
  } catch (err) {
    console.error('Connect wallet error:', err);
    
    // اگه user reject کرد
    if (err.code === 4001) {
      handleAppError({ message: 'Please approve wallet connection in MetaMask' }, 'connectWallet');
    } 
    // اگه MetaMask قفل باشه
    else if (err.message?.includes('locked') || err.message?.includes('unlock')) {
      handleAppError({ message: 'Please unlock MetaMask first' }, 'connectWallet');
    } 
    else {
      handleAppError(err, 'connectWallet');
    }
  }
}

  // ✅ تابع چک کردن موجودی USDC
  async function checkUSDCBalance(address) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(USDC_ADDRESS, [
        'function balanceOf(address owner) view returns (uint256)'
      ], provider);
      
      const balance = await contract.balanceOf(address);
      return parseFloat(ethers.formatUnits(balance, 6));
    } catch (err) {
      console.error('Balance check error:', err);
      return null;
    }
  }

async function donateToFund() {
  if (!fund || !donateAmount || !account) {
    handleAppError({ message: 'Please enter amount and connect wallet' }, 'donateToFund');
    return;
  }

  const amount = parseFloat(donateAmount);
  if (isNaN(amount) || amount <= 0) {
    handleAppError({ message: 'Please enter a valid amount' }, 'donateToFund');
    return;
  }

  setDonating(true);

  try {
    // ✅ 1. باز کردن MetaMask (حتی اگه قفل باشه)
    const unlockedAccount = await ensureWalletUnlocked();
    setAccount(unlockedAccount);

    // ✅ 2. چک کردن network
    await ensureBaseNetwork();

    // ✅ 3. چک کردن موجودی USDC
    const balance = await checkUSDCBalance(unlockedAccount);
    
    if (balance < amount) {
      handleAppError({ 
        message: `Insufficient USDC balance. You have ${balance.toFixed(2)} USDC, but need ${amount.toFixed(2)} USDC` 
      }, 'donateToFund');
      setDonating(false);
      return;
    }

    // ✅ 4. ارسال تراکنش
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(USDC_ADDRESS, [
      'function transfer(address to, uint amount) returns (bool)'
    ], signer);

    const tx = await contract.transfer(
      fund.wallet_address,
      ethers.parseUnits(donateAmount.toString(), 6)
    );

    const receipt = await tx.wait();

    await supabase
      .from('travel_contributions')
      .insert({
        fund_id: fund.id,
        contributor_address: unlockedAccount,
        contributor_name: donateName.trim() || 'Anonymous',
        amount: amount,
        tx_hash: receipt.hash
      });

    showSuccess('Donation successful! Thank you! 🎉');
    celebrateDonation();
    setDonateAmount('');
    setDonateName('');
    await loadContributions(fund.id);
    await loadFund();

  } catch (err) {
    handleAppError(err, 'donateToFund');
  } finally {
    setDonating(false);
  }
}

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950 text-white' : 'bg-blue-50 text-gray-900'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-gray-950 text-white' : 'bg-blue-50 text-gray-900'}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">👻</div>
          <h1 className="text-3xl font-bold mb-2">Fund Not Found</h1>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            This travel fund doesn't exist or is not public.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const totalCollected = contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const percentage = Math.min((totalCollected / fund.target_amount) * 100, 100);
  const isComplete = totalCollected >= fund.target_amount;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-10">
        {/* Header */}
        <div className={`rounded-3xl shadow-xl p-8 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
          <div className="text-center mb-6">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl mb-4 ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              ✈️
            </div>
            <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {fund.title}
            </h1>
            {fund.description && (
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {fund.description}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Progress
              </span>
              <span className={`text-sm font-bold ${isComplete ? 'text-green-500' : isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {percentage.toFixed(2)}%
              </span>
            </div>
            <div className={`w-full h-6 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Collected</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ${totalCollected.toFixed(2)}
              </p>
            </div>
            <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Target</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ${fund.target_amount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Complete Message */}
          {isComplete && (
            <div className={`p-4 rounded-2xl mb-6 ${isDark ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
              <p className={`text-center font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                🎉 Fund Complete! Ready to travel!
              </p>
            </div>
          )}

          {/* Donate Form */}
          {!isComplete && (
            <div className={`p-6 rounded-2xl ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                Contribute to this trip
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={donateName}
                  onChange={(e) => setDonateName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount in USDC"
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                />
                {!account ? (
                  <button
                    onClick={connectWallet}
                    className={`w-full py-3 rounded-xl font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-900 text-white'}`}
                  >
                    🦊 Connect Wallet
                  </button>
                ) : (
                  <button
                    onClick={donateToFund}
                    disabled={donating || !donateAmount}
                    className="w-full py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {donating ? '⏳ Processing...' : '💸 Send Contribution'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Contributions */}
        {contributions.length > 0 && (
          <div className={`rounded-3xl shadow-xl p-8 border mt-8 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Recent Contributors ({contributions.length})
            </h2>
            <div className="space-y-3">
              {contributions.map((c) => (
                <div key={c.id} className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {c.contributor_name || 'Anonymous'}
                      </p>
                      <p className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {c.contributor_address.substring(0, 6)}...{c.contributor_address.substring(38)}
                      </p>
                    </div>
                    <p className={`text-xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      ${parseFloat(c.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`mt-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <p className="text-xs">
            Powered by <span className="font-semibold text-blue-500">PayOnBase24</span> • Built on Base Network
          </p>
        </div>
      </div>
    </div>
  );
}