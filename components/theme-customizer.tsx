'use client'

import { useState, useEffect } from 'react'
import { Palette, X } from 'lucide-react'

const THEMES = {
  default: {
    name: 'Default',
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f97316',
  },
  ocean: {
    name: 'Ocean',
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    accent: '#f59e0b',
  },
  forest: {
    name: 'Forest',
    primary: '#16a34a',
    secondary: '#059669',
    accent: '#f97316',
  },
  sunset: {
    name: 'Sunset',
    primary: '#f97316',
    secondary: '#ec4899',
    accent: '#a855f7',
  },
  dark: {
    name: 'Dark',
    primary: '#1f2937',
    secondary: '#4b5563',
    accent: '#fbbf24',
  },
}

interface Theme {
  [key: string]: string
}

export function ThemeCustomizer() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<string>('default')
  const [customColors, setCustomColors] = useState<Theme>(THEMES.default)

  function applyTheme(theme: Theme) {
    const root = document.documentElement
    Object.entries(theme).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-${key}`, value)
      }
    })
  }

  useEffect(() => {
    // Load saved theme from localStorage
    const saved = localStorage.getItem('appTheme')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Theme name handled in separate effect
        const themeColors = parsed.colors || THEMES.default
        // Apply immediately
        applyTheme(themeColors)
      } catch {
        // Silently fail
      }
    }
  }, [])

  // Separate effect to update UI state after theme is applied
  useEffect(() => {
    const saved = localStorage.getItem('appTheme')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCurrentTheme(parsed.name || 'default')
        setCustomColors(parsed.colors || THEMES.default)
      } catch {
        // Silently fail
      }
    }
  }, [])

  function selectPreset(name: string) {
    const theme = THEMES[name as keyof typeof THEMES]
    if (theme) {
      setCurrentTheme(name)
      setCustomColors(theme)
      applyTheme(theme)
      saveTheme(name, theme)
    }
  }

  function handleColorChange(key: string, value: string) {
    const newColors = { ...customColors, [key]: value }
    setCustomColors(newColors)
    applyTheme(newColors)
    saveTheme('custom', newColors)
  }

  function saveTheme(name: string, colors: Theme) {
    localStorage.setItem('appTheme', JSON.stringify({ name, colors }))
  }

  function resetTheme() {
    selectPreset('default')
  }

  return (
    <>
      {/* Toggle Button */}
      <div
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition z-40"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsOpen(!isOpen)}
        title="Customize theme"
        role="button"
        tabIndex={0}
      >
        <Palette className="h-6 w-6" />
      </div>

      {/* Customizer Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Theme Customizer</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Preset Themes */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Preset Themes</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => selectPreset(key)}
                    className={`p-3 rounded-lg border-2 transition ${
                      currentTheme === key
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex gap-1 mb-1">
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: theme.primary }}
                        title={theme.primary}
                      />
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: theme.secondary }}
                        title={theme.secondary}
                      />
                    </div>
                    <p className="text-xs font-medium text-gray-900">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Custom Colors</h4>
              <div className="space-y-3">
                {['primary', 'secondary', 'accent'].map(key => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize" htmlFor={`color-${key}`}>
                      {key}
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={`color-${key}`}
                        type="color"
                        value={customColors[key] || '#000000'}
                        onChange={e => handleColorChange(key, e.target.value)}
                        className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                        title={`Pick ${key} color`}
                      />
                      <input
                        type="text"
                        value={customColors[key] || '#000000'}
                        readOnly
                        className="flex-1 border border-gray-300 rounded px-3 py-2 bg-gray-50 font-mono text-sm"
                        title={`${key} color code`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetTheme}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </>
  )
}
