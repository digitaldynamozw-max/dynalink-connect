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

function loadStoredTheme(): { name: string; colors: Theme } {
  if (typeof window === 'undefined') {
    return { name: 'default', colors: THEMES.default }
  }

  const saved = localStorage.getItem('appTheme')
  if (!saved) {
    return { name: 'default', colors: THEMES.default }
  }

  try {
    const parsed = JSON.parse(saved)
    return {
      name: parsed.name || 'default',
      colors: parsed.colors || THEMES.default,
    }
  } catch {
    return { name: 'default', colors: THEMES.default }
  }
}

export function ThemeCustomizer() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<string>(() => loadStoredTheme().name)
  const [customColors, setCustomColors] = useState<Theme>(() => loadStoredTheme().colors)

  function applyTheme(theme: Theme) {
    const root = document.documentElement
    Object.entries(theme).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-${key}`, value)
      }
    })
  }

  useEffect(() => {
    applyTheme(customColors)
  }, [customColors])

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
        className="fixed bottom-6 right-6 z-40 rounded-full bg-blue-600 p-3 text-white shadow-lg transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
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
        <div className="fixed bottom-20 right-6 z-50 max-h-96 w-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">Theme Customizer</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Preset Themes */}
            <div>
              <h4 className="mb-3 font-medium text-gray-900 dark:text-slate-100">Preset Themes</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => selectPreset(key)}
                    className={`p-3 rounded-lg border-2 transition ${
                      currentTheme === key
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-500'
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
                    <p className="text-xs font-medium text-gray-900 dark:text-slate-100">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div>
              <h4 className="mb-3 font-medium text-gray-900 dark:text-slate-100">Custom Colors</h4>
              <div className="space-y-3">
                {['primary', 'secondary', 'accent'].map(key => (
                  <div key={key}>
                    <label className="mb-1 block text-sm font-medium capitalize text-gray-700 dark:text-slate-300" htmlFor={`color-${key}`}>
                      {key}
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={`color-${key}`}
                        type="color"
                        value={customColors[key] || '#000000'}
                        onChange={e => handleColorChange(key, e.target.value)}
                        className="h-10 w-16 cursor-pointer rounded border border-gray-300 dark:border-slate-600"
                        title={`Pick ${key} color`}
                      />
                      <input
                        type="text"
                        value={customColors[key] || '#000000'}
                        readOnly
                        className="flex-1 rounded border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </>
  )
}
