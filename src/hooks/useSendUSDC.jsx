import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { USDC_ADDRESS } from './useUSDCBalance'

const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
]

export function useSendUSDC() {
  const {
    data: hash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash })

  async function sendUSDC(to, amount) {
    try {
      writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [to, parseUnits(amount.toString(), 6)],
      })
    } catch (err) {
      console.error('Send USDC error:', err)
      throw err
    }
  }

  function reset() {
    if (resetWrite) {
      resetWrite()
    }
  }

  return {
    sendUSDC,
    txHash: hash,
    isPending: isWritePending,
    isConfirming,
    isSuccess,
    isError: writeError || isReceiptError,
    error: writeError || receiptError,
    reset,
  }
}