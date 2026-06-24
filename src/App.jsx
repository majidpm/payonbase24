import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Create from './pages/Create'
import Dashboard from './pages/Dashboard'
import Pay from './pages/Pay'
import Settings from './pages/Settings'
import Donation from './pages/Donation'
import TravelFund from './pages/TravelFund'
import PublicProfile from './pages/PublicProfile'
import PublicFund from './pages/PublicFund'
import TestRateLimit from './pages/TestRateLimit'
import SidebarLayout from './components/SidebarLayout'
import Tutorial from './components/Tutorial'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

function AppContent() {
  const { isDark } = useTheme()
  
  return (
    <BrowserRouter>  {/* ← BrowserRouter اینجا */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: isDark ? '#1f2937' : '#fff',
            color: isDark ? '#fff' : '#000',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Tutorial />  {/* ← حالا داخل Router هست */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/pay/:slug" element={<Pay />} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="/trip/:slug" element={<PublicFund />} />
        
        {/* Protected Routes with Sidebar */}
        <Route path="/create" element={
          <SidebarLayout>
            <Create />
          </SidebarLayout>
        } />
        <Route path="/dashboard" element={
          <SidebarLayout>
            <Dashboard />
          </SidebarLayout>
        } />
        <Route path="/settings" element={
          <SidebarLayout>
            <Settings />
          </SidebarLayout>
        } />
        <Route path="/donation" element={
          <SidebarLayout>
            <Donation />
          </SidebarLayout>
        } />
        <Route path="/travel" element={
          <SidebarLayout>
            <TravelFund />
          </SidebarLayout>
        } />
        <Route path="/test-rate-limit" element={
          <SidebarLayout>
            <TestRateLimit />
          </SidebarLayout>
        } />
      </Routes>
    </BrowserRouter>
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