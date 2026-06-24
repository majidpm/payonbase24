import toast from 'react-hot-toast'

export type AppError = {
  code?: string
  message: string
  status?: number
  reason?: string
  shortMessage?: string
}

export function handleAppError(error: any, context: string = '') {
  console.error(`[${context}] Error:`, error)

  // تبدیل error به string برای چک کردن راحت‌تر
  const errorString = String(error?.message || error?.reason || error?.shortMessage || error || '')

  // ============================================
  // Supabase errors
  // ============================================
  if (error?.code && typeof error.code === 'string' && !error.code.match(/^[A-Z_]+$/)) {
    switch (error.code) {
      case '23505':
        toast.error('This already exists. Please try a different value.')
        return
      case '23503':
        toast.error('Related record not found. Please refresh and try again.')
        return
      case '23502':
        toast.error('Missing required field. Please check your input.')
        return
      case '42P01':
        toast.error('Database table not found. Please contact support.')
        return
      case 'PGRST116':
        // Not found - usually OK, don't show error
        return
      case 'PGRST301':
        toast.error('Multiple records found. Expected only one.')
        return
      case '42501':
        toast.error('Permission denied. You don\'t have access to this resource.')
        return
      case '28P01':
        toast.error('Authentication failed. Please login again.')
        return
    }
  }

  // ============================================
  // Ethereum / Web3 errors (اول چک کنیم)
  // ============================================
  
  // ❌ مهم‌ترین: Insufficient balance (USDC)
  if (errorString.includes('exceeds balance') || errorString.includes('Insufficient')) {
    toast.error('❌ Insufficient USDC balance')
    return
  }
  
  // User rejected transaction
  if (error?.code === 'ACTION_REJECTED' || errorString.includes('user rejected') || errorString.includes('User denied')) {
    toast.error(' Transaction rejected')
    return
  }
  
  // Insufficient ETH for gas
  if (error?.code === 'INSUFFICIENT_FUNDS' || errorString.includes('insufficient funds for gas')) {
    toast.error('Insufficient ETH for gas fees')
    return
  }
  
  // Wrong network
  if (error?.code === 'CHAIN_MISMATCH' || errorString.includes('chain mismatch')) {
    toast.error('Please switch to Base Network')
    return
  }
  
  // Network error
  if (error?.code === 'NETWORK_ERROR' || errorString.includes('network error')) {
    toast.error('Network error. Please check your connection.')
    return
  }
  
  // Wallet connection rejected
  if (error?.code === 'USER_REJECTED_REQUEST' || errorString.includes('wallet connection rejected')) {
    toast.error('Wallet connection rejected')
    return
  }
  
  // MetaMask locked
  if (errorString.includes('locked') || errorString.includes('unlock')) {
    toast.error(' Please unlock MetaMask')
    return
  }
  
  // MetaMask not installed
  if (errorString.includes('MetaMask') || errorString.includes('ethereum')) {
    toast.error('Please install MetaMask')
    return
  }
  
  // Transaction failed
  if (error?.code === 'CALL_EXCEPTION' || errorString.includes('execution reverted')) {
    // اگه reason داره، نشونش بده
    if (error?.reason && !errorString.includes('exceeds balance')) {
      toast.error(`Transaction failed: ${error.reason}`)
    } else {
      toast.error('Transaction failed')
    }
    return
  }

  // ============================================
  // Rate limit errors
  // ============================================
  if (errorString.includes('Rate limit')) {
    toast.error('Too many requests. Please wait a moment.')
    return
  }

  // ============================================
  // Network errors
  // ============================================
  if (errorString.includes('fetch') || errorString.includes('Failed to fetch')) {
    toast.error('Network error. Please check your internet connection.')
    return
  }

  // ============================================
  // Generic errors
  // ============================================
  
  // اول shortMessage (ethers.js)
  if (error?.shortMessage) {
    toast.error(error.shortMessage)
    return
  }
  
  // بعد reason (ethers.js)
  if (error?.reason) {
    toast.error(error.reason)
    return
  }
  
  // بعد message
  if (error?.message) {
    // اگه message خیلی طولانی بود، کوتاه کن
    const msg = error.message
    if (msg.length > 100) {
      toast.error('Something went wrong. Please try again.')
    } else {
      toast.error(msg)
    }
    return
  }
  
  // در نهایت
  toast.error('Something went wrong. Please try again.')
}

// Success toast helper
export function showSuccess(message: string) {
  toast.success(message)
}

// Loading toast helper
export function showLoading(message: string = 'Loading...') {
  return toast.loading(message)
}

// Dismiss toast
export function dismissToast(toastId: string) {
  toast.dismiss(toastId)
}