import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { base } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'PayonBase',
  projectId: '506f48721bf609da94015623a73d85cd',
  chains: [base],
})