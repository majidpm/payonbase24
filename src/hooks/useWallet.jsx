import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { base } from 'wagmi/chains'
import { useEffect } from 'react'

export function useWallet() {
  const { address, isConnected, isConnecting, isReconnecting, status } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const isOnBase = chainId === base.id

  useEffect(() => {
    if (address) {
      localStorage.setItem('wallet_address', address)
    } else {
      localStorage.removeItem('wallet_address')
    }
  }, [address])

  async function connectWallet() {
    const connector = connectors.find(c => c.id === 'injected') || connectors[0]
    connect({ connector })
  }

  async function connectWithCoinbase() {
    const connector = connectors.find(c => c.id === 'coinbaseWalletSDK')
    if (connector) {
      connect({ connector })
    }
  }

  async function ensureBaseNetwork() {
    if (!isOnBase && switchChain) {
      try {
        await switchChain({ chainId: base.id })
        return true
      } catch (err) {
        console.error('Failed to switch network:', err)
        return false
      }
    }
    return true
  }

  return {
    address,
    isConnected,
    isConnecting,
    isReconnecting,
    status,
    isOnBase,
    connectWallet,
    connectWithCoinbase,
    disconnectWallet: disconnect,
    ensureBaseNetwork,
  }
}