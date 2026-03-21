'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'

interface DateRangeFilterProps {
  onDateRangeChange: (startDate: string, endDate: string) => void
  defaultRange?: 'today' | 'week' | 'month' | 'year'
}

export function DateRangeFilter({ onDateRangeChange, defaultRange = 'month' }: DateRangeFilterProps) {
  const today = new Date()
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'year'>(defaultRange)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  function handleRangeChange(newRange: 'today' | 'week' | 'month' | 'year') {
    setRange(newRange)

    const start = new Date()
    const end = new Date()

    switch (newRange) {
        case 'today':
          start.setHours(0, 0, 0, 0)
          break
        case 'week':
          const day = start.getDay()
          const diff = start.getDate() - day
          start.setDate(diff)
          start.setHours(0, 0, 0, 0)
          break
        case 'month':
          start.setDate(1)
          start.setHours(0, 0, 0, 0)
          break
        case 'year':
          start.setMonth(0)
          start.setDate(1)
          start.setHours(0, 0, 0, 0)
          break
      }

      onDateRangeChange(formatDate(start), formatDate(end))
  }

  function handleCustomDate() {
    if (customStart && customEnd) {
      onDateRangeChange(customStart, customEnd)
    }
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Preset Ranges */}
        <div className="flex gap-2">
          {['today', 'week', 'month', 'year'].map(r => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              className={`px-4 py-2 rounded-lg capitalize transition ${
                range === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Custom Range */}
        <div className="flex gap-2 flex-1">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="from-date">
              From
            </label>
            <input
              id="from-date"
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              title="Start date"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="to-date">
              To
            </label>
            <input
              id="to-date"
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              title="End date"
            />
          </div>

          <button
            onClick={handleCustomDate}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            title="Apply custom date range"
          >
            <Calendar className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
