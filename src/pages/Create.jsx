import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { handleAppError, showSuccess } from '../lib/errorHandler';
import { checkRateLimit } from '../lib/rateLimiter';
import { celebrateSuccess } from '../lib/celebrations';

export default function Create() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
const [emailStatus, setEmailStatus] = useState('pending');

  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    fixedAmount: false,  // اگه true باشه، فقط همون مبلغ قبول میشه
    wallet_address: '',
    useProfileWallet: true,
    hasExpiry: false,
    expires_days: '7',
    recipient_email: '',
    sendEmail: false
  });

  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile(profileData);
      if (profileData?.wallet_address) {
        setForm({ ...form, wallet_address: profileData.wallet_address });
      }
    } catch (err) {
      handleAppError(err, 'loadProfile');
    } finally {
      setLoading(false);
    }
  }

  function validateForm() {
    const errs = {};
    
    if (!form.title.trim()) errs.title = 'Title is required';
    else if (form.title.length > 100) errs.title = 'Title must be less than 100 characters';

    if (form.fixedAmount && form.amount) {
      const amt = parseFloat(form.amount);
      if (isNaN(amt) || amt <= 0) errs.amount = 'Amount must be greater than 0';
    }

    if (form.wallet_address) {
      const ethRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethRegex.test(form.wallet_address.trim())) {
        errs.wallet_address = 'Invalid Ethereum address';
      }
    }

    if (form.description && form.description.length > 500) {
      errs.description = 'Description must be less than 500 characters';
    }

    if (form.sendEmail && form.recipient_email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recipient_email)) {
        errs.recipient_email = 'Invalid email address';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function createLink() {
    if (!validateForm()) return;

    const rateLimit = await checkRateLimit('create-payment');
    if (!rateLimit.allowed) {
      handleAppError({ message: rateLimit.error }, 'createLink');
      return;
    }

    setCreating(true);
    try {
      const slug = Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
      
      let expiresAt = null;
      if (form.hasExpiry) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + parseInt(form.expires_days));
        expiresAt = expiry.toISOString();
      }

      const finalWallet = form.useProfileWallet 
        ? profile?.wallet_address 
        : form.wallet_address.trim();

      if (!finalWallet) {
        handleAppError({ 
          message: 'Please add a wallet address in Settings or enter one below' 
        }, 'createLink');
        setCreating(false);
        return;
      }

      const { data, error } = await supabase
        .from('payment')
        .insert({
          user_id: userId,
          slug,
          title: form.title.trim(),
          description: form.description.trim() || null,
          amount: form.fixedAmount && form.amount ? parseFloat(form.amount) : null,
          wallet_address: finalWallet,
          expires_at: expiresAt,
          recipient_email: form.sendEmail ? form.recipient_email.trim() : null,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      const linkUrl = `${window.location.origin}/pay/${slug}`;
      setCreatedLink({ ...data, url: linkUrl });
      
      showSuccess(`Payment link created! ${rateLimit.remaining} remaining this hour`);
      celebrateSuccess();

// اگه ارسال ایمیل فعال بود
if (form.sendEmail && form.recipient_email.trim()) {
  // اول لینک رو بدون email status نشون بده
  setCreatedLink({ ...data, url: linkUrl });
  setEmailStatus('pending');
  
  const updatedLink = await sendPaymentEmail(data, linkUrl);
  
  if (updatedLink) {
    setEmailStatus('sent');
    showSuccess('Link created and email sent! 📧');
  } else {
    setEmailStatus('failed');
    showSuccess('Link created! Email failed - you can copy and send manually.');
  }
} else {
  setCreatedLink({ ...data, url: linkUrl });
  setEmailStatus('sent'); // یا 'none' اگه ایمیل درخواست نشده
  showSuccess(`Payment link created! ${rateLimit.remaining} remaining this hour`);
}
    } catch (err) {
      handleAppError(err, 'createLink');
    } finally {
      setCreating(false);
    }
  }

async function sendPaymentEmail(link, linkUrl) {
  setSendingEmail(true);
  try {
    const { data, error } = await supabase.functions.invoke('send-payment-email', {
      body: {
        to: link.recipient_email,
        linkUrl: linkUrl,
        title: link.title,
        amount: link.amount,
        description: link.description,
        senderName: profile?.display_name || profile?.username || 'Someone',
        expiresAt: link.expires_at
      }
    });

    if (error) {
      console.error('Email function error:', error);
      throw error;
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Email sending failed');
    }

    // ثبت زمان ارسال ایمیل در database
    const { data: updatedLink, error: updateError } = await supabase
      .from('payment')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', link.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
    }

    // ✅ برگرداندن لینک آپدیت شده
    return updatedLink || { ...link, email_sent_at: new Date().toISOString() };
  } catch (err) {
    console.error('Email send failed:', err);
    return null;
  } finally {
    setSendingEmail(false);
  }
}

  function copyLink() {
    if (createdLink) {
      navigator.clipboard.writeText(createdLink.url);
      showSuccess('Link copied!');
    }
  }

  function resetForm() {
    setForm({
      title: '',
      description: '',
      amount: '',
      fixedAmount: false,
      wallet_address: profile?.wallet_address || '',
      useProfileWallet: true,
      hasExpiry: false,
      expires_days: '7',
      recipient_email: '',
      sendEmail: false
    });
    setCreatedLink(null);
    setEmailStatus('pending');  // ← اضافه کن
    setErrors({});
  }

  const inputClass = (hasError) => `w-full px-4 py-3 rounded-xl border focus:outline-none text-sm transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-600 ring-2 ring-red-500/20'
      : isDark
        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
  }`;

  const toggleClass = (active) => `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
    active 
      ? 'bg-blue-600' 
      : isDark ? 'bg-gray-700' : 'bg-gray-300'
  }`;

  const errorText = (msg) => msg ? (
    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
      <span>⚠️</span> {msg}
    </p>
  ) : null;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className={`text-2xl sm:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              💳 Create Smart Payment Link
            </h1>
            <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Create a flexible payment link with optional amount, expiry, and email delivery
            </p>
          </div>

          {createdLink ? (
            /* ==================== Success View ==================== */
            <div className={`rounded-2xl p-6 sm:p-8 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Link Created!
                </h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Share this link to receive payment
                </p>
              </div>

              {/* Link Box */}
              <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>💳 Payment Link</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdLink.url}
                    className={`flex-1 px-3 py-2 rounded-lg font-mono text-xs sm:text-sm ${
                      isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  />
                  <button
                    onClick={copyLink}
                    className="px-4 py-2 rounded-lg font-medium text-sm bg-blue-600 text-white hover:bg-blue-700"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* Link Info */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Title</p>
                  <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {createdLink.title}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amount</p>
                  <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {createdLink.amount ? `$${parseFloat(createdLink.amount).toFixed(2)}` : 'Any amount'}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                  <p className={`font-semibold text-sm text-green-500`}>✅ Active</p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Expires</p>
                  <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {createdLink.expires_at 
                      ? new Date(createdLink.expires_at).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>

{createdLink.recipient_email && (
  <div className={`p-4 rounded-xl mb-6 transition-all duration-300 ${
    emailStatus === 'sent'
      ? isDark ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
      : emailStatus === 'failed'
      ? isDark ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'
      : isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
  }`}>
    {emailStatus === 'sent' ? (
      <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
        ✅ Email sent to: {createdLink.recipient_email}
      </p>
    ) : emailStatus === 'failed' ? (
      <div>
        <p className={`text-sm font-medium mb-2 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
          ⚠️ Email not sent - you can copy the link and send manually
        </p>
        <button
          onClick={() => {
            window.location.href = `mailto:${createdLink.recipient_email}?subject=Payment Request: ${createdLink.title}&body=Hi, please pay using this link: ${createdLink.url}`;
          }}
          className={`px-4 py-2 rounded-lg text-xs font-medium ${
            isDark ? 'bg-yellow-800 text-yellow-200 hover:bg-yellow-700' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          }`}
        >
          📧 Open Email Client
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
        <p className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
          Sending email to: {createdLink.recipient_email}...
        </p>
      </div>
    )}
  </div>
)}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resetForm}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all"
                >
                  + Create Another
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`px-6 py-3 rounded-xl font-medium ${
                    isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  View Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* ==================== Form View ==================== */
            <div className={`rounded-2xl p-6 sm:p-8 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
              <div className="space-y-5">
                
                {/* Title */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Payment for design work"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className={inputClass(!!errors.title)}
                  />
                  {errorText(errors.title)}
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="Add details about this payment..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className={`${inputClass(!!errors.description)} resize-none`}
                  />
                  <div className="flex justify-between mt-1">
                    {errorText(errors.description)}
                    <p className={`text-xs ml-auto ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {form.description.length}/500
                    </p>
                  </div>
                </div>

                {/* Amount */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      💰 Fixed Amount
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, fixedAmount: !form.fixedAmount, amount: '' })}
                      className={toggleClass(form.fixedAmount)}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.fixedAmount ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  {form.fixedAmount ? (
                    <>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={form.amount}
                          onChange={(e) => setForm({ ...form, amount: e.target.value })}
                          className={`${inputClass(!!errors.amount)} pl-8`}
                        />
                      </div>
                      {errorText(errors.amount)}
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Payer can only pay exactly this amount
                      </p>
                    </>
                  ) : (
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Payer can choose any amount to pay
                    </p>
                  )}
                </div>

                {/* Wallet Address */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      💼 Receiving Wallet
                    </label>
                    {profile?.wallet_address && (
                      <button
                        type="button"
                        onClick={() => setForm({ 
                          ...form, 
                          useProfileWallet: !form.useProfileWallet,
                          wallet_address: !form.useProfileWallet ? profile.wallet_address : ''
                        })}
                        className={toggleClass(form.useProfileWallet)}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.useProfileWallet ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    )}
                  </div>

                  {form.useProfileWallet && profile?.wallet_address ? (
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Using wallet from Settings
                      </p>
                      <p className={`font-mono text-xs break-all ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {profile.wallet_address}
                      </p>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={form.wallet_address}
                        onChange={(e) => setForm({ ...form, wallet_address: e.target.value })}
                        className={`${inputClass(!!errors.wallet_address)} font-mono text-xs`}
                      />
                      {errorText(errors.wallet_address)}
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Enter a different wallet address for this link
                      </p>
                    </>
                  )}
                </div>

                {/* Expiry */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-purple-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      ⏰ Set Expiry Date
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, hasExpiry: !form.hasExpiry })}
                      className={toggleClass(form.hasExpiry)}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.hasExpiry ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {form.hasExpiry ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { days: '1', label: '1 Day' },
                        { days: '3', label: '3 Days' },
                        { days: '7', label: '7 Days' },
                        { days: '14', label: '14 Days' },
                        { days: '30', label: '30 Days' }
                      ].map((option) => (
                        <button
                          key={option.days}
                          type="button"
                          onClick={() => setForm({ ...form, expires_days: option.days })}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                            form.expires_days === option.days
                              ? 'bg-blue-600 text-white'
                              : isDark 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Link will never expire
                    </p>
                  )}
                </div>

                {/* Email Sending */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-pink-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      📧 Send via Email
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, sendEmail: !form.sendEmail, recipient_email: '' })}
                      className={toggleClass(form.sendEmail)}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.sendEmail ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {form.sendEmail ? (
                    <>
                      <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={form.recipient_email}
                        onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                        className={inputClass(!!errors.recipient_email)}
                      />
                      {errorText(errors.recipient_email)}
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        We'll send a professional payment request email to this address
                      </p>
                    </>
                  ) : (
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      You'll get a link to share manually
                    </p>
                  )}
                </div>

                {/* Create Button */}
                <button
                  onClick={createLink}
                  disabled={creating}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-xl font-semibold text-base transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                >
                  {creating ? '⏳ Creating...' : '✨ Create Payment Link'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}