import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import ConnectButton from './ConnectButton';
import BottomNav from './BottomNav';
import { usePrivy } from '@privy-io/react-auth';
import { useAutoProfile } from '../hooks/useAutoProfile';

export default function SidebarLayout({ children }) {
  const { user: privyUser, authenticated, ready, logout } = usePrivy();
  const { profile } = useAutoProfile(); // ✅ فقط از hook استفاده کن
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [loading, setLoading] = useState(true);
  const [paylinkExpanded, setPaylinkExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ✅ چک کردن authentication
  const privyId = privyUser?.id;

  useEffect(() => {
    if (!ready) return;
    
    if (!authenticated) {
      navigate('/auth');
      return;
    }
  }, [ready, authenticated, privyId]);

  // ✅ وقتی پروفایل لود شد، loading رو false کن
  useEffect(() => {
    if (profile) {
      setLoading(false);
    } else if (ready && !authenticated) {
      setLoading(false);
    }
  }, [profile, ready, authenticated]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const isActive = (path) => {
    if (path === '/create') return location.pathname === '/create';
    return location.pathname.startsWith(path);
  };

  // آیکون‌های SVG
  const Icons = {
    PayLink: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    Dashboard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    Donation: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    Travel: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    Settings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    Theme: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isDark ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        )}
      </svg>
    ),
    Logout: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
    Profile: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    ChevronDown: (
      <svg className={`w-4 h-4 transition-transform duration-300 ${paylinkExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ),
    Menu: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    Close: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  };

  if (loading || !ready) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-950 text-white' : 'bg-blue-50 text-gray-900'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // اطلاعات کاربر از Privy
  const userEmail = privyUser?.email?.address;
  const userDisplayName = profile?.display_name || userEmail?.split('@')[0] || 'User';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
      <div className="max-w-7xl mx-auto flex min-h-screen">
        
        {/* Mobile Header */}
        <div className={`md:hidden fixed top-0 left-0 right-0 z-40 border-b backdrop-blur-xl ${
          isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'
        }`}>
          <div className="px-4 py-3 flex justify-between items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {mobileMenuOpen ? Icons.Close : Icons.Menu}
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg`}>
                P
              </div>
              <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                PayOnBase24
              </span>
            </div>
            <ConnectButton />
          </div>
        </div>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - Mobile */}
        <aside className={`md:hidden fixed top-0 left-0 h-full z-50 transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDark ? 'bg-gray-900' : 'bg-white'} w-72 shadow-2xl`}>
          <div className={`p-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg bg-gradient-to-br from-blue-500 to-purple-600`}>
                P
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  PayOnBase24
                </h1>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  USDC • Base Network
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* PayLink */}
            <div>
              <button
                onClick={() => setPaylinkExpanded(!paylinkExpanded)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${
                  isActive('/create') || isActive('/dashboard')
                    ? isDark ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30' : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border border-blue-200'
                    : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {Icons.PayLink}
                  <div className="text-left">
                    <p className="font-semibold">PayLink</p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      Create & manage links
                    </p>
                  </div>
                </div>
                {Icons.ChevronDown}
              </button>

              {paylinkExpanded && (
                <div className={`ml-6 mt-2 space-y-1 pl-4 border-l-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button
                    onClick={() => { navigate('/create'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                      location.pathname === '/create'
                        ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                        : isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    + Create New Link
                  </button>
                  <button
                    onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                      location.pathname === '/dashboard'
                        ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                        : isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    📊 Dashboard
                  </button>
                </div>
              )}
            </div>

            {/* Donation */}
            <button
              onClick={() => { navigate('/donation'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                isActive('/donation')
                  ? isDark ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-400 border border-pink-500/30' : 'bg-gradient-to-r from-pink-50 to-rose-50 text-pink-600 border border-pink-200'
                  : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {Icons.Donation}
              <div>
                <p className="font-semibold">Donation</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Receive donations
                </p>
              </div>
            </button>

            {/* TravelFund */}
            <button
              onClick={() => { navigate('/travel'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                isActive('/travel')
                  ? isDark ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 border border-emerald-200'
                  : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {Icons.Travel}
              <div>
                <p className="font-semibold">TravelFund</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Split expenses
                </p>
              </div>
            </button>
          </nav>

          <div className={`p-4 border-t space-y-2 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <button
              onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                isActive('/settings')
                  ? isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                  : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {Icons.Settings}
              <span className="font-semibold">Settings</span>
            </button>

            <button
              onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {Icons.Theme}
              <span className="font-semibold">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-blue-500 to-purple-600`}>
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {userDisplayName}
                  </p>
                  <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {userEmail}
                  </p>
                </div>
              </div>
              {profile?.username && (
                <button
                  onClick={() => { navigate(`/u/${profile.username}`); setMobileMenuOpen(false); }}
                  className={`w-full text-xs py-2 rounded-lg transition-all mb-2 ${
                    isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  View Public Profile →
                </button>
              )}
              <button
                onClick={handleLogout}
                className={`w-full text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  isDark ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'
                }`}
              >
                {Icons.Logout}
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Sidebar - Desktop */}
        <aside className={`hidden md:flex flex-col w-72 flex-shrink-0 border-r sticky top-0 h-screen ${
          isDark 
            ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-gray-800' 
            : 'bg-gradient-to-b from-white via-white to-gray-50 border-gray-200'
        }`}>
          <div className={`p-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-blue-500/20`}>
                P
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  PayOnBase24
                </h1>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  USDC • Base Network
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="space-y-1">
              <button
                onClick={() => setPaylinkExpanded(!paylinkExpanded)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                  isActive('/create') || isActive('/dashboard')
                    ? isDark 
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10' 
                      : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border border-blue-200 shadow-md'
                    : isDark 
                      ? 'text-gray-300 hover:bg-gray-800/50' 
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {Icons.PayLink}
                  <div className="text-left">
                    <p className="font-semibold">PayLink</p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      Create & manage links
                    </p>
                  </div>
                </div>
                {Icons.ChevronDown}
              </button>

              {paylinkExpanded && (
                <div className={`ml-6 mt-1 space-y-1 pl-4 border-l-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button
                    onClick={() => navigate('/create')}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                      location.pathname === '/create'
                        ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                        : isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">+</span>
                    Create New Link
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                      location.pathname === '/dashboard'
                        ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                        : isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {Icons.Dashboard}
                    Dashboard
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/donation')}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group ${
                isActive('/donation')
                  ? isDark 
                    ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-400 border border-pink-500/30 shadow-lg shadow-pink-500/10' 
                    : 'bg-gradient-to-r from-pink-50 to-rose-50 text-pink-600 border border-pink-200 shadow-md'
                  : isDark 
                    ? 'text-gray-300 hover:bg-gray-800/50' 
                    : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {Icons.Donation}
              <div>
                <p className="font-semibold">Donation</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Receive donations
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/travel')}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group ${
                isActive('/travel')
                  ? isDark 
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10' 
                    : 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 border border-emerald-200 shadow-md'
                  : isDark 
                    ? 'text-gray-300 hover:bg-gray-800/50' 
                    : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {Icons.Travel}
              <div>
                <p className="font-semibold">TravelFund</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Split expenses
                </p>
              </div>
            </button>
          </nav>

          <div className={`mt-auto p-4 border-t space-y-2 flex-shrink-0 ${
            isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50/50'
          }`}>
            <button
              onClick={() => navigate('/settings')}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                isActive('/settings')
                  ? isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                  : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {Icons.Settings}
              <span className="font-semibold">Settings</span>
            </button>

            <button
              onClick={toggleTheme}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {Icons.Theme}
              <span className="font-semibold">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <div className={`p-4 rounded-xl ${
              isDark 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' 
                : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-blue-500/20 shadow-lg`}>
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {userDisplayName}
                  </p>
                  <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {userEmail}
                  </p>
                </div>
              </div>
              {profile?.username && (
                <button
                  onClick={() => navigate(`/u/${profile.username}`)}
                  className={`w-full text-xs py-2 rounded-lg transition-all mb-2 flex items-center justify-center gap-2 ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                  }`}
                >
                  {Icons.Profile}
                  View Public Profile →
                </button>
              )}
              {/* اگه username نداره */}
{!profile?.username && (
  <button
    onClick={() => navigate('/settings')}
    className={`w-full text-xs py-2 rounded-lg transition-all mb-2 ${
      isDark 
        ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' 
        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
    }`}
  >
    ⚙️ Set Username in Settings
  </button>
)}
              <button
                onClick={handleLogout}
                className={`w-full text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  isDark 
                    ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50' 
                    : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                }`}
              >
                {Icons.Logout}
                Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 pt-16 md:pt-0 pb-20 md:pb-0 overflow-x-hidden">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}