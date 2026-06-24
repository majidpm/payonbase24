import { useTheme } from '../contexts/ThemeContext'

export default function EmptyState({ 
  icon, 
  title, 
  description, 
  actionText, 
  onAction,
  illustration = 'default'
}) {
  const { isDark } = useTheme()

  const illustrations = {
    default: '',
    donation: '🎁',
    travel: '✈️',
    payment: '💳',
    search: '🔍',
    filter: ''
  }

  return (
    <div className={`rounded-2xl sm:rounded-3xl p-8 sm:p-12 border text-center ${
      isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'
    }`}>
      <div className="text-5xl sm:text-7xl mb-4 sm:mb-6 animate-bounce">
        {illustrations[illustration] || illustrations.default}
      </div>
      <h3 className={`text-lg sm:text-2xl font-bold mb-2 sm:mb-3 ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        {title}
      </h3>
      <p className={`text-xs sm:text-base mb-6 sm:mb-8 max-w-md mx-auto ${
        isDark ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold text-sm sm:text-base transition-all hover:scale-105 shadow-lg"
        >
          {actionText}
        </button>
      )}
    </div>
  )
}