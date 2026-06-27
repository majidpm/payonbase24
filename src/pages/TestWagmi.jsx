import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { base } from 'wagmi/chains'

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

export default function TestWagmi() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  // ✅ خواندن مستقیم از contract USDC
  const { data: balanceData, isLoading: balanceLoading, isError, error, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  })

  // ✅ تبدیل balance به فرمت readable
  function getUSDCBalance() {
    if (!balanceData) return '0.00'
    
    try {
      // balanceData یک bigint هست
      const formatted = formatUnits(balanceData, 6) // USDC 6 decimals داره
      return parseFloat(formatted).toFixed(2)
    } catch (err) {
      console.error('Balance format error:', err)
      return '0.00'
    }
  }

  // Debug
  console.log('USDC Balance Raw:', balanceData)
  console.log('USDC Balance Formatted:', getUSDCBalance())
  console.log('Loading:', balanceLoading)
  console.log('Error:', error)

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 Wagmi Test Page</h1>
        
        {/* Connection Status */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-4">
          <h2 className="text-xl font-bold mb-3">Connection Status</h2>
          <div className="space-y-2">
            <p><strong>Connected:</strong> {isConnected ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Connecting:</strong> {isConnecting ? '⏳ Yes' : 'No'}</p>
            {address && (
              <p><strong>Address:</strong> <code className="bg-gray-100 px-2 py-1 rounded break-all">{address}</code></p>
            )}
          </div>
        </div>

        {/* Connect Buttons */}
        {!isConnected && (
          <div className="bg-white rounded-xl p-6 shadow-lg mb-4">
            <h2 className="text-xl font-bold mb-3">Connect Wallet</h2>
            <div className="flex flex-col gap-2">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Connect with {connector.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Disconnect Button */}
        {isConnected && (
          <div className="bg-white rounded-xl p-6 shadow-lg mb-4">
            <h2 className="text-xl font-bold mb-3">Disconnect</h2>
            <button
              onClick={() => disconnect()}
              className="px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
            >
              Disconnect Wallet
            </button>
          </div>
        )}

        {/* USDC Balance */}
        {isConnected && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">USDC Balance</h2>
              <button
                onClick={() => refetch()}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                🔄 Refresh
              </button>
            </div>
            
            {/* Debug Info */}
            <div className="bg-gray-100 p-3 rounded mb-3 text-xs font-mono">
              <p>Raw: {balanceData?.toString() || 'null'}</p>
              <p>Loading: {balanceLoading ? 'Yes' : 'No'}</p>
              <p>Error: {isError ? error?.message : 'None'}</p>
            </div>
            
            {balanceLoading ? (
              <p className="text-gray-500">⏳ Loading balance...</p>
            ) : isError ? (
              <p className="text-red-500">❌ Error: {error?.message}</p>
            ) : (
              <p className="text-3xl font-bold text-green-600">
                {getUSDCBalance()} USDC
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}