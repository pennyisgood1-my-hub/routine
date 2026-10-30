import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { ToastProvider, useToast } from './components/Toast'
import { onStoreError, useSettings } from './store'
import TodayPage from './pages/Today'
import CalendarPage from './pages/Calendar'
import SummaryPage from './pages/Summary'
import SafetyPage from './pages/Safety'
import SettingsPage from './pages/Settings'

function ThemeEffect() {
  const { theme } = useSettings()
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f172a' : '#7c3aed')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  return null
}

function StoreErrorToasts() {
  const toast = useToast()
  useEffect(() => onStoreError((e) => toast.show(e.message, 'error')), [toast])
  return null
}

export default function App() {
  return (
    <ToastProvider>
      <ThemeEffect />
      <StoreErrorToasts />
      <HashRouter>
        <div className="mx-auto flex min-h-full max-w-md flex-col">
          <main className="flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
            <Routes>
              <Route path="/" element={<TodayPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/summary" element={<SummaryPage />} />
              <Route path="/safety" element={<SafetyPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </HashRouter>
    </ToastProvider>
  )
}
