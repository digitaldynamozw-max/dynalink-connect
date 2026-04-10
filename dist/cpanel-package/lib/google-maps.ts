const GOOGLE_ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'

interface ComputeRoutesResponse {
  routes?: Array<{
    distanceMeters?: number
    duration?: string
  }>
}

function parseDurationSeconds(duration?: string) {
  if (!duration) {
    return null
  }

  const normalized = duration.endsWith('s') ? duration.slice(0, -1) : duration
  const value = Number.parseFloat(normalized)

  return Number.isFinite(value) ? value : null
}

export async function computeDrivingDistance(originAddress: string, destinationAddress: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    throw new Error('Google Maps delivery is not configured. Set GOOGLE_MAPS_API_KEY.')
  }

  const regionCode = process.env.GOOGLE_MAPS_REGION_CODE?.trim()

  const response = await fetch(GOOGLE_ROUTES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
    },
    body: JSON.stringify({
      origin: {
        address: originAddress,
      },
      destination: {
        address: destinationAddress,
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      units: 'METRIC',
      ...(regionCode ? { regionCode } : {}),
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Maps route lookup failed: ${response.status} ${errorText}`)
  }

  const data = (await response.json()) as ComputeRoutesResponse
  const route = data.routes?.[0]

  if (!route?.distanceMeters) {
    throw new Error('Google Maps did not return a driving route for these addresses.')
  }

  return {
    distanceMeters: route.distanceMeters,
    distanceKm: route.distanceMeters / 1000,
    durationSeconds: parseDurationSeconds(route.duration),
  }
}
