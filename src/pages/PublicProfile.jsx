import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../hooks/useWallet';
import { useUSDCBalance } from '../hooks/useUSDCBalance';
import { useSendUSDC } from '../hooks/useSendUSDC';
import { usePrivy } from '@privy-io/react-auth';
import { useAutoProfile } from '../hooks/useAutoProfile';
import { handleAppError, showSuccess } from '../lib/errorHandler';
import { verifyTransaction } from '../lib/verifyTransaction';
import { celebrateDonation } from '../lib/celebrations';
import ImageCropper from '../components/ImageCropper';

export default function PublicProfile() {
  const { isDark } = useTheme();
  const { username } = useParams();
  const navigate = useNavigate();
  
  const { address, isConnected, isConnecting, connectWallet, ensureBaseNetwork, isOnBase } = useWallet();
  const { balance, isLoading: balanceLoading } = useUSDCBalance(address);
  const { sendUSDC, txHash, isPending, isConfirming, isSuccess, isError, error, reset: resetSendUSDC } = useSendUSDC();
  const { user: privyUser, authenticated } = usePrivy();
  const { profile: myProfile } = useAutoProfile();

  const [profile, setProfile] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [donorName, setDonorName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [localTxHash, setLocalTxHash] = useState(null);
  const [localStatus, setLocalStatus] = useState('idle'); // idle, pending, confirming, success, error
  
  const [cropperImage, setCropperImage] = useState(null);
  const [cropperAspect, setCropperAspect] = useState(1);
  const [cropperType, setCropperType] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (username) {
      loadProfile();
    }
  }, [username]);

  useEffect(() => {
    function handleProfileUpdate(event) {
      const updatedProfile = event.detail;
      if (updatedProfile && updatedProfile.username === username) {
        setProfile(updatedProfile);
      }
    }

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [username]);

  useEffect(() => {
    if (profile && authenticated && privyUser) {
      let ownerFound = false;
      
      if (myProfile && myProfile.id === profile.id) {
        ownerFound = true;
      }
      
      if (!ownerFound && privyUser.id && profile.privy_id) {
        if (privyUser.id === profile.privy_id) {
          ownerFound = true;
        }
      }
      
      if (!ownerFound && privyUser.email?.address && profile.email) {
        if (privyUser.email.address === profile.email) {
          ownerFound = true;
        }
      }
      
      if (!ownerFound && profile.wallet_address) {
        const walletAddress = profile.wallet_address.toLowerCase();
        
        if (privyUser.linkedAccounts) {
          for (const account of privyUser.linkedAccounts) {
            if (account.type === 'wallet' && account.address?.toLowerCase() === walletAddress) {
              ownerFound = true;
              break;
            }
          }
        }
      }
      
      setIsOwner(ownerFound);
    } else {
      setIsOwner(false);
    }
  }, [profile, privyUser, authenticated, myProfile]);

  // ✅ مدیریت وضعیت‌های wagmi
  useEffect(() => {
    if (isSuccess && txHash && localStatus !== 'success') {
      setLocalTxHash(txHash);
      setLocalStatus('success');
      handleDonationSuccess(txHash);
    }
  }, [isSuccess, txHash]);

  // ✅ فیکس مشکل ریجکت - وقتی ارور رخ میده
  useEffect(() => {
    if (isError && error) {
      console.error('❌ Transaction error:', error);
      
      // ✅ ریست کردن وضعیت
      setLocalStatus('idle');
      setLocalTxHash(null);
      
      // ✅ ریست کردن wagmi hook
      if (resetSendUSDC) {
        resetSendUSDC();
      }
      
      // ✅ نمایش ارور مناسب
      const errorMessage = error.message || error.shortMessage || 'Transaction failed';
      
      if (errorMessage.includes('rejected') || errorMessage.includes('denied') || errorMessage.includes('user rejected')) {
        handleAppError({ message: 'Transaction rejected by user' }, 'sendDonation');
      } else {
        handleAppError(error, 'sendDonation');
      }
    }
  }, [isError, error]);

  // ✅ ریست کردن وضعیت وقتی کاربر مقدار رو تغییر میده
  useEffect(() => {
    if (localStatus === 'error') {
      setLocalStatus('idle');
      setLocalTxHash(null);
    }
  }, [amount, customAmount]);

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

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', reject);
      img.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);
    ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5);

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const handleCropDone = useCallback(async (croppedDataUrl) => {
    if (!cropperType) return;

    const isAvatar = cropperType === 'avatar';
    const setUploading = isAvatar ? setUploadingAvatar : setUploadingCover;
    const folder = isAvatar ? 'avatars' : 'covers';

    setUploading(true);
    try {
      const response = await fetch(croppedDataUrl);
      const blob = await response.blob();
      
      const file = new File([blob], `${cropperType}-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      if (file.size > 4 * 1024 * 1024) {
        handleAppError({ message: 'Image must be less than 4MB' }, 'imageUpload');
        setUploading(false);
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const updateField = isAvatar ? 'avatar_url' : 'cover_url';
      const { error } = await supabase
        .from('profiles')
        .update({ [updateField]: publicUrl })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, [updateField]: publicUrl });
      showSuccess(`${isAvatar ? 'Avatar' : 'Cover'} updated! 🎨`);
      
      setCropperImage(null);
      setCropperType(null);
    } catch (err) {
      console.error('Upload error:', err);
      handleAppError(err, 'imageUpload');
    } finally {
      setUploading(false);
    }
  }, [cropperType, profile]);

  async function handleAvatarChange(e) {
    if (!isOwner || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    if (file.size > 4 * 1024 * 1024) {
      handleAppError({ message: 'Image must be less than 4MB' }, 'avatarUpload');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImage(reader.result);
      setCropperAspect(1);
      setCropperType('avatar');
    };
    reader.readAsDataURL(file);
    
    e.target.value = '';
  }

  async function handleCoverChange(e) {
    if (!isOwner || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    if (file.size > 4 * 1024 * 1024) {
      handleAppError({ message: 'Image must be less than 4MB' }, 'coverUpload');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImage(reader.result);
      setCropperAspect(3);
      setCropperType('cover');
    };
    reader.readAsDataURL(file);
    
    e.target.value = '';
  }

async function handleDonationSuccess(hash) {
  try {
    const donationAmount = parseFloat(amount || customAmount);

    console.log('🔍 Verifying transaction:', { 
      hash, 
      amount: donationAmount, 
      wallet: profile.wallet_address 
    });

    const verification = await verifyTransaction(
      hash,
      profile.wallet_address,
      donationAmount
    );

    console.log('✅ Verification result:', verification);

    if (!verification.valid) {
      throw new Error(`Verification failed: ${verification.reason}`);
    }

    // ✅ آماده‌سازی داده‌ها با چک کردن ستون‌های موجود
    const donationData = {
      profile_id: profile.id,
      donor_address: verification.from || address,
      amount: verification.amount || donationAmount,
      tx_hash: hash,
      verified: true,
      created_at: new Date().toISOString()
    };

    // ✅ اضافه کردن فیلدهای اختیاری فقط اگه مقدار دارن
    if (donorName && donorName.trim()) {
      donationData.donor_name = donorName.trim();
    }
    
    if (message && message.trim()) {
      donationData.message = message.trim();
    }

    console.log('💾 Saving donation data:', donationData);

    // ✅ ذخیره در دیتابیس
    const { data, error } = await supabase
      .from('donations')
      .insert(donationData)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to save donation:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('✅ Donation saved successfully:', data);

    showSuccess('Thank you for your donation! 🎉');
    celebrateDonation();

    // ✅ ریست کردن فرم
    setAmount('');
    setCustomAmount('');
    setMessage('');
    setDonorName('');

    // ✅ ریست کردن wagmi hook
    if (resetSendUSDC) {
      resetSendUSDC();
    }

    // ✅ لود مجدد donations
    await loadDonations(profile.id);
    
  } catch (err) {
    console.error('❌ Error recording donation:', err);
    
    // ✅ نمایش ارور دقیق‌تر
    if (err.message?.includes('donor_name')) {
      handleAppError({ 
        message: 'Database missing column. Please run SQL migration.' 
      }, 'recordDonation');
    } else {
      handleAppError(err, 'recordDonation');
    }
    
    // ✅ ریست کردن وضعیت
    setLocalStatus('idle');
    setLocalTxHash(null);
    
    if (resetSendUSDC) {
      resetSendUSDC();
    }
  }
}

  async function handleSendDonation() {
    if (!profile?.wallet_address) {
      handleAppError({ message: 'This profile has not set up their wallet yet' }, 'sendDonation');
      return;
    }

    if (!amount && !customAmount) {
      handleAppError({ message: 'Please select or enter an amount' }, 'sendDonation');
      return;
    }

    const switched = await ensureBaseNetwork();
    if (!switched) {
      handleAppError({ message: 'Please switch to Base Network' }, 'sendDonation');
      return;
    }

    const donationAmount = parseFloat(amount || customAmount);
    
    if (balance < donationAmount) {
      handleAppError({
        message: `Insufficient USDC. You have ${balance.toFixed(2)}, need ${donationAmount.toFixed(2)}`
      }, 'sendDonation');
      return;
    }

    try {
      setLocalStatus('pending');
      await sendUSDC(profile.wallet_address, donationAmount);
      // ✅ بعد از sendUSDC، وضعیت توسط useEffect های بالا مدیریت میشه
    } catch (err) {
      console.error('❌ Send donation error:', err);
      setLocalStatus('idle');
      
      if (resetSendUSDC) {
        resetSendUSDC();
      }
      
      handleAppError(err, 'sendDonation');
    }
  }

  function handleDonateAgain() {
    setLocalTxHash(null);
    setLocalStatus('idle');
    setAmount('');
    setCustomAmount('');
    setMessage('');
    setDonorName('');
    
    if (resetSendUSDC) {
      resetSendUSDC();
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

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
    twitter: { icon: '🐦', label: 'Twitter' },
    instagram: { icon: '📸', label: 'Instagram' },
    github: { icon: '💻', label: 'GitHub' },
    telegram: { icon: '✈️', label: 'Telegram' },
    youtube: { icon: '📺', label: 'YouTube' },
    discord: { icon: '🎮', label: 'Discord' },
    website: { icon: '🌍', label: 'Website' }
  };

  const socials = ['twitter', 'instagram', 'github', 'telegram', 'youtube', 'discord', 'website']
    .filter(key => profile?.[key] && profile[key].trim() !== '');

  const topDonors = (() => {
  const donorData = {};
  
  donations.forEach(d => {
    const key = d.donor_address;
    
    if (!donorData[key]) {
      donorData[key] = {
        address: d.donor_address,
        name: d.donor_name || null, // ✅ ذخیره نام
        total: 0
      };
    }
    
    donorData[key].total += parseFloat(d.amount);
  });
  
  return Object.values(donorData)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((donor, idx) => ({ ...donor, rank: idx + 1 }));
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

  const donationAmount = parseFloat(amount || customAmount || 0);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-blue-600/10' : 'bg-blue-400/20'}`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-purple-600/10' : 'bg-purple-400/20'}`} />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20 relative z-10">
        {isOwner && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isDark ? 'bg-gray-900 text-gray-300 hover:bg-gray-800' : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/dashboard')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isDark ? 'bg-gray-900 text-gray-300 hover:bg-gray-800' : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/create')}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                + Create Link
              </button>
            </div>
          </div>
        )}

        <div className={`rounded-3xl shadow-2xl overflow-hidden border mb-6 ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
          <div className={`h-40 sm:h-56 relative overflow-hidden ${
            profile?.cover_url 
              ? '' 
              : isDark 
                ? 'bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900' 
                : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
          }`}>
            {profile?.cover_url ? (
              <img 
                src={profile.cover_url} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-8 left-8 w-24 h-24 bg-white rounded-full blur-3xl" />
                <div className="absolute bottom-8 right-8 w-32 h-32 bg-yellow-300 rounded-full blur-3xl" />
              </div>
            )}
            
            {isOwner && (
              <label className={`absolute top-3 right-3 px-3 py-1.5 rounded-xl font-medium text-xs transition-all hover:scale-105 cursor-pointer ${
                isDark ? 'bg-black/50 backdrop-blur-md text-white hover:bg-black/70' : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30'
              }`}>
                {uploadingCover ? '⏳ Uploading...' : '📷 Edit Cover'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  disabled={uploadingCover}
                  className="hidden"
                />
              </label>
            )}
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopiedLink(true);
                showSuccess('Link copied!');
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className={`absolute top-3 left-3 px-3 py-1.5 rounded-xl font-medium text-xs transition-all hover:scale-105 ${
                copiedLink ? 'bg-green-500 text-white' : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30'
              }`}
            >
              {copiedLink ? '✅ Copied!' : '📋 Copy Link'}
            </button>
          </div>

          <div className="px-6 pb-6 -mt-12 relative">
            <div className="flex items-end gap-4 mb-4">
              <div className="relative">
                <div className={`w-28 h-28 rounded-2xl flex items-center justify-center text-5xl font-bold text-white shadow-2xl border-4 overflow-hidden ${
                  isDark ? 'border-gray-900' : 'border-white'
                }`}>
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      {profile.display_name ? profile.display_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                
                {isOwner && (
                  <label className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm cursor-pointer transition-all hover:scale-110 shadow-lg ${
                    isDark ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-blue-600 hover:bg-blue-50 border-2 border-blue-600'
                  }`}>
                    {uploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      '📷'
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {profile.display_name || profile.username}
                  </h1>
                  <span className="text-2xl">✅</span>
                </div>
                <p className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  @{profile.username}
                </p>
              </div>
            </div>

            {profile.bio && (
              <p className={`text-sm sm:text-base leading-relaxed mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {profile.bio}
              </p>
            )}

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
                        isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
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

        {localStatus === 'success' && localTxHash && (
          <div className={`rounded-3xl shadow-2xl p-6 border mb-6 ${isDark ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200'}`}>
            <div className="text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                Donation Successful!
              </h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                Thank you for your support!
              </p>
              <div className={`p-3 rounded-xl mb-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Transaction Hash</p>
                <p className={`font-mono text-xs break-all ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {localTxHash}
                </p>
              </div>
              <button
                onClick={handleDonateAgain}
                className="px-6 py-2 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-105 transition-all"
              >
                💝 Donate Again
              </button>
            </div>
          </div>
        )}

        {localStatus !== 'success' && (
          <div className={`rounded-3xl shadow-2xl p-6 border mb-6 ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
            <div className="text-center mb-5">
              <h2 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                💝 Support {profile.display_name || profile.username}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {['1', '5', '10', '25'].map((val) => (
                  <button
                    key={val}
                    onClick={() => { setAmount(val); setCustomAmount(''); }}
                    disabled={localStatus !== 'idle'}
                    className={`py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50 ${
                      amount === val
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {val} USDC
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setAmount(''); }}
                    disabled={localStatus !== 'idle'}
                    className={`w-full pl-8 pr-3 py-3 border rounded-xl focus:outline-none text-sm ${
                      isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                    }`}
                  />
                </div>
                
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  disabled={localStatus !== 'idle'}
                  className={`w-full px-3 py-3 border rounded-xl focus:outline-none text-sm ${
                    isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                  }`}
                />
                
                <input
                  type="text"
                  placeholder="Message (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={localStatus !== 'idle'}
                  className={`w-full px-3 py-3 border rounded-xl focus:outline-none text-sm ${
                    isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                  }`}
                />
              </div>

              {isConnected && (
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Your Balance</span>
                    {balanceLoading ? (
                      <div className={`h-4 w-16 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    ) : (
                      <span className={`text-sm font-bold ${donationAmount <= balance ? 'text-green-500' : 'text-red-500'}`}>
                        {balance.toFixed(2)} USDC
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isConnected && !isOnBase && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-600 p-3 rounded-xl text-xs">
                  ⚠️ Please switch to Base Network to continue
                </div>
              )}

              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="w-full py-3 rounded-xl font-semibold transition-all hover:scale-105 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg disabled:opacity-50"
                >
                  {isConnecting ? '⏳ Connecting...' : '🦊 Connect Wallet'}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className={`flex items-center justify-between px-4 py-2 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <p className={`font-mono text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {formatAddress(address)}
                    </p>
                    <span className="text-green-500 text-xs">✅ Connected</span>
                  </div>
                  <button
                    onClick={handleSendDonation}
                    disabled={localStatus !== 'idle' || (!amount && !customAmount) || !isOnBase}
                    className={`w-full py-3 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 text-white shadow-lg ${
                      localStatus === 'pending' ? 'bg-yellow-500' : localStatus === 'confirming' ? 'bg-blue-500' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                    }`}
                  >
                    {localStatus === 'pending' && (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Confirm in Wallet
                      </span>
                    )}
                    {localStatus === 'confirming' && (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Confirming on Base...
                      </span>
                    )}
                    {localStatus === 'idle' && `💸 Send ${amount || customAmount || '0'} USDC`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ Recent Donations Section */}
        {donations.length > 0 && (
          <div className={`rounded-3xl shadow-2xl p-6 border mb-6 ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              💝 Recent Supporters ({donations.length})
            </h2>
            <div className="space-y-3">
              {donations.slice(0, 10).map((donation) => (
                <div key={donation.id} className={`p-4 rounded-xl transition-all hover:scale-[1.02] ${isDark ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isDark ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-gradient-to-br from-blue-400 to-purple-500 text-white'
                    }`}>
                      {donation.donor_name 
                        ? donation.donor_name.charAt(0).toUpperCase() 
                        : donation.donor_address.substring(2, 4).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {donation.donor_name || 'Anonymous'}
                        </p>
                        <p className={`text-lg font-bold flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                          ${formatAmount(donation.amount)}
                        </p>
                      </div>
                      
                      {donation.message && (
                        <p className={`text-sm italic mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          "{donation.message}"
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatAddress(donation.donor_address)}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatDate(donation.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {topDonors.length > 0 && (
          <div className={`rounded-3xl shadow-2xl p-6 border mb-6 ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-white backdrop-blur-xl'}`}>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              🏆 Top Supporters
            </h2>
            <div className="space-y-3">
              {topDonors.map((donor) => {
                const medals = ['🥇', '🥈', '🥉'];
                const colors = ['from-yellow-500 to-yellow-600', 'from-gray-400 to-gray-500', 'from-orange-500 to-orange-600'];
                return (
                  <div key={donor.address} className={`flex items-center justify-between p-4 rounded-xl transition-all hover:scale-105 ${isDark ? 'bg-gray-800/50' : 'bg-gradient-to-r from-gray-50 to-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${colors[donor.rank - 1]} text-white shadow-lg`}>
                        {medals[donor.rank - 1]}
                      </div>
                      <div>
  {donor.name ? (
    <>
      <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {donor.name}
      </p>
      <p className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {formatAddress(donor.address)}
      </p>
    </>
  ) : (
    <p className={`font-mono text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {formatAddress(donor.address)}
    </p>
  )}
  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
    #{donor.rank} Top Donor
  </p>
</div>
                    </div>
                    <p className={`text-lg sm:text-xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      {formatAmount(donor.total)} USDC
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        <div className={`mt-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <p className="text-xs">
            Powered by <span className="font-semibold text-blue-500">PayOnBase24</span> • Built on Base Network
          </p>
        </div>
      </div>

      {cropperImage && (
        <ImageCropper
          image={cropperImage}
          aspect={cropperAspect}
          onDone={handleCropDone}
          onCancel={() => {
            setCropperImage(null);
            setCropperType(null);
          }}
          isUploading={uploadingAvatar || uploadingCover}
        />
      )}
    </div>
  );
}