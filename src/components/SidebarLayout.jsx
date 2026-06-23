import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

export default function SidebarLayout({ children }) {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paylinkExpanded, setPaylinkExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (profileData) {
      setProfile(profileData);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-950 text-white' : 'bg-blue-50 text-gray-900'
      }`}>
        Loading...
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${
      isDark ? 'bg-gray-950' : 'bg-blue-50'
    }`}>
      {/* Mobile Header */}
      <div className={`md:hidden fixed top-0 left-0 right-0 z-40 border-b px-4 py-3 flex justify-between items-center ${
        isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'
      }`}>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`p-2 rounded-xl ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
            isDark ? 'bg-blue-500' : 'bg-blue-600'
          }`}>
            P
          </div>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            PayOnBase24
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
        >
          {isDark ? '☀️' : ''}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile (Drawer) */}
      <aside className={`md:hidden fixed top-0 left-0 h-full z-50 transition-transform duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isDark ? 'bg-gray-900' : 'bg-white'} w-72 border-r ${
        isDark ? 'border-gray-800' : 'border-blue-100'
      }`}>
        <div className={`p-6 border-b ${isDark ? 'border-gray-800' : 'border-blue-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
              isDark ? 'bg-blue-500' : 'bg-blue-600'
            }`}>
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

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* PayLink */}
          <div>
            <button
              onClick={() => setPaylinkExpanded(!paylinkExpanded)}
              className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between ${
                isActive('/') || isActive('/dashboard')
                  ? isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'
                  : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <div className="text-left">
                  <p className="font-semibold">PayLink</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Create & manage links
                  </p>
                </div>
              </div>
              <span className={`text-xs transition-transform duration-300 ${paylinkExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {paylinkExpanded && (
              <div className={`ml-6 mt-2 space-y-1 pl-4 border-l-2 ${isDark ? 'border-gray-700' : 'border-blue-200'}`}>
                <button
                  onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${
                    location.pathname === '/'
                      ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                      : isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-blue-50'
                  }`}
                >
                  + Create New Link
                </button>
                <button
                  onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${
                    location.pathname === '/dashboard'
                      ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                      : isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-blue-50'
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
            className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center gap-3 ${
              isActive('/donation')
                ? isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'
                : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">💝</span>
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
            className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center gap-3 ${
              isActive('/travel')
                ? isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'
                : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">✈️</span>
            <div>
              <p className="font-semibold">TravelFund</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Split expenses
              </p>
            </div>
          </button>
        </nav>

        <div className={`p-4 border-t space-y-2 ${isDark ? 'border-gray-800' : 'border-blue-100'}`}>
          <button
            onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-2xl transition-colors flex items-center gap-3 ${
              isActive('/settings')
                ? isDark ? 'bg-gray-800 text-white' : 'bg-blue-50 text-gray-900'
                : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">⚙️</span>
            <span className="font-semibold">Settings</span>
          </button>

          <button
            onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-2xl transition-colors flex items-center gap-3 ${
              isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">{isDark ? '☀️' : ''}</span>
            <span className="font-semibold">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                isDark ? 'bg-blue-500' : 'bg-blue-600'
              }`}>
                {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {profile?.display_name || user?.email?.split('@')[0]}
                </p>
                <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.email}
                </p>
              </div>
            </div>
            {profile?.username && (
              <button
                onClick={() => { navigate(`/u/${profile.username}`); setMobileMenuOpen(false); }}
                className={`w-full text-xs py-2 rounded-xl transition-colors ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                View Public Profile →
              </button>
            )}
            <button
              onClick={handleLogout}
              className={`w-full mt-2 text-xs py-2 rounded-xl transition-colors ${
                isDark ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'
              }`}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar - Desktop (Fixed, Always Expanded) */}
      <aside className={`hidden md:flex fixed h-full border-r flex-col w-72 ${
        isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'
      }`}>
        <div className={`p-6 border-b ${isDark ? 'border-gray-800' : 'border-blue-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
              isDark ? 'bg-blue-500' : 'bg-blue-600'
            }`}>
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

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* PayLink */}
          <div>
            <button
              onClick={() => setPaylinkExpanded(!paylinkExpanded)}
              className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between ${
                isActive('/') || isActive('/dashboard')
                  ? isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'
                  : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <div className="text-left">
                  <p className="font-semibold">PayLink</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Create & manage links
                  </p>
                </div>
              </div>
              <span className={`text-xs transition-transform duration-300 ${paylinkExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {paylinkExpanded && (
              <div className={`ml-6 mt-2 space-y-1 pl-4 border-l-2 ${isDark ? 'border-gray-700' : 'border-blue-200'}`}>
                <button
                  onClick={() => navigate('/')}
                  className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${
                    location.pathname === '/'
                      ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                      : isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-blue-50'
                  }`}
                >
                  + Create New Link
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${
                    location.pathname === '/dashboard'
                      ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                      : isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-blue-50'
                  }`}
                >
                  📊 Dashboard
                </button>
              </div>
            )}
          </div>

          {/* Donation */}
          <button
            onClick={() => navigate('/donation')}
            className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center gap-3 ${
              isActive('/donation')
                ? isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'
                : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">💝</span>
            <div>
              <p className="font-semibold">Donation</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Receive donations
              </p>
            </div>
          </button>

          {/* TravelFund */}
          <button
            onClick={() => navigate('/travel')}
            className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center gap-3 ${
              isActive('/travel')
                ? isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'
                : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">✈️</span>
            <div>
              <p className="font-semibold">TravelFund</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Split expenses
              </p>
            </div>
          </button>
        </nav>

        <div className={`p-4 border-t space-y-2 ${isDark ? 'border-gray-800' : 'border-blue-100'}`}>
          <button
            onClick={() => navigate('/settings')}
            className={`w-full text-left px-4 py-3 rounded-2xl transition-colors flex items-center gap-3 ${
              isActive('/settings')
                ? isDark ? 'bg-gray-800 text-white' : 'bg-blue-50 text-gray-900'
                : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">⚙️</span>
            <span className="font-semibold">Settings</span>
          </button>

          <button
            onClick={toggleTheme}
            className={`w-full text-left px-4 py-3 rounded-2xl transition-colors flex items-center gap-3 ${
              isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">{isDark ? '☀️' : ''}</span>
            <span className="font-semibold">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                isDark ? 'bg-blue-500' : 'bg-blue-600'
              }`}>
                {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {profile?.display_name || user?.email?.split('@')[0]}
                </p>
                <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.email}
                </p>
              </div>
            </div>
            {profile?.username && (
              <button
                onClick={() => navigate(`/u/${profile.username}`)}
                className={`w-full text-xs py-2 rounded-xl transition-colors ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                View Public Profile →
              </button>
            )}
            <button
              onClick={handleLogout}
              className={`w-full mt-2 text-xs py-2 rounded-xl transition-colors ${
                isDark ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'
              }`}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}