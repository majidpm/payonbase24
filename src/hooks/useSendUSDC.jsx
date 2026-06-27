import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, encodeFunctionData } from 'viem'
import { base } from 'wagmi/chains'

// ✅ Builder Code از Base
const BUILDER_CODE = 'bc_3mjjig8s'

// USDC Contract Address on Base
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// ERC20 ABI (فقط تابع transfer)
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
]

// ✅ ساخت dataSuffix بر اساس ERC-8021
function buildDataSuffix(builderCode) {
  const hexCode = Array.from(builderCode).map(c => 
    c.charCodeAt(0).toString(16).padStart(2, '0')
  ).join('')
  
  const lengthHex = builderCode.length.toString(16).padStart(2, '0')
  const erc8021 = '8021'.repeat(8)
  
  return `${lengthHex}${hexCode}00${erc8021}`
}

const DATA_SUFFIX = buildDataSuffix(BUILDER_CODE)
console.log('🔧 Data Suffix (بدون 0x):', DATA_SUFFIX)

export function useSendUSDC() {
  const { 
    writeContract, 
    data: txHash, 
    isPending, 
    isError, 
    error,
    reset 
  } = useWriteContract()

  const { 
    isLoading: isConfirming, 
    isSuccess 
  } = useWaitForTransactionReceipt({ 
    hash: txHash 
  })

  async function sendUSDC(to, amount) {
    try {
      const amountInWei = parseUnits(amount.toString(), 6)

      // ✅ خودمون calldata رو encode می‌کنیم
      const calldata = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [to, amountInWei]
      })

      // ✅ اضافه کردن suffix به calldata
      const fullData = calldata + DATA_SUFFIX

      console.log('📤 Sending USDC...')
      console.log('  To:', to)
      console.log('  Amount:', amount)
      console.log('  Calldata:', calldata)
      console.log('  Full Data:', fullData)

      // ✅ ارسال با data field مستقیم
      writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [to, amountInWei],
        chainId: base.id,
        data: fullData
      })
    } catch (err) {
      console.error('Send USDC error:', err)
      throw err
    }
  }

  return {
    sendUSDC,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
    reset
  }
}