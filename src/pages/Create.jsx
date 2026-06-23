import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { useTheme } from '../contexts/ThemeContext';

export default function Create() {
  const { isDark } = useTheme();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  const validateAddress = (address) => {
    if (!address) {
      setAddressError('');
      return true;
    }
    const baseAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!baseAddressRegex.test(address)) {
      setAddressError('Invalid address');
      return false;
    }
    setAddressError('');
    return true;
  };

  const handleAddressChange = (e) => {
    const value = e.target.value;
    setTo(value);
    validateAddress(value);
  };

  async function createLink() {
    if (!to || !amount) {
      alert('Please enter wallet address and amount');
      return;
    }
    if (!validateAddress(to)) {
      return;
    }
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        alert('Please login');
        return;
      }
      const slug = uuidv4().slice(0, 8);
      const { error } = await supabase
        .from('payment')
        .insert({
          slug,
          recipient: to,
          amount,
          user_id: currentUser.id
        });
      if (error) throw error;
      const link = `${window.location.origin}/pay/${slug}`;
      await navigator.clipboard.writeText(link);
      navigate(`/pay/${slug}`);
    } catch (err) {
      alert('Failed to create link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <h1 className={`text-3xl sm:text-5xl font-bold mb-4 transition-colors duration-300 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Send USDC Instantly
          </h1>
          <p className={`text-base sm:text-xl transition-colors duration-300 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Create secure payment links on Base Network
          </p>
        </div>

        <div className={`rounded-3xl shadow-xl p-4 sm:p-8 border transition-colors duration-300 ${
          isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'
        }`}>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className={`block text-sm font-medium transition-colors duration-300 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Recipient Wallet Address
                </label>
                <div
                  className="relative inline-flex items-center"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <span className={`text-sm font-bold cursor-help transition-colors duration-200 ${
                    isDark ? 'text-yellow-400' : 'text-yellow-500'
                  }`}>
                    ⚠️
                  </span>
                  {showTooltip && (
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2.5 rounded-xl text-xs z-50 shadow-lg transition-all duration-200 min-w-[220px] text-center ${
                      isDark
                        ? 'bg-gray-800 text-gray-200 border border-gray-700'
                        : 'bg-white text-gray-700 border border-gray-200 shadow-gray-200'
                    }`}>
                      <p className="font-medium">⚠️ Important</p>
                      <p className="mt-1 opacity-90">
                        Address must start with <span className="font-mono font-semibold">0x</span>
                      </p>
                      <p className="text-[11px] mt-0.5 opacity-70">
                        Wrong address = Funds lost forever
                      </p>
                      <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent ${
                        isDark ? 'border-t-gray-800' : 'border-t-white'
                      }`}></div>
                    </div>
                  )}
                </div>
              </div>
              <input
                type="text"
                placeholder="0x1234567890abcdef..."
                value={to}
                onChange={handleAddressChange}
                className={`w-full px-4 sm:px-5 py-3 sm:py-4 border rounded-2xl focus:outline-none text-base sm:text-lg transition-colors duration-300 ${
                  addressError
                    ? 'border-red-500 focus:border-red-600 ring-2 ring-red-500/20'
                    : isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                      : 'bg-white border-blue-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Amount (USDC)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full px-4 sm:px-5 py-3 sm:py-4 border rounded-2xl focus:outline-none text-base sm:text-lg transition-colors duration-300 ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-white border-blue-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                }`}
              />
            </div>

            <button
              onClick={createLink}
              disabled={loading || !to || !amount || !!addressError}
              className={`w-full font-semibold py-3 sm:py-4 rounded-2xl text-base sm:text-lg transition-all duration-300 ${
                isDark
                  ? 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white'
              }`}
            >
              {loading ? 'Creating...' : 'Create Payment Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}