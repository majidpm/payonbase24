import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { verifyTransaction } from '../lib/verifyTransaction'

export default function PublicProfile() {
  const { isDark } = useTheme();
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  useEffect(() => {
    loadProfile();
    checkWallet();
  }, [username]);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !profileData) {
        setProfile(null);
      } else {
        setProfile(profileData);
        await loadDonations(profileData.id);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDonations(profileId) {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDonations(data);
      }
    } catch (err) {
      console.error('Error loading donations:', err);
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
      setStatus('❌ Please install MetaMask!');
      return;
    }
    setWalletConnecting(true);
    setStatus('⏳ Connecting wallet...');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setStatus('✅ Wallet connected!');
      }
    } catch (err) {
      console.error('Connect error:', err);
      setStatus('❌ Failed to connect wallet');
    } finally {
      setWalletConnecting(false);
    }
  }

  function disconnectWallet() {
    setAccount('');
    setStatus('Wallet disconnected.');
  }

 async function sendDonation() {
  if (!profile?.wallet_address) {
    setStatus('❌ This profile has not set up their wallet yet');
    return;
  }
  if (!amount && !customAmount) {
    setStatus('❌ Please select or enter an amount');
    return;
  }
  if (!account) {
    setStatus('❌ Please connect your wallet first');
    return;
  }

  const donationAmount = amount || customAmount;
  setSending(true);
  setStatus('⏳ Processing...');

  try {
    // 1. چک کردن network
    const BASE_CHAIN_ID = '0x2105';
    const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChain !== BASE_CHAIN_ID) {
      setStatus('⏳ Switching to Base Network...');
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID }]
      });
    }

    // 2. ارسال تراکنش
    setStatus('⏳ Sending transaction...');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(USDC_ADDRESS, [
      'function transfer(address to, uint amount) returns (bool)'
    ], signer);

    const tx = await contract.transfer(
      profile.wallet_address,
      ethers.parseUnits(donationAmount.toString(), 6)
    );

    setStatus('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();

    // 3. ✅ VERIFY TRANSACTION از blockchain
    setStatus('⏳ Verifying transaction...');
    const verification = await verifyTransaction(
      receipt.hash,
      profile.wallet_address,
      donationAmount
    );

    if (!verification.valid) {
      throw new Error(`Verification failed: ${verification.reason}`);
    }

    // 4. ثبت donation با داده‌های واقعی از blockchain
    setStatus('⏳ Recording donation...');
    const { error } = await supabase
      .from('donations')
      .insert({
        profile_id: profile.id,
        donor_address: verification.from,  // ← از blockchain
        amount: verification.amount,        // ← از blockchain
        message: message.trim() || null,
        tx_hash: receipt.hash,
        verified: true                      // ← flag جدید
      });

    if (error) throw error;

    setStatus('✅ Thank you for your donation!');
    setAmount('');
    setCustomAmount('');
    setMessage('');
    await loadDonations(profile.id);
  } catch (err) {
    console.error('Donation error:', err);
    if (err.code === 'ACTION_REJECTED') {
      setStatus(' Transaction rejected');
    } else {
      setStatus('❌ Failed: ' + (err.shortMessage || err.message));
    }
  } finally {
    setSending(false);
  }
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

  function getSocialUrl(platform, value) {
    const urls = {
      twitter: `https://x.com/${value}`,
      instagram: `https://instagram.com/${value}`,
      github: `https://github.com/${value}`,
      telegram: `https://t.me/${value}`,
      youtube: value.startsWith('http') ? value : `https://youtube.com/@${value}`,
      discord: `https://discord.com/users/${value}`,
      website: value
    };
    return urls[platform] || '#';
  }

  const socialIcons = {
    twitter: { icon: '', label: 'Twitter', color: 'from-blue-400 to-blue-600' },
    instagram: { icon: '📸', label: 'Instagram', color: 'from-pink-500 to-purple-600' },
    github: { icon: '💻', label: 'GitHub', color: 'from-gray-700 to-gray-900' },
    telegram: { icon: '✈️', label: 'Telegram', color: 'from-blue-400 to-blue-500' },
    youtube: { icon: '📺', label: 'YouTube', color: 'from-red-500 to-red-700' },
    discord: { icon: '🎮', label: 'Discord', color: 'from-indigo-500 to-purple-600' },
    website: { icon: '🌍', label: 'Website', color: 'from-emerald-500 to-green-600' }
  };

  const socials = ['twitter', 'instagram', 'github', 'telegram', 'youtube', 'discord', 'website']
    .filter(key => profile?.[key]);

  const topDonors = (() => {
    const donorAmounts = {};
    donations.forEach(d => {
      donorAmounts[d.donor_address] = (donorAmounts[d.donor_address] || 0) + parseFloat(d.amount);
    });
    return Object.entries(donorAmounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([address, total], idx) => ({ address, total, rank: idx + 1 }));
  })();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950 text-white' : 'bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-gray-950 text-white' : 'bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900'}`}>
        <div className="text-center px-6">
          <div className="text-7xl mb-4">👻</div>
          <h1 className="text-3xl font-bold mb-2">User Not Found</h1>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            The profile <span className="font-mono text-blue-500">/u/{username}</span> does not exist.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold hover:scale-105 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-blue-600/10' : 'bg-blue-400/20'}`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-purple-600/10' : 'bg-purple-400/20'}`} />
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-8 pb-16 relative z-10">
        {/* Profile Header Card */}
        <div className={`rounded-3xl shadow-2xl overflow-hidden border mb-6 ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
          {/* Cover */}
          <div className={`h-32 relative ${isDark ? 'bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900' : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'}`}>
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-8 left-8 w-24 h-24 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-8 right-8 w-32 h-32 bg-yellow-300 rounded-full blur-3xl" />
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className={`absolute top-3 right-3 px-3 py-1.5 rounded-xl font-medium text-xs transition-all hover:scale-105 ${
                copiedLink
                  ? 'bg-green-500 text-white'
                  : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30'
              }`}
            >
              {copiedLink ? '✅ Copied!' : '📋 Copy Link'}
            </button>
          </div>

          {/* Profile Info */}
          <div className="px-6 pb-6 -mt-12 relative">
            <div className="flex items-end gap-4 mb-4">
              <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-2xl border-4 ${
                isDark ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-gray-900' : 'bg-gradient-to-br from-blue-600 to-purple-600 border-white'
              }`}>
                {profile.display_name ? profile.display_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2">
                  <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {profile.display_name || profile.username}
                  </h1>
                  <span className="text-2xl" title="Verified">✅</span>
                </div>
                <p className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  @{profile.username}
                </p>
              </div>
            </div>

            {profile.bio && (
              <p className={`text-base leading-relaxed mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {profile.bio}
              </p>
            )}

            {/* Social Media */}
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {socials.map((key) => {
                  const social = socialIcons[key];
                  return (
                    <a
                      key={key}
                      href={getSocialUrl(key, profile[key])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:scale-105 ${
                        isDark
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <span>{social.icon}</span>
                      <span>{social.label}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Donation Section - Compact */}
        <div className={`rounded-3xl shadow-2xl p-6 border mb-6 ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
          <div className="text-center mb-5">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              💝 Support {profile.display_name || profile.username}
            </h2>
          </div>

          <div className="space-y-4">
            {/* Quick Amount */}
            <div className="grid grid-cols-4 gap-2">
              {['1', '5', '10', '25'].map((val) => (
                <button
                  key={val}
                  onClick={() => { setAmount(val); setCustomAmount(''); }}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 ${
                    amount === val
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : isDark
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {val} USDC
                </button>
              ))}
            </div>

            {/* Custom Amount + Message Row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); setAmount(''); }}
                  className={`w-full pl-8 pr-3 py-3 border rounded-xl focus:outline-none text-sm ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                  }`}
                />
              </div>
              <input
                type="text"
                placeholder="Message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`flex-1 px-3 py-3 border rounded-xl focus:outline-none text-sm ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                }`}
              />
            </div>

            {/* Wallet & Pay */}
            {!account ? (
              <button
                onClick={connectWallet}
                disabled={walletConnecting}
                className="w-full py-3 rounded-xl font-semibold transition-all hover:scale-105 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
              >
                {walletConnecting ? '⏳ Connecting...' : '🦊 Connect Wallet'}
              </button>
            ) : (
              <div className="space-y-2">
                <div className={`flex items-center justify-between px-4 py-2 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <p className={`font-mono text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatAddress(account)}
                  </p>
                  <button onClick={disconnectWallet} className="text-red-500 hover:text-red-600 text-xs font-medium">
                    Disconnect
                  </button>
                </div>
                <button
                  onClick={sendDonation}
                  disabled={sending || (!amount && !customAmount)}
                  className="w-full py-3 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                >
                  {sending ? ' Processing...' : '💸 Send Donation'}
                </button>
              </div>
            )}

            {status && (
              <p className={`text-center text-sm font-medium ${
                status.includes('❌') ? 'text-red-500' : status.includes('✅') ? 'text-green-500' : isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {status}
              </p>
            )}
          </div>
        </div>

        {/* Top Donors */}
        {topDonors.length > 0 && (
          <div className={`rounded-3xl shadow-2xl p-6 border ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              🏆 Top Supporters
            </h2>
            <div className="space-y-3">
              {topDonors.map((donor) => {
                const medals = ['🥇', '🥈', '🥉'];
                const colors = [
                  'from-yellow-500 to-yellow-600',
                  'from-gray-400 to-gray-500',
                  'from-orange-500 to-orange-600'
                ];
                return (
                  <div
                    key={donor.address}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all hover:scale-105 ${
                      isDark ? 'bg-gray-800/50' : 'bg-gradient-to-r from-gray-50 to-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${colors[donor.rank - 1]} text-white shadow-lg`}>
                        {medals[donor.rank - 1]}
                      </div>
                      <div>
                        <p className={`font-mono text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {formatAddress(donor.address)}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          #{donor.rank} Top Donor
                        </p>
                      </div>
                    </div>
                    <p className={`text-xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      {formatAmount(donor.total)} USDC
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {donations.length === 0 && (
          <div className={`rounded-3xl shadow-2xl p-8 border text-center ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
            <div className="text-5xl mb-3">🎁</div>
            <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Be the First to Donate!
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No donations yet. Be the first to support {profile.display_name || profile.username}!
            </p>
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