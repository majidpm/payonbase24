import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { useEffect } from 'react'

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
]

export function useUSDCBalance(address) {
  const { data: balanceData, isLoading, isError, error, refetch, status } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // هر 10 ثانیه
      staleTime: 5000, // 5 ثانیه cache
    },
  })

  // ✅ Debug log
  useEffect(() => {
    if (address) {
      console.log('🔍 Balance Query:', {
        address,
        balanceData: balanceData?.toString(),
        isLoading,
        isError,
        status
      })
    }
  }, [address, balanceData, isLoading, isError, status])

  // ✅ تبدیل balance به عدد
  let balance = 0
  let formattedBalance = '0.00'

  if (balanceData !== undefined && balanceData !== null) {
    try {
      const formatted = formatUnits(balanceData, 6) // USDC = 6 decimals
      balance = parseFloat(formatted)
      formattedBalance = balance.toFixed(2)
    } catch (err) {
      console.error('Balance format error:', err)
      balance = 0
      formattedBalance = '0.00'
    }
  }

  return {
    balance,
    formattedBalance,
    isLoading,
    isError,
    error,
    refetch,
    rawBalance: balanceData,
  }
}

export { USDC_ADDRESS }