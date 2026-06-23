import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function Landing() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                P
              </div>
              <span className="text-xl font-bold text-gray-900">PayOnBase24</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-700 hover:text-gray-900 font-medium transition">Features</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-gray-900 font-medium transition">How it works</a>
              <a href="#pricing" className="text-gray-700 hover:text-gray-900 font-medium transition">Pricing</a>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="text-gray-700 hover:text-gray-900 font-medium transition"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-medium transition-all hover:scale-105"
              >
                Get started →
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => navigate('/auth')}
              className="md:hidden bg-gray-900 text-white px-4 py-2 rounded-lg font-medium"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-blue-50 to-orange-50 opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-orange-600/20 blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold text-gray-900 leading-tight mb-8">
              Payments infrastructure{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                for the internet
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-3xl leading-relaxed">
              Create instant payment links, receive donations, and split expenses with USDC on Base Network. 
              No signup required for payers.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                Start now →
              </button>
              <button
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 px-8 py-4 rounded-lg text-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                Contact sales →
              </button>
            </div>

            <div className="mt-12 flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Free forever
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Setup in 2 minutes
              </div>
            </div>
          </div>
        </div>

        {/* Product Preview */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50" />
            <div className="relative p-8 sm:p-12">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Payment Link */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                      P
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">PayOnBase24</h3>
                      <p className="text-sm text-gray-500">USDC • Base Network</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Payment Link</p>
                    <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
                      <code className="text-sm text-gray-900 flex-1 truncate">
                        payonbase24.com/pay/abc123
                      </code>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-4">Amount to Pay</p>
                    <p className="text-4xl font-bold text-gray-900 mb-4">10 <span className="text-2xl">USDC</span></p>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition">
                      Pay Now
                    </button>
                  </div>
                </div>

                {/* Right: Dashboard Preview */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4">Dashboard</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-white rounded-lg p-4 border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Payment #1</p>
                          <p className="text-sm text-gray-500">/pay/abc123</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
                          Paid
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white rounded-lg p-4 border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Payment #2</p>
                          <p className="text-sm text-gray-500">/pay/def456</p>
                        </div>
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-1 rounded-full">
                          Pending
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Total Received</p>
                      <p className="text-2xl font-bold text-gray-900">$1,234</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Active Links</p>
                      <p className="text-2xl font-bold text-gray-900">12</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features to help you manage payments, donations, and expenses
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl mb-4">
                💳
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">PayLink</h3>
              <p className="text-gray-600">Create instant payment links with QR codes. Share and receive USDC in seconds.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl mb-4">
                💝
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Donations</h3>
              <p className="text-gray-600">Get your personal donation page at /u/yourname. Receive tips from your community.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl mb-4">
                ✈️
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Travel Fund</h3>
              <p className="text-gray-600">Crowdfund your trips with friends. Track progress and collect contributions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold mb-2">0%</div>
              <div className="text-gray-400">Platform Fees</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold mb-2">&lt;5s</div>
              <div className="text-gray-400">Transaction Time</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold mb-2">24/7</div>
              <div className="text-gray-400">Available</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold mb-2">100%</div>
              <div className="text-gray-400">Secure</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Create your first payment link in less than a minute.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="bg-white hover:bg-gray-50 text-gray-900 px-10 py-5 rounded-lg text-lg font-bold transition-all hover:scale-105 shadow-xl"
          >
            Get started now →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                P
              </div>
              <span className="font-bold text-gray-900">PayOnBase24</span>
            </div>
            <p className="text-gray-600 text-sm">
              © 2024 PayOnBase24. Built on Base Network.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}