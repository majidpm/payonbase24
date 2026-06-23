// src/pages/Landing.jsx
import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Zap, ArrowRight, Check, Star, 
  CreditCard, Heart, Plane, Calculator,
  Menu, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function Landing() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: 'PayLink',
      description: 'Create instant payment links. Share once, get paid forever.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Donations',
      description: 'Your personal donation page. Perfect for streamers and creators.',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: <Plane className="w-6 h-6" />,
      title: 'Travel Fund',
      description: 'Crowdfund your trips. Track progress in real-time.',
      color: 'from-purple-500 to-violet-500'
    },
    {
      icon: <Calculator className="w-6 h-6" />,
      title: 'Split Expenses',
      description: 'Auto-calculate who owes what. No more awkward conversations.',
      color: 'from-emerald-500 to-green-500'
    }
  ];

  const stats = [
    { value: '$2.4M+', label: 'Processed' },
    { value: '15K+', label: 'Users' },
    { value: '99.9%', label: 'Uptime' },
    { value: '0%', label: 'Fees' }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Twitch Streamer',
      content: 'PayOnBase24 replaced 3 different tools for me. Donations, splits, everything in one place.',
      avatar: '👩‍💻'
    },
    {
      name: 'Mike Rodriguez',
      role: 'Digital Nomad',
      content: 'The Travel Fund feature is genius. Raised $5K for my Bali trip in 2 weeks.',
      avatar: '🧑‍✈️'
    },
    {
      name: 'Emma Wilson',
      role: 'Freelance Designer',
      content: 'Clients love how easy it is to pay me. No more chasing invoices.',
      avatar: '‍🎨'
    }
  ];

  const faqs = [
    {
      q: 'Is it really free?',
      a: 'Yes! Zero platform fees. You only pay the Base Network gas fee (usually < $0.01).'
    },
    {
      q: 'Do payers need an account?',
      a: 'No! Just connect their wallet and pay. No signup required.'
    },
    {
      q: 'Which networks are supported?',
      a: 'Currently Base Network (USDC). More networks coming soon.'
    },
    {
      q: 'Is it secure?',
      a: '100%. Built on Ethereum L2 with wallet signing and RLS policies.'
    }
  ];

  return (
    <div className={`min-h-screen overflow-x-hidden ${isDark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          style={{ y: backgroundY }}
          className={`absolute inset-0 ${isDark ? 'opacity-30' : 'opacity-20'}`}
        >
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </motion.div>
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled 
            ? isDark ? 'bg-black/80 backdrop-blur-xl border-b border-gray-800' : 'bg-white/80 backdrop-blur-xl border-b border-gray-200'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">PayOnBase24</span>
            </motion.div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium hover:text-blue-500 transition">Features</a>
              <a href="#how-it-works" className="text-sm font-medium hover:text-blue-500 transition">How it Works</a>
              <a href="#pricing" className="text-sm font-medium hover:text-blue-500 transition">Pricing</a>
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                {isDark ? '☀️' : '🌙'}
              </button>
              <button 
                onClick={() => navigate('/auth')}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
              >
                Get Started
              </button>
            </div>

            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`md:hidden border-t ${isDark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'}`}
          >
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block py-2">Features</a>
              <a href="#how-it-works" className="block py-2">How it Works</a>
              <a href="#pricing" className="block py-2">Pricing</a>
              <button 
                onClick={() => navigate('/auth')}
                className="w-full py-2 rounded-lg bg-blue-600 text-white"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-blue-500">Now Live on Base Network</span>
            </motion.div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Crypto Payments
              <br />
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>

            <p className={`text-xl sm:text-2xl mb-12 max-w-3xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Create payment links, receive donations, and split expenses. 
              All on Base Network. Zero fees. Instant settlement.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/auth')}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg shadow-2xl shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                Start Free <ArrowRight className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className={`px-8 py-4 rounded-xl font-semibold text-lg border ${
                  isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                See Features
              </motion.button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl sm:text-4xl font-bold mb-1">{stat.value}</div>
                  <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Four powerful tools. One platform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className={`p-8 rounded-2xl border ${
                  isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={`py-20 px-4 sm:px-6 lg:px-8 ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Three simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create', desc: 'Sign up and create your first payment link in 30 seconds.' },
              { step: '02', title: 'Share', desc: 'Share the link anywhere. No account needed for payers.' },
              { step: '03', title: 'Get Paid', desc: 'Receive USDC instantly. No middlemen, no fees.' }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative"
              >
                <div className={`text-6xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent`}>
  {item.step}
</div>
                <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Loved by Thousands
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`p-6 rounded-2xl border ${
                  isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">{t.avatar}</div>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{t.role}</div>
                  </div>
                </div>
                <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  "{t.content}"
                </p>
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={`py-20 px-4 sm:px-6 lg:px-8 ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Simple Pricing
            </h2>
            <p className={`text-xl mb-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Free forever. No hidden fees.
            </p>

            <div className={`p-8 rounded-2xl border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="text-6xl font-bold mb-2">$0</div>
              <div className={`text-xl mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                forever
              </div>
              <ul className="text-left space-y-3 mb-8 max-w-md mx-auto">
                {['Unlimited payment links', 'Unlimited donations', 'Unlimited travel funds', 'Split expenses', '0% platform fees', 'Base Network only'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/auth')}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg"
              >
                Get Started Free
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              FAQ
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`p-6 rounded-xl border ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}
              >
                <h3 className="text-xl font-semibold mb-2">{faq.q}</h3>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 text-white"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of users already using PayOnBase24
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-4 rounded-xl bg-white text-blue-600 font-semibold text-lg hover:bg-gray-100 transition"
            >
              Create Free Account
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 px-4 sm:px-6 lg:px-8 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">PayOnBase24</span>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Crypto payments made simple.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li><a href="#features" className="hover:text-blue-500">Features</a></li>
                <li><a href="#pricing" className="hover:text-blue-500">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li><a href="#" className="hover:text-blue-500">About</a></li>
                <li><a href="#" className="hover:text-blue-500">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li><a href="#" className="hover:text-blue-500">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-500">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className={`pt-8 border-t text-center text-sm ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-600'}`}>
            © 2024 PayOnBase24. Built on Base Network.
          </div>
        </div>
      </footer>
    </div>
  );
}