'use client'

import { useMemo, useState } from 'react'
import { MapPin, Navigation, Route } from 'lucide-react'

type LiveCourier = {
  id: string
  email: string
  name: string | null
  mobileNumber: string | null
  isActive: boolean
  activeAssignments: number
  completedDeliveries: number
  totalDeliveryFees: number
  latestDestinations: string[]
  activeRouteReplay: Array<{
    latitude: number
    longitude: number
    accuracy: number | null
    createdAt: string
    courierId: string
    courierName: string
  }>
  tracking: {
    availability: string
    latitude: number | null
    longitude: number | null
    accuracy: number | null
    lastSeenAt: string
    activeOrderItemId: string | null
  } | null
}

function availabilityColor(availability: string | null | undefined) {
  if (availability === 'on_delivery') return '#2563eb'
  if (availability === 'available') return '#059669'
  if (availability === 'busy') return '#d97706'
  if (availability === 'break') return '#7c3aed'
  return '#64748b'
}

export function AdminRiderLiveMap({
  couriers,
  title = 'Rider Live Map',
  description = 'Live rider positions and current dispatch load.',
}: {
  couriers: LiveCourier[]
  title?: string
  description?: string
}) {
  const plottedCouriers = useMemo(
    () =>
      couriers.filter(
        (courier) =>
          typeof courier.tracking?.latitude === 'number' &&
          typeof courier.tracking?.longitude === 'number'
      ),
    [couriers]
  )

  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(plottedCouriers[0]?.id || null)
  const [selectedReplayIndex, setSelectedReplayIndex] = useState<number | null>(null)

  const bounds = useMemo(() => {
    if (!plottedCouriers.length) return null
    const lats = plottedCouriers.map((courier) => courier.tracking?.latitude || 0)
    const lngs = plottedCouriers.map((courier) => courier.tracking?.longitude || 0)
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    }
  }, [plottedCouriers])

  const selectedCourier =
    couriers.find((courier) => courier.id === selectedCourierId) ||
    plottedCouriers[0] ||
    couriers[0] ||
    null
  const replayPoints = selectedCourier?.activeRouteReplay || []
  const effectiveReplayIndex =
    selectedReplayIndex === null
      ? Math.max(replayPoints.length - 1, 0)
      : Math.min(selectedReplayIndex, Math.max(replayPoints.length - 1, 0))

  function project(latitude: number, longitude: number) {
    if (!bounds) {
      return { x: 320, y: 160 }
    }

    const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.02)
    const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.02)
    const padding = 32
    const width = 760 - padding * 2
    const height = 360 - padding * 2
    const x = padding + ((longitude - bounds.minLng) / lngSpan) * width
    const y = padding + ((bounds.maxLat - latitude) / latSpan) * height

    return { x, y }
  }

  const replayPath = replayPoints
    .map((point) => {
      const projected = project(point.latitude, point.longitude)
      return `${projected.x},${projected.y}`
    })
    .join(' ')

  const selectedReplayPoint = replayPoints[effectiveReplayIndex] || null
  const selectedReplayProjected =
    selectedReplayPoint ? project(selectedReplayPoint.latitude, selectedReplayPoint.longitude) : null

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-3 py-3 sm:px-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-[13px] text-slate-500">{description}</p>
      </div>

      <div className="grid gap-4 p-3.5 sm:p-4 xl:grid-cols-[minmax(0,1.55fr)_340px]">
        <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-950">
          <div className="border-b border-slate-800 px-4 py-3 text-xs text-slate-300">
            Dispatch map screen
          </div>
          {plottedCouriers.length === 0 ? (
            <div className="flex h-[360px] items-center justify-center px-6 text-center text-sm text-slate-400">
              No rider location pings yet. Once riders share location from their dashboard, they will appear here.
            </div>
          ) : (
            <svg viewBox="0 0 760 360" className="h-[360px] w-full">
              <defs>
                <linearGradient id="map-bg" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#082f49" />
                </linearGradient>
              </defs>
              <rect width="760" height="360" fill="url(#map-bg)" />
              {Array.from({ length: 8 }).map((_, index) => (
                <line
                  key={`v-${index}`}
                  x1={index * 108}
                  x2={index * 108}
                  y1={0}
                  y2={360}
                  stroke="rgba(148,163,184,0.16)"
                />
              ))}
              {Array.from({ length: 5 }).map((_, index) => (
                <line
                  key={`h-${index}`}
                  x1={0}
                  x2={760}
                  y1={index * 90}
                  y2={index * 90}
                  stroke="rgba(148,163,184,0.16)"
                />
              ))}
              {plottedCouriers.map((courier) => {
                const point = project(courier.tracking?.latitude || 0, courier.tracking?.longitude || 0)
                const selected = courier.id === selectedCourierId
                return (
                  <g
                    key={courier.id}
                    onClick={() => {
                      setSelectedCourierId(courier.id)
                      setSelectedReplayIndex(null)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={selected ? 18 : 14}
                      fill={availabilityColor(courier.tracking?.availability)}
                      fillOpacity={0.22}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={selected ? 10 : 8}
                      fill={availabilityColor(courier.tracking?.availability)}
                      stroke="white"
                      strokeWidth={selected ? 3 : 2}
                    />
                    <text
                      x={point.x}
                      y={point.y - 18}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#e2e8f0"
                    >
                      {(courier.name || courier.email).slice(0, 16)}
                    </text>
                  </g>
                )
              })}
              {replayPoints.length > 1 ? (
                <polyline
                  points={replayPath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {selectedReplayProjected ? (
                <g>
                  <circle
                    cx={selectedReplayProjected.x}
                    cy={selectedReplayProjected.y}
                    r={9}
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                </g>
              ) : null}
            </svg>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedCourier?.name || selectedCourier?.email || 'No rider selected'}
                </p>
                <p className="mt-1 text-xs text-slate-500">{selectedCourier?.email || 'Live rider details will appear here.'}</p>
              </div>
              {selectedCourier?.tracking ? (
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: availabilityColor(selectedCourier.tracking.availability) }}
                >
                  {selectedCourier.tracking.availability}
                </span>
              ) : null}
            </div>
            {selectedCourier ? (
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <p>Phone: {selectedCourier.mobileNumber || 'Not set'}</p>
                <p>Active jobs: {selectedCourier.activeAssignments}</p>
                <p>Completed: {selectedCourier.completedDeliveries}</p>
                <p>Fees handled: ${selectedCourier.totalDeliveryFees.toFixed(2)}</p>
                <p>
                  Last seen:{' '}
                  {selectedCourier.tracking?.lastSeenAt
                    ? new Date(selectedCourier.tracking.lastSeenAt).toLocaleString()
                    : 'No ping yet'}
                </p>
                {selectedCourier.tracking &&
                typeof selectedCourier.tracking.latitude === 'number' &&
                typeof selectedCourier.tracking.longitude === 'number' ? (
                  <a
                    href={`https://maps.google.com/?q=${selectedCourier.tracking.latitude},${selectedCourier.tracking.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Open exact map
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Route Replay</p>
            {selectedReplayPoint ? (
              <div className="mt-3 space-y-3 text-xs text-slate-600">
                <p>
                  Checkpoint {effectiveReplayIndex + 1} of {replayPoints.length}
                </p>
                <p>{new Date(selectedReplayPoint.createdAt).toLocaleString()}</p>
                <p>
                  {selectedReplayPoint.latitude.toFixed(5)}, {selectedReplayPoint.longitude.toFixed(5)}
                </p>
                <input
                  type="range"
                  min={0}
                  max={replayPoints.length - 1}
                  step={1}
                  value={effectiveReplayIndex}
                  onChange={(event) => setSelectedReplayIndex(Number(event.target.value))}
                  className="w-full"
                  aria-label="Route replay scrubber"
                />
                <a
                  href={`https://maps.google.com/?q=${selectedReplayPoint.latitude},${selectedReplayPoint.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Open replay checkpoint
                </a>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">No replay checkpoints for this rider yet.</p>
            )}
          </div>

          <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Latest Destinations</p>
            <div className="mt-3 space-y-2">
              {selectedCourier?.latestDestinations?.length ? (
                selectedCourier.latestDestinations.map((destination) => (
                  <div key={destination} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 text-blue-600" />
                      <span>{destination}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No active destinations for this rider yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Live Riders</p>
            <div className="mt-3 space-y-2">
              {couriers.map((courier) => (
                <button
                  key={courier.id}
                  onClick={() => {
                    setSelectedCourierId(courier.id)
                    setSelectedReplayIndex(null)
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                    selectedCourierId === courier.id ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Route className="h-3.5 w-3.5" />
                    {courier.name || courier.email}
                  </span>
                  <span>{courier.activeAssignments}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
