import { useTheme } from '../contexts/ThemeContext'

export function CardSkeleton() {
  const { isDark } = useTheme()
  return (
    <div className={`rounded-2xl p-4 animate-pulse ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
        <div className="flex-1 space-y-2">
          <div className={`h-4 rounded w-3/4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          <div className={`h-3 rounded w-1/2 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
        </div>
      </div>
      <div className={`h-32 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
      <div className="flex gap-2 mt-4">
        <div className={`h-10 rounded-xl flex-1 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
        <div className={`h-10 rounded-xl flex-1 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
      </div>
    </div>
  )
}

export function StatsSkeleton() {
  const { isDark } = useTheme()
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={`rounded-2xl p-4 animate-pulse ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            <div className={`h-5 rounded-full w-16 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          </div>
          <div className={`h-8 rounded w-20 mb-2 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          <div className={`h-3 rounded w-24 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  const { isDark } = useTheme()
  return (
    <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className={`p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex gap-4">
          <div className={`h-4 rounded w-1/4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          <div className={`h-4 rounded w-1/4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          <div className={`h-4 rounded w-1/4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          <div className={`h-4 rounded w-1/4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
        </div>
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className={`p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex gap-4">
            <div className={`h-4 rounded w-1/4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            <div className={`h-4 rounded w-1/4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            <div className={`h-4 rounded w-1/4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            <div className={`h-4 rounded w-1/4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  const { isDark } = useTheme()
  return (
    <div className={`rounded-2xl p-6 animate-pulse ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className={`h-6 rounded w-1/3 mb-6 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
      <div className="space-y-4">
        <div>
          <div className={`h-4 rounded w-1/4 mb-2 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          <div className={`h-12 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
        </div>
        <div>
          <div className={`h-4 rounded w-1/4 mb-2 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          <div className={`h-12 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
        </div>
        <div className={`h-12 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 rounded w-48 bg-gray-800 animate-pulse"></div>
          <div className="h-10 rounded-xl w-32 bg-gray-800 animate-pulse"></div>
        </div>
        <StatsSkeleton />
        <ListSkeleton count={3} />
      </div>
    </div>
  )
}