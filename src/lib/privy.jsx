import { PrivyProvider } from '@privy-io/react-auth'

export function PrivyConfig({ children }) {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID}
      config={{
        // روش‌های لاگین
        loginMethods: ['email', 'wallet', 'sms'],
        
        // ظاهر
        appearance: {
          theme: 'dark', // یا 'light'
          accentColor: '#3B82F6', // آبی Base
          logo: '/logo.png', // لوگوی تو
          walletChainType: 'ethereum-only',
        },
        
        // شبکه‌های پشتیبانی شده
        supportedChains: [
          { id: 8453 }, // Base Mainnet
        ],
        
        // Embedded wallets
        embeddedWallets: {
          createOnLogin: 'off', // کاربر خودش ولت وصل می‌کنه
        },
        
        // Base Account
        baseAccount: {
          enabled: true,
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}