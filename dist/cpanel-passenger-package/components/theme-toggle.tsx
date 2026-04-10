'use client'

import { Moon, Sun } from 'lucide-react'
import { useThemeMode } from '@/app/providers'

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeMode()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] px-3 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl transition hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.1))]"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}
