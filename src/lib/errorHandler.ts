import toast from 'react-hot-toast'

export type AppError = {
  code?: string
  message: string
  status?: number
}

export function handleAppError(error: any, context: string = '') {
  console.error(`[${context}] Error:`, error)

  // Supabase errors
  if (error.code) {
    switch (error.code) {
      case '23505':
        toast.error('This already exists. Please try a different value.')
        break
      case '23503':
        toast.error('Related record not found. Please refresh and try again.')
        break
      case '23502':
        toast.error('Missing required field. Please check your input.')
        break
      case '42P01':
        toast.error('Database table not found. Please contact support.')
        break
      case 'PGRST116':
        // Not found - usually OK, don't show error
        return
      case 'PGRST301':
        toast.error('Multiple records found. Expected only one.')
        break
      case '42501':
        toast.error('Permission denied. You don\'t have access to this resource.')
        break
      case '28P01':
        toast.error('Authentication failed. Please login again.')
        break
      default:
        toast.error(`Database error: ${error.message}`)
    }
  }
  // Ethereum / Web3 errors
  else if (error.code === 'ACTION_REJECTED') {
    toast.error('Transaction rejected by user')
  }
  else if (error.code === 'INSUFFICIENT_FUNDS') {
    toast.error('Insufficient USDC balance')
  }
  else if (error.code === 'CHAIN_MISMATCH') {
    toast.error('Please switch to Base Network')
  }
  else if (error.code === 'NETWORK_ERROR') {
    toast.error('Network error. Please check your connection.')
  }
  else if (error.code === 'USER_REJECTED_REQUEST') {
    toast.error('Wallet connection rejected')
  }
  // Rate limit errors
  else if (error.message?.includes('Rate limit')) {
    toast.error('Too many requests. Please wait a moment.')
  }
  // MetaMask / Wallet errors
  else if (error.message?.includes('MetaMask')) {
    toast.error('MetaMask error. Please check your wallet.')
  }
  else if (error.message?.includes('User denied')) {
    toast.error('Action denied by user')
  }
  // Network errors
  else if (error.message?.includes('fetch') || error.message?.includes('network')) {
    toast.error('Network error. Please check your internet connection.')
  }
  // Generic errors
  else if (error.message) {
    toast.error(error.message)
  }
  else {
    toast.error('Something went wrong. Please try again.')
  }

  // Send to error tracking in production
  if (import.meta.env.PROD) {
    // Sentry.captureException(error, { tags: { context } })
  }
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