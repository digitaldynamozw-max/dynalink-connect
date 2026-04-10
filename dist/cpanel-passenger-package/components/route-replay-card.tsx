'use client'

import { useMemo, useState } from 'react'
import { MapPin, Route } from 'lucide-react'

type RouteSnapshot = {
  latitude: number
  longitude: number
  accuracy: number | null
  createdAt: string
  courierId: string
  courierName: string
}

export function RouteReplayCard({
  snapshots,
  title = 'Route Replay',
  emptyLabel = 'No route checkpoints yet.',
}: {
  snapshots: RouteSnapshot[]
  title?: string
  emptyLabel?: string
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const totalSnapshots = snapshots.length
  const effectiveIndex =
    selectedIndex === null ? Math.max(totalSnapshots - 1, 0) : Math.min(selectedIndex, Math.max(totalSnapshots - 1, 0))

  const selectedSnapshot = useMemo(() => {
    if (!totalSnapshots) {
      return null
    }

    return snapshots[effectiveIndex] || null
  }, [effectiveIndex, snapshots, totalSnapshots])

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        <Route className="h-3.5 w-3.5" />
        {title}
      </p>

      {!totalSnapshots || !selectedSnapshot ? (
        <p className="text-xs text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-medium text-slate-900">
              Checkpoint {effectiveIndex + 1} of {totalSnapshots}
            </p>
            <p className="mt-1">{new Date(selectedSnapshot.createdAt).toLocaleString()}</p>
            <p className="mt-1">
              {selectedSnapshot.latitude.toFixed(5)}, {selectedSnapshot.longitude.toFixed(5)}
            </p>
            <p className="mt-1">Rider: {selectedSnapshot.courierName}</p>
            {typeof selectedSnapshot.accuracy === 'number' ? (
              <p className="mt-1">Accuracy +/- {Math.round(selectedSnapshot.accuracy)} m</p>
            ) : null}
          </div>

          <input
            type="range"
            min={0}
            max={totalSnapshots - 1}
            step={1}
            value={effectiveIndex}
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            className="w-full"
            aria-label={`${title} scrubber`}
          />

          <a
            href={`https://maps.google.com/?q=${selectedSnapshot.latitude},${selectedSnapshot.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <MapPin className="h-3.5 w-3.5" />
            Open selected checkpoint on map
          </a>
        </div>
      )}
    </div>
  )
}
