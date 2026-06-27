import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Pages
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Create from './pages/Create'
import Settings from './pages/Settings'
import Donation from './pages/Donation'
import TravelFund from './pages/TravelFund'
import Pay from './pages/Pay'
import PublicProfile from './pages/PublicProfile'
import PublicFund from './pages/PublicFund'

// Components
import SidebarLayout from './components/SidebarLayout'
import Tutorial from './components/Tutorial'
import ProtectedRoute from './components/ProtectedRoute'

// Contexts
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

// Privy
import { PrivyProvider } from '@privy-io/react-auth'

const queryClient = new QueryClient()

// Privy Config
const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID

function AppContent() {
  const { isDark } = useTheme()
  
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: isDark ? 'dark' : 'light',
          accentColor: '#3B82F6',
          walletChainType: 'ethereum-only',
        },
        embeddedWallets: {
          createOnLogin: 'off',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
            <Toaster position="top-center" />
            <Tutorial />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pay/:slug" element={<Pay />} />
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route path="/trip/:slug" element={<PublicFund />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <SidebarLayout><Dashboard /></SidebarLayout>
                </ProtectedRoute>
              } />
              <Route path="/create" element={
                <ProtectedRoute>
                  <SidebarLayout><Create /></SidebarLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <SidebarLayout><Settings /></SidebarLayout>
                </ProtectedRoute>
              } />
              <Route path="/donation" element={
                <ProtectedRoute>
                  <SidebarLayout><Donation /></SidebarLayout>
                </ProtectedRoute>
              } />
              <Route path="/travel" element={
                <ProtectedRoute>
                  <SidebarLayout><TravelFund /></SidebarLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </PrivyProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App