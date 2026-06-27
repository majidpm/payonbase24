import { useWallet } from '../hooks/useWallet'
import { useTheme } from '../contexts/ThemeContext'

export default function ConnectButton() {
  const { isDark } = useTheme()
  const { address, isConnected, isConnecting, connectWallet, disconnectWallet } = useWallet()

  if (isConnecting) {
    return (
      <button disabled className={`px-4 py-2 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <span className="animate-pulse">Connecting...</span>
      </button>
    )
  }

  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
      >
        🦊 Connect Wallet
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      <span className={`font-mono text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        {address.substring(0, 6)}...{address.substring(38)}
      </span>
      <button
        onClick={disconnectWallet}
        className="text-red-500 hover:text-red-600 text-xs ml-2"
        title="Disconnect"
      >
        ✕
      </button>
    </div>
  )
}