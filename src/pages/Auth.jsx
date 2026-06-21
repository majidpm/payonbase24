import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function AuthPage() {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for confirmation link!');
        setIsLogin(true);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
      isDark ? 'bg-gray-950' : 'bg-blue-50'
    }`}>
      <div className={`max-w-md w-full rounded-3xl shadow-xl p-8 transition-colors duration-300 ${
        isDark ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-bold transition-colors duration-300 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            PayOnBase24
          </h1>
          <p className={`mt-2 transition-colors duration-300 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {isLogin ? 'Sign in to continue' : 'Create a new account'}
          </p>
        </div>

        {/* دکمه Google */}
        <button
          onClick={signInWithGoogle}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        {/* خط جداکننده */}
        <div className="relative my-6">
          <div className={`absolute inset-0 flex items-center ${
            isDark ? 'border-gray-700' : 'border-gray-300'
          }`}>
            <div className={`w-full border-t ${
              isDark ? 'border-gray-700' : 'border-gray-300'
            }`}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={`px-4 ${
              isDark ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'
            }`}>
              or continue with email
            </span>
          </div>
        </div>

        {/* فرم ایمیل و رمز عبور */}
        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-5 py-4 border rounded-2xl focus:outline-none text-lg transition-colors duration-300 ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-5 py-4 border rounded-2xl focus:outline-none text-lg transition-colors duration-300 ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
              }`}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-semibold py-4 rounded-2xl text-lg transition-all duration-300 ${
              isDark
                ? 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white'
            }`}
          >
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className={`w-full mt-4 transition-colors duration-300 ${
            isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:underline'
          }`}
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </button>
      </div>
    </div>
  );
}