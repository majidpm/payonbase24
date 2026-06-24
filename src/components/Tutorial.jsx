import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

const TUTORIAL_STEPS = [
  {
    title: '👋 Welcome to PayOnBase24!',
    description: 'Let me show you around. This is a quick tour of the main features.',
    highlight: null,
    position: 'center'
  },
  {
    title: '📊 Dashboard',
    description: 'Track all your payment links, donations, and transactions here. You can filter by date and status.',
    highlight: '[data-tour="dashboard"]',
    position: 'bottom'
  },
  {
    title: '💳 Create Payment Links',
    description: 'Create secure payment links to receive USDC instantly on Base Network.',
    highlight: '[data-tour="create"]',
    position: 'right'
  },
  {
    title: '💝 Donation Page',
    description: 'Set up your public donation page and receive support from anyone in the world!',
    highlight: '[data-tour="donation"]',
    position: 'right'
  },
  {
    title: '✈️ Travel Fund',
    description: 'Fund your trips and split expenses with friends and family easily.',
    highlight: '[data-tour="travel"]',
    position: 'right'
  },
  {
    title: '⚙️ Settings',
    description: 'Customize your profile, add wallet address, and manage your account.',
    highlight: '[data-tour="settings"]',
    position: 'top'
  },
  {
    title: '🎉 You\'re Ready!',
    description: 'That\'s it! You\'re all set to start using PayOnBase24. Happy transacting!',
    highlight: null,
    position: 'center'
  }
]

export default function Tutorial() {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const highlightRef = useRef(null)

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial')
    if (!hasSeenTutorial) {
      const timer = setTimeout(() => {
        setIsVisible(true)
        // اول برو به dashboard
        if (location.pathname !== '/dashboard') {
          navigate('/dashboard')
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [navigate, location.pathname])

  // Highlight element در هر step
  useEffect(() => {
    if (!isVisible) return

    const step = TUTORIAL_STEPS[currentStep]
    if (step.highlight) {
      // صبر کن تا element لود بشه
      const timer = setTimeout(() => {
        const element = document.querySelector(step.highlight)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50', 'rounded-xl')
          highlightRef.current = element
          
          // Remove highlight بعد از 2 ثانیه
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50', 'rounded-xl')
          }, 2500)
        }
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [currentStep, isVisible])

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      finishTutorial()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    finishTutorial()
  }

  const finishTutorial = () => {
    setIsVisible(false)
    localStorage.setItem('hasSeenTutorial', 'true')
    // Remove any remaining highlights
    if (highlightRef.current) {
      highlightRef.current.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50', 'rounded-xl')
    }
  }

  if (!isVisible) return null

  const step = TUTORIAL_STEPS[currentStep]
  const isLast = currentStep === TUTORIAL_STEPS.length - 1
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100

  return (
    <>
      {/* Dark Overlay - با blur کمتر */}
      <div 
        className="fixed inset-0 bg-black/40 z-50"
        onClick={(e) => {
          // فقط اگه روی خود overlay کلیک شد (نه روی کارت)
          if (e.target === e.currentTarget) {
            // هیچ کاری نکن - کاربر باید از دکمه‌ها استفاده کنه
          }
        }}
      />

      {/* Tutorial Card */}
      <div 
        className={`fixed z-50 max-w-md w-full mx-4 rounded-2xl shadow-2xl border p-6 ${
          isDark 
            ? 'bg-gray-900 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto'
        }}
      >
        {/* Progress Bar */}
        <div className={`w-full h-1.5 rounded-full mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <div 
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Counter */}
        <div className="flex justify-between items-center mb-3">
          <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </span>
          <button
            onClick={handleSkip}
            className={`text-xs font-medium ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Skip Tour
          </button>
        </div>

        {/* Content */}
        <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {step.title}
        </h2>
        <p className={`text-sm mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {step.description}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                isDark 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 ${
              isLast
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
            }`}
          >
            {isLast ? '🎉 Get Started' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  )
}