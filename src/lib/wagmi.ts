import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'
import { injected } from 'wagmi/connectors'
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient()

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'PayOnBase24',
      appLogoUrl: 'https://payonbase24.vercel.app/logo.svg',
      preference: 'all',
    }),
  ],
  transports: {
    [base.id]: http(),
  },
})